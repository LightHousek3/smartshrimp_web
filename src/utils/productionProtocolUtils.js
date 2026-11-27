import {
    allowedDoseBases,
    OPERATION_LABELS,
    UNIT_LABELS,
} from '../constants/productionProtocol.js';
import { editableCompliance } from './materialCompliance.js';
import { executionWindowMinutes } from './protocolTiming.js';

export const expectedHarvestDoc = ({ stockingDate, expectedEndDate } = {}) => {
    if (!stockingDate || !expectedEndDate) return null;
    const dateOnly = (value) =>
        value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
    const doc =
        (Date.parse(dateOnly(expectedEndDate)) - Date.parse(dateOnly(stockingDate))) /
            (24 * 60 * 60 * 1000) +
        1;
    return Number.isInteger(doc) && doc >= 1 ? doc : null;
};

/** Check production coverage against the season's expected harvest day when available. */
export const protocolHarvestCoverageError = (stages, season) => {
    const minimumDoc = expectedHarvestDoc(season);
    if (minimumDoc == null) return null;
    const lastDoc = stages.reduce((last, stage) => Math.max(last, stage?.endDoc || 0), 0);
    return lastDoc < minimumDoc
        ? `DOC kết thúc phác đồ nuôi phải lớn hơn hoặc bằng DOC ${minimumDoc} (ngày dự kiến thu hoạch của vụ nuôi).`
        : null;
};

/** Report intersecting valid day ranges without hiding individual day-input errors. */
export const stageOverlapError = (stages) => {
    for (let index = 0; index < stages.length; index++) {
        const stage = stages[index];
        if (
            !Number.isInteger(stage?.startDoc) ||
            !Number.isInteger(stage?.endDoc) ||
            stage.endDoc < stage.startDoc
        )
            continue;
        for (let otherIndex = index + 1; otherIndex < stages.length; otherIndex++) {
            const other = stages[otherIndex];
            if (
                !Number.isInteger(other?.startDoc) ||
                !Number.isInteger(other?.endDoc) ||
                other.endDoc < other.startDoc
            )
                continue;
            if (stage.startDoc <= other.endDoc && other.startDoc <= stage.endDoc) {
                const start = Math.max(stage.startDoc, other.startDoc);
                const end = Math.min(stage.endDoc, other.endDoc);
                return `Giai đoạn ${index + 1} và ${otherIndex + 1} trùng DOC ${start}${start === end ? '' : `–${end}`}. Hãy điều chỉnh để các giai đoạn không trùng ngày.`;
            }
        }
    }
    return null;
};
const fail = (message) => {
    throw new Error(message);
};
const integer = (value, min, max, label) => {
    if (!Number.isInteger(value) || value < min || value > max)
        fail(`${label}: cần số nguyên ${min}–${max}.`);
    return value;
};
const text = (value, max, label) => {
    const normalized = String(value || '').trim();
    if (!normalized || normalized.length > max) fail(`${label}: bắt buộc, tối đa ${max} ký tự.`);
    return normalized;
};
const decimal = (value, digits, scale, label, zero = false) => {
    const str = String(value ?? '');
    if (
        !new RegExp(`^(?:0|[1-9][0-9]{0,${digits - 1}})(?:\\.[0-9]{1,${scale}})?$`).test(str) ||
        (!zero && Number(str) <= 0)
    )
        fail(`${label}: số thập phân không hợp lệ, tối đa ${scale} chữ số sau dấu chấm.`);
    return str;
};
/** Compare treatment start against the Vietnamese stocking date and optional submission time. */
export const treatmentStartError = (value, season, { future = false, now = new Date() } = {}) => {
    if (value == null) return future ? 'Chọn mốc bắt đầu điều trị trước khi gửi duyệt.' : null;
    const start = new Date(value);
    if (!Number.isFinite(start.getTime())) return 'Mốc bắt đầu điều trị không hợp lệ.';
    const stockingDate =
        season?.stockingDate instanceof Date
            ? season.stockingDate.toISOString().slice(0, 10)
            : String(season?.stockingDate || '').slice(0, 10);
    const day = new Date(start.getTime() + 7 * 3600000).toISOString().slice(0, 10);
    if (!stockingDate || day < stockingDate)
        return 'Mốc điều trị không được trước ngày thả giống của vụ.';
    if (future && start <= now) return 'Mốc bắt đầu đã qua; hãy cập nhật trước khi gửi duyệt.';
    return null;
};

/** Validate editor values and preserve anchor semantics when constructing the API payload. */
export const protocolPayload = (values, revision, season) => {
    const treatment = season?.protocolType === 'TREATMENT';
    const startError = treatment ? treatmentStartError(values.treatmentStartAt, season) : null;
    if (startError) fail(startError);
    if (treatment && values.stages.length && values.stages[0].startDoc !== 1)
        fail('Giai đoạn điều trị đầu tiên phải bắt đầu từ ngày điều trị 1.');
    const cultureOffset =
        treatment && values.treatmentStartAt && season.stockingDate
            ? Math.round(
                  (Date.parse(
                      new Date(new Date(values.treatmentStartAt).getTime() + 7 * 3600000)
                          .toISOString()
                          .slice(0, 10),
                  ) -
                      Date.parse(String(season.stockingDate).slice(0, 10))) /
                      86400000,
              )
            : 0;
    const allowedVariancePct = decimal(values.allowedVariancePct, 3, 2, 'Sai lệch cho phép', true);
    if (Number(allowedVariancePct) > 100) fail('Sai lệch cho phép phải trong 0–100%.');
    if ((values.summary || '').length > 4000) fail('Ghi chú tối đa 4000 ký tự.');
    if (values.stages.length > 120) fail('Tối đa 120 giai đoạn.');
    const overlap = stageOverlapError(values.stages);
    if (overlap) fail(overlap);
    const harvestError = treatment ? null : protocolHarvestCoverageError(values.stages, season);
    if (harvestError) fail(harvestError);
    let itemCount = 0;
    const stages = values.stages.map((stage, stageIndex) => {
        const label = `Giai đoạn ${stageIndex + 1}`;
        const start = integer(stage.startDoc, 1, 2147483647, `${label} DOC đầu`) - 1;
        const end = integer(stage.endDoc, start + 1, 2147483647, `${label} DOC cuối`) - 1;
        if (stage.meals.length > 1000) fail(`${label}: số nhóm không hợp lệ.`);
        return {
            ...(stage.id && { id: stage.id }),
            startDayOffset: start,
            endDayOffset: end,
            meals: stage.meals.map((meal, mealIndex) => {
                const mealLabel = `${label}, cữ ${mealIndex + 1}`;
                if (
                    meal.plannedTime &&
                    !/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,3})?)?$/.test(meal.plannedTime)
                )
                    fail(`${mealLabel}: giờ không hợp lệ.`);
                if (meal.items.length > 1000) fail(`${mealLabel}: số hạng mục không hợp lệ.`);
                return {
                    ...(meal.id && { id: meal.id }),
                    mealNumber:
                        meal.mealNumber == null
                            ? null
                            : integer(meal.mealNumber, 1, 32767, mealLabel),
                    plannedTime: meal.plannedTime || null,
                    items: meal.items.map((item, itemIndex) => {
                        itemCount++;
                        const itemLabel = `${mealLabel}, hạng mục ${itemIndex + 1}`;
                        if (!OPERATION_LABELS[item.operationType] || !UNIT_LABELS[item.doseUnit])
                            fail(`${itemLabel}: chọn hoạt động và đơn vị.`);
                        const first =
                            integer(
                                item.firstDoc ?? start + 1,
                                start + 1,
                                end + 1,
                                `${itemLabel} DOC đầu`,
                            ) - 1;
                        const last =
                            integer(
                                item.lastDoc ?? end + 1,
                                first + 1,
                                end + 1,
                                `${itemLabel} DOC cuối`,
                            ) - 1;
                        if (
                            treatment &&
                            first === 0 &&
                            values.treatmentStartAt &&
                            meal.plannedTime
                        ) {
                            const clock = new Date(`1970-01-01T${meal.plannedTime}Z`)
                                .toISOString()
                                .slice(11, 23);
                            const startClock = new Date(
                                new Date(values.treatmentStartAt).getTime() + 7 * 3600000,
                            )
                                .toISOString()
                                .slice(11, 23);
                            if (clock < startClock)
                                fail(
                                    'Cữ ngày điều trị 1 không được trước giờ bắt đầu; hãy sửa giờ hoặc ngày áp dụng.',
                                );
                        }
                        if (
                            !allowedDoseBases(item.operationType, first + cultureOffset, {
                                environment: meal.mealNumber == null,
                            }).includes(item.doseBasis)
                        )
                            fail(
                                `${itemLabel}: cơ sở liều không phù hợp với tuổi nuôi hoặc đường sử dụng.`,
                            );
                        if (
                            item.doseBasis === 'PERCENT_BIOMASS' &&
                            (Number(item.doseValue) > 100 || !['KG', 'G'].includes(item.doseUnit))
                        )
                            fail(
                                `${itemLabel}: tỷ lệ sinh khối tối đa 100% và dùng đơn vị kg hoặc g.`,
                            );
                        if (!item.productId)
                            text(
                                item.recommendedProductDetails?.proposed?.name,
                                255,
                                `${itemLabel} tên vật tư`,
                            );
                        if ((item.instructions || '').length > 4000)
                            fail(`${itemLabel}: hướng dẫn tối đa 4000 ký tự.`);
                        const proposal = item.recommendedProductDetails?.proposed;
                        const manufacturerId = item.recommendedManufacturerId ?? proposal?.manufacturerId;
                        // A linked manufacturer's display snapshot is not a new supplier declaration.
                        const proposed = proposal ? structuredClone(proposal) : null;
                        if (proposed && manufacturerId) {
                            proposed.manufacturerId = manufacturerId;
                            delete proposed.manufacturer;
                        }
                        const metadata = {
                            ...(item.productId &&
                                item.productRevision && { productRevision: item.productRevision }),
                            firstDayOffset: first,
                            lastDayOffset: last,
                            recurrenceAnchorOffset:
                                integer(
                                    item.recurrenceAnchorDoc ?? first + 1,
                                    1,
                                    first + 1,
                                    `${itemLabel} mốc chu kỳ`,
                                ) - 1,
                            doseAnchorOffset:
                                integer(
                                    item.doseAnchorDoc ?? first + 1,
                                    1,
                                    first + 1,
                                    `${itemLabel} mốc liều`,
                                ) - 1,
                            dailyDoseIncrement: decimal(
                                item.dailyDoseIncrement ?? '0',
                                10,
                                4,
                                `${itemLabel} tăng liều`,
                                true,
                            ),
                            dueAtMinutes: executionWindowMinutes(
                                item.dueAtMinutes,
                                `${meal.mealNumber == null ? itemLabel : mealLabel} khoảng thực hiện`,
                            ),
                            recommendedManufacturerId: manufacturerId ?? null,
                            recommendedProductDetails: proposed
                                ? {
                                      proposed: {
                                          ...proposed,
                                          productCompliance: editableCompliance(
                                              proposed.productCompliance,
                                          ),
                                      },
                                  }
                                : null,
                        };
                        return {
                            ...(item.id && { id: item.id }),
                            ...metadata,
                            operationType: item.operationType,
                            productId: item.productId || null,
                            repeatIntervalDays: integer(
                                item.repeatIntervalDays,
                                1,
                                30,
                                `${itemLabel} chu kỳ`,
                            ),
                            doseBasis: item.doseBasis,
                            doseValue: decimal(item.doseValue, 10, 4, `${itemLabel} liều`),
                            doseUnit: item.doseUnit,
                            instructions: item.instructions?.trim() || null,
                        };
                    }),
                };
            }),
        };
    });
    if (itemCount > 1000) fail('Tối đa 1000 hạng mục trong một phác đồ.');
    return {
        title: text(values.title, 500, 'Tên phác đồ'),
        summary: values.summary?.trim() || null,
        allowedVariancePct,
        rollingWindowDays: integer(values.rollingWindowDays, 1, 14, 'Cửa sổ lịch'),
        stages,
        ...(treatment && {
            treatmentStartAt: values.treatmentStartAt ?? null,
            rollingWindowDays: 3,
        }),
        ...(revision != null && { revision }),
    };
};
