import { allowedDoseBases, OPERATION_LABELS, UNIT_LABELS } from '../constants/productionProtocol.js';
import { editableCompliance, templateMaterialSelectionError } from './materialCompliance.js';
import { getMaterialDoseUnits } from './protocolTemplateUtils.js';

export const expectedHarvestDoc = ({ stockingDate, expectedEndDate } = {}) => {
    if (!stockingDate || !expectedEndDate) return null;
    const dateOnly = (value) => value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
    const doc = (Date.parse(dateOnly(expectedEndDate)) - Date.parse(dateOnly(stockingDate))) / (24 * 60 * 60 * 1000) + 1;
    return Number.isInteger(doc) && doc >= 1 ? doc : null;
};

export const protocolHarvestCoverageError = (stages, season) => {
    const minimumDoc = expectedHarvestDoc(season);
    if (minimumDoc == null) return null;
    const lastDoc = stages.reduce((last, stage) => Math.max(last, stage?.endDoc || 0), 0);
    return lastDoc < minimumDoc
        ? `DOC kết thúc phác đồ nuôi phải lớn hơn hoặc bằng DOC ${minimumDoc} (ngày dự kiến thu hoạch của vụ nuôi).`
        : null;
};

export const productionMaterialOptions = (products, { contentVersion = 1, environment = false } = {}) =>
    products.map((product) => {
        const error = contentVersion === 2 ? templateMaterialSelectionError({ ...product,
            productCompliance: product.compliance ?? product.productCompliance,
        }, { environment, protocolLabel: 'phác đồ nuôi' }) : null;
        return { value: product.id, label: product.name, title: error || undefined,
            disabled: product.status !== 'ACTIVE' || Boolean(error) };
    });

export const productionMaterialDoseUnit = (product, contentVersion) => {
    if (contentVersion !== 2) return product.unit;
    const unit = ['PACK', 'BOTTLE'].includes(product.unit) ? product.conversionUnit : product.unit;
    const allowed = getMaterialDoseUnits(product);
    return allowed.some((option) => option.value === unit) ? unit : allowed[0].value;
};

export const emptyItem = () => ({ operationType: 'FEEDING', productId: null,
    recommendedProductName: '', recommendedCategory: null, repeatIntervalDays: 1,
    doseBasis: 'FIXED_QUANTITY', doseValue: '', doseUnit: 'KG', instructions: null });
export const emptyStage = () => ({ startDoc: 1, endDoc: 7, meals: [] });
export const emptyMeal = (index = 0) => ({ mealNumber: index + 1, plannedTime: null, items: [] });
export const stageOverlapError = (stages) => {
    for (let index = 0; index < stages.length; index++) {
        const stage = stages[index];
        if (!Number.isInteger(stage?.startDoc) || !Number.isInteger(stage?.endDoc) || stage.endDoc < stage.startDoc) continue;
        for (let otherIndex = index + 1; otherIndex < stages.length; otherIndex++) {
            const other = stages[otherIndex];
            if (!Number.isInteger(other?.startDoc) || !Number.isInteger(other?.endDoc) || other.endDoc < other.startDoc) continue;
            if (stage.startDoc <= other.endDoc && other.startDoc <= stage.endDoc) {
                const start = Math.max(stage.startDoc, other.startDoc);
                const end = Math.min(stage.endDoc, other.endDoc);
                return `Giai đoạn ${index + 1} và ${otherIndex + 1} trùng DOC ${start}${start === end ? '' : `–${end}`}. Hãy điều chỉnh để các giai đoạn không trùng ngày.`;
            }
        }
    }
    return null;
};
export const cloneGroup = (value) => {
    if (Array.isArray(value)) return value.map(cloneGroup);
    if (!value || typeof value !== 'object') return value;
    const group = 'meals' in value || 'items' in value || 'operationType' in value;
    return Object.fromEntries(Object.entries(value).filter(([key]) => !group || key !== 'id').map(([key, entry]) => [key, cloneGroup(entry)]));
};
export const protocolToForm = (detail) => ({
    contentVersion: detail?.contentVersion ?? 1,
    title: detail?.title || '', summary: detail?.summary || '',
    allowedVariancePct: detail?.allowedVariancePct ?? '10', rollingWindowDays: detail?.rollingWindowDays ?? 7,
    stages: (detail?.stages || []).map((stage) => ({ ...stage,
        startDoc: stage.startDayOffset + 1, endDoc: stage.endDayOffset + 1,
        meals: stage.meals.map((meal) => ({ ...meal, items: meal.items.map((item) => ({ ...item,
            firstDoc: (item.firstDayOffset ?? stage.startDayOffset) + 1,
            lastDoc: (item.lastDayOffset ?? stage.endDayOffset) + 1,
            recurrenceAnchorDoc: (item.recurrenceAnchorOffset ?? item.firstDayOffset ?? stage.startDayOffset) + 1,
            doseAnchorDoc: (item.doseAnchorOffset ?? item.firstDayOffset ?? stage.startDayOffset) + 1,
        })) })),
    })),
});

export const templateToForm = (template, currentTitle) => {
    const values = protocolToForm(template);
    return { ...values, title: currentTitle?.trim() ? currentTitle : values.title,
        stages: cloneGroup(values.stages) };
};
const fail = (message) => { throw new Error(message); };
const integer = (value, min, max, label) => {
    if (!Number.isInteger(value) || value < min || value > max) fail(`${label}: cần số nguyên ${min}–${max}.`);
    return value;
};
const text = (value, max, label) => {
    const normalized = String(value || '').trim();
    if (!normalized || normalized.length > max) fail(`${label}: bắt buộc, tối đa ${max} ký tự.`);
    return normalized;
};
const decimal = (value, digits, scale, label, zero = false) => {
    const str = String(value ?? '');
    if (!new RegExp(`^(?:0|[1-9][0-9]{0,${digits - 1}})(?:\\.[0-9]{1,${scale}})?$`).test(str)
        || (!zero && Number(str) <= 0)) fail(`${label}: số thập phân không hợp lệ, tối đa ${scale} chữ số sau dấu chấm.`);
    return str;
};
export const protocolPayload = (values, revision, season) => {
    const contentVersion = values.contentVersion ?? 1;
    const allowedVariancePct = decimal(values.allowedVariancePct, 3, 2, 'Sai lệch cho phép', true);
    if (Number(allowedVariancePct) > 100) fail('Sai lệch cho phép phải trong 0–100%.');
    if ((values.summary || '').length > 4000) fail('Ghi chú tối đa 4000 ký tự.');
    if (values.stages.length > 120) fail('Tối đa 120 giai đoạn.');
    const overlap = stageOverlapError(values.stages);
    if (overlap) fail(overlap);
    const harvestError = protocolHarvestCoverageError(values.stages, season);
    if (harvestError) fail(harvestError);
    let itemCount = 0;
    const stages = values.stages.map((stage, stageIndex) => {
        const label = `Giai đoạn ${stageIndex + 1}`;
        const start = integer(stage.startDoc, 1, 2147483647, `${label} DOC đầu`) - 1;
        const end = integer(stage.endDoc, start + 1, 2147483647, `${label} DOC cuối`) - 1;
        if ((contentVersion !== 2 && !stage.meals.length) || stage.meals.length > (contentVersion === 2 ? 1000 : 50)) fail(`${label}: số nhóm không hợp lệ.`);
        return { ...(stage.id && { id: stage.id }),
            startDayOffset: start, endDayOffset: end, meals: stage.meals.map((meal, mealIndex) => {
                const mealLabel = `${label}, cữ ${mealIndex + 1}`;
                if (meal.plannedTime && !/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,3})?)?$/.test(meal.plannedTime)) fail(`${mealLabel}: giờ không hợp lệ.`);
                if ((contentVersion !== 2 && !meal.items.length) || meal.items.length > (contentVersion === 2 ? 1000 : 100)) fail(`${mealLabel}: số hạng mục không hợp lệ.`);
                return { ...(meal.id && { id: meal.id }), mealNumber: meal.mealNumber == null ? null : integer(meal.mealNumber, 1, 32767, mealLabel),
                    plannedTime: meal.plannedTime || null, items: meal.items.map((item, itemIndex) => {
                        itemCount++;
                        const itemLabel = `${mealLabel}, hạng mục ${itemIndex + 1}`;
                        if (!OPERATION_LABELS[item.operationType] || !UNIT_LABELS[item.doseUnit]) fail(`${itemLabel}: chọn hoạt động và đơn vị.`);
                        const first = contentVersion === 2 ? integer(item.firstDoc ?? start + 1, start + 1, end + 1, `${itemLabel} DOC đầu`) - 1 : start;
                        const last = contentVersion === 2 ? integer(item.lastDoc ?? end + 1, first + 1, end + 1, `${itemLabel} DOC cuối`) - 1 : end;
                        if (!allowedDoseBases(item.operationType, first, { contentVersion, environment: meal.mealNumber == null }).includes(item.doseBasis)) fail(`${itemLabel}: cơ sở liều không phù hợp với tuổi nuôi hoặc đường sử dụng.`);
                        if (item.doseBasis === 'PERCENT_BIOMASS' && (Number(item.doseValue) > 100 || !['KG', 'G'].includes(item.doseUnit)))
                            fail(`${itemLabel}: tỷ lệ sinh khối tối đa 100% và dùng đơn vị kg hoặc g.`);
                        const recommendedProductName = item.productId ? (item.recommendedProductName?.trim() || null)
                            : text(item.recommendedProductDetails?.proposed?.name ?? item.recommendedProductName, 255, `${itemLabel} tên vật tư`);
                        if ((recommendedProductName || '').length > 255) fail(`${itemLabel}: tên vật tư tối đa 255 ký tự.`);
                        if ((item.instructions || '').length > 4000) fail(`${itemLabel}: hướng dẫn tối đa 4000 ký tự.`);
                        const advanced = contentVersion === 2 ? {
                            firstDayOffset: first, lastDayOffset: last,
                            recurrenceAnchorOffset: integer(item.recurrenceAnchorDoc ?? first + 1, 1, first + 1, `${itemLabel} mốc chu kỳ`) - 1,
                            doseAnchorOffset: integer(item.doseAnchorDoc ?? first + 1, 1, first + 1, `${itemLabel} mốc liều`) - 1,
                            dailyDoseIncrement: decimal(item.dailyDoseIncrement ?? '0', 10, 4, `${itemLabel} tăng liều`, true),
                            recommendedManufacturerId: item.recommendedManufacturerId ?? null,
                            recommendedProductDetails: item.recommendedProductDetails?.proposed ? { proposed: {
                                ...structuredClone(item.recommendedProductDetails.proposed),
                                productCompliance: editableCompliance(item.recommendedProductDetails.proposed.productCompliance),
                            } } : null,
                        } : {};
                        return { ...(item.id && { id: item.id }), ...advanced, operationType: item.operationType, productId: item.productId || null,
                            recommendedProductName, recommendedCategory: item.recommendedCategory || null,
                            repeatIntervalDays: integer(item.repeatIntervalDays, 1, 30, `${itemLabel} chu kỳ`),
                            doseBasis: item.doseBasis, doseValue: decimal(item.doseValue, 10, 4, `${itemLabel} liều`),
                            doseUnit: item.doseUnit, instructions: item.instructions?.trim() || null };
                    }) };
            }) };
    });
    if (itemCount > 1000) fail('Tối đa 1000 hạng mục trong một phác đồ.');
    return { contentVersion, title: text(values.title, 500, 'Tên phác đồ'), summary: values.summary?.trim() || null,
        allowedVariancePct, rollingWindowDays: integer(values.rollingWindowDays, 1, 14, 'Cửa sổ lịch'), stages,
        ...(revision != null && { revision }) };
};
