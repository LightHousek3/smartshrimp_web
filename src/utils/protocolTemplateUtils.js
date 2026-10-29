import {
    editableCompliance,
    templateMaterialSelectionError,
} from './materialCompliance.js';
import {
    defaultProtocolMeals,
    suggestPhaseRation,
    suggestProtocolRange,
} from './protocolAuthoringDefaults.js';
import { divideDailyDose } from './protocolDoseAllocation.js';
const invalidDataMessage = 'Dữ liệu phác đồ mẫu không hợp lệ.';
const isInteger = (value, minimum) =>
    Number.isInteger(value) && value >= minimum;
const isFarm = (farm) =>
    typeof farm?.id === 'string' && typeof farm?.name === 'string';
/** Display small mass/volume quantities without rounding a valid dose to zero. */
export const getDoseInputValues = (item, requestedUnit) => {
    let unit = requestedUnit ?? item.doseUnit;
    const factors = { KG: 1000, G: 1, L: 1000, ML: 1, PCS: 1 };
    if (
        item.doseBasis !== 'PERCENT_BIOMASS' &&
        requestedUnit === undefined &&
        ['KG', 'L'].includes(unit) &&
        Number.isFinite(item.doseValue) &&
        Math.abs(item.doseValue - Math.round(item.doseValue * 100) / 100) >
            0.000001
    )
        unit = unit === 'KG' ? 'G' : 'ML';
    const factor =
        item.doseBasis === 'PERCENT_BIOMASS'
            ? 1
            : factors[item.doseUnit] / factors[unit];
    return {
        doseUnit: unit,
        doseValue:
            item.doseValue == null
                ? null
                : Number((item.doseValue * factor).toFixed(4)),
        dailyDoseIncrement: Number(
            ((item.dailyDoseIncrement ?? 0) * factor).toFixed(4)
        ),
    };
};
export const getStageDocError = (stages, index) => {
    const stage = stages[index];
    if (!isInteger(stage.startDay, 1) || stage.startDay > 3650)
        return 'DOC đầu phải là số nguyên từ 1 đến 3650.';
    if (!isInteger(stage.endDay, stage.startDay) || stage.endDay > 3650)
        return 'DOC cuối phải lớn hơn hoặc bằng DOC đầu, tối đa 3650.';
    if (index > 0 && stage.startDay <= stages[index - 1].endDay)
        return `DOC đầu phải lớn hơn DOC cuối giai đoạn trước (${stages[index - 1].endDay}).`;
    if (stages[index + 1] && stage.endDay >= stages[index + 1].startDay)
        return `DOC cuối phải nhỏ hơn DOC đầu giai đoạn sau (${stages[index + 1].startDay}).`;
    return null;
};
export const getNextStageRange = (stages, species = 'WHITELEG') => {
    if (stages.some((_, index) => getStageDocError(stages, index)))
        throw new Error('Sửa DOC của các giai đoạn trước khi thêm giai đoạn.');
    return suggestProtocolRange(stages, species);
};

/** Use the save-path rules for progressive authoring; partial earlier phases must not become hidden validation debt. */
export const assertTemplateStagesComplete = (values, stages) => {
    if (stages.length) buildTemplateCreatePayload(values, stages);
};

/** Only continuous daily feeding can support a quantitative suggestion for a following phase. */
export const summarizeStageFeeding = (stage) => {
    if (!stage) return null;
    const items = stage.meals.flatMap((meal) =>
        meal.items.filter((item) => item.product.category === 'FEED')
    );
    if (
        !items.length ||
        items.some(
            (item) =>
                item.doseBasis !== items[0].doseBasis ||
                !Number.isFinite(item.doseValue) ||
                item.doseValue <= 0 ||
                getApplicationDays(item, stage.startDay, stage.endDay)
                    .length !==
                    stage.endDay - stage.startDay + 1 ||
                (item.doseBasis === 'FIXED_QUANTITY' &&
                    !['G', 'KG'].includes(item.doseUnit))
        )
    )
        return null;
    if (!['FIXED_QUANTITY', 'PERCENT_BIOMASS'].includes(items[0].doseBasis))
        return null;
    const factor = (item) =>
        item.doseBasis === 'FIXED_QUANTITY' && item.doseUnit === 'KG'
            ? 1000
            : 1;
    return {
        startDay: stage.startDay,
        endDay: stage.endDay,
        doseBasis: items[0].doseBasis,
        doseUnit: items[0].doseBasis === 'FIXED_QUANTITY' ? 'G' : 'KG',
        dailyDose: items.reduce(
            (sum, item) => sum + item.doseValue * factor(item),
            0
        ),
        dailyIncrement: items.reduce(
            (sum, item) => sum + (item.dailyDoseIncrement ?? 0) * factor(item),
            0
        ),
    };
};

/** Suggest only the first feed in a meal; a second feed requires an explicit Expert allocation. */
export const getSuggestedFeedDose = ({
    product,
    stage,
    mealKey,
    previousStage,
    shrimpType,
    referencePostCount,
}) => {
    const index = stage.meals.findIndex((meal) => meal.key === mealKey);
    if (
        product.category !== 'FEED' ||
        index < 0 ||
        stage.meals[index].items.some(
            (item) => item.product.category === 'FEED'
        )
    )
        return null;
    const suggested = suggestPhaseRation(
        shrimpType,
        referencePostCount,
        stage.startDay,
        summarizeStageFeeding(previousStage)
    );
    const perMealLimit =
        suggested.doseBasis === 'PERCENT_BIOMASS' ? 100 : 9999999999;
    if (
        !Number.isFinite(suggested.dailyDose) ||
        suggested.dailyDose <= 0 ||
        suggested.dailyDose > perMealLimit * stage.meals.length ||
        !getMaterialDoseUnits(product).some(
            ({ value }) => value === suggested.doseUnit
        ) ||
        (suggested.dailyIncrement > 0 && stage.endDay > 29)
    )
        return null;
    const shares = defaultProtocolMeals(shrimpType);
    const allocation = stage.meals.map((_, portion) => ({
        sharePct:
            stage.meals.length === 4
                ? stage.startDay < 30
                    ? 25
                    : shares[portion].growoutSharePct
                : 100 / stage.meals.length,
    }));
    const amounts = divideDailyDose(suggested.dailyDose, allocation);
    const increments = divideDailyDose(
        suggested.dailyIncrement ?? 0,
        allocation
    );
    if (
        amounts.some(
            (amount, portion) =>
                amount <= 0 ||
                amount >
                    (suggested.doseBasis === 'PERCENT_BIOMASS'
                        ? 100
                        : 9999999999) ||
                amount + increments[portion] * (stage.endDay - stage.startDay) >
                    9999999999
        )
    )
        return null;
    return {
        doseValue: amounts[index],
        dailyDoseIncrement: increments[index],
        doseBasis: suggested.doseBasis,
        doseUnit: suggested.doseUnit,
    };
};
export const getEnvironmentRepeatError = (item, stage) => {
    if (
        !isInteger(item.firstDay, stage.startDay) ||
        item.firstDay > stage.endDay
    )
        return 'DOC xử lý phải nằm trong giai đoạn.';
    if (
        item.lastDay != null &&
        (!isInteger(item.lastDay, item.firstDay) || item.lastDay > stage.endDay)
    )
        return 'DOC kết thúc xử lý phải từ DOC bắt đầu đến cuối giai đoạn.';
    const maximum = Math.min(
        30,
        (item.lastDay ?? stage.endDay) - item.firstDay + 1
    );
    if (
        item.repeatIntervalDays != null &&
        (!isInteger(item.repeatIntervalDays, 1) ||
            item.repeatIntervalDays > maximum)
    )
        return `Chu kỳ phải từ 1 đến ${maximum} ngày; để trống để dùng một lần.`;
    return null;
};
const isTemplate = (row) =>
    typeof row?.id === 'string' &&
    typeof row?.title === 'string' &&
    ['active', 'inactive'].includes(row.status) &&
    typeof row.canDelete === 'boolean' &&
    (row.description === null || typeof row.description === 'string') &&
    [null, 'WHITELEG', 'BLACK_TIGER'].includes(row.shrimpType) &&
    isFarm(row.farm) &&
    isInteger(row.versionNo, 1) &&
    isInteger(row.usedSeasonCount, 0) &&
    Number.isFinite(row.allowedVariancePct) &&
    row.allowedVariancePct >= 0 &&
    row.allowedVariancePct <= 100;

export const parseProtocolTemplatePage = (response) => {
    const { data, meta } = response ?? {};
    if (
        response?.success !== true ||
        !Array.isArray(data) ||
        !isInteger(meta?.page, 1) ||
        ![10, 20, 50].includes(meta?.limit) ||
        !isInteger(meta?.totalResults, 0) ||
        !Array.isArray(meta?.farms) ||
        !meta.farms.every(isFarm) ||
        !data.every(isTemplate)
    )
        throw new Error(invalidDataMessage);
    return { rows: data, meta };
};

export const formatTemplateDuration = (duration) =>
    duration ? `DOC ${duration.startDay}–${duration.endDay}` : '—';

// Presentation bands from the design, not protocol approval or clinical statuses.
const metricBands = {
    variance: [10, 20],
    uses: [3, 10],
    version: [3, 6],
};
export const templateMetricTone = (metric, value) => {
    const [amber, rose] = metricBands[metric];
    if (value >= rose) return 'bg-[#fce7ec]! text-[#e91145]!';
    if (value >= amber) return 'bg-[#fbf0dc]! text-[#c96a0b]!';
    return 'bg-[#ecfdf5]! text-[#059669]!';
};

const operationTypes = ['FEEDING', 'MEDICINE', 'MINERAL', 'CHEMICAL', 'OTHER'];
const doseBases = [
    'FIXED_QUANTITY',
    'PERCENT_BIOMASS',
    'PER_KG_BIOMASS',
    'PER_M3_WATER',
];
export const materialCategories = [
    { value: 'FEED', label: 'Thức ăn' },
    { value: 'MEDICINE', label: 'Thuốc' },
    { value: 'MINERAL', label: 'Khoáng' },
    { value: 'CHEMICAL', label: 'Hóa chất' },
    { value: 'OTHER', label: 'Khác' },
];
export const materialUnitOptions = [
    { value: 'KG', label: 'kg' },
    { value: 'G', label: 'g' },
    { value: 'L', label: 'l' },
    { value: 'ML', label: 'ml' },
    { value: 'PACK', label: 'gói' },
    { value: 'BOTTLE', label: 'chai' },
    { value: 'PCS', label: 'cái' },
];
export const getMaterialDoseUnits = (product) => {
    const unit = ['PACK', 'BOTTLE'].includes(product.unit)
        ? product.conversionUnit
        : product.unit;
    const units = ['MG', 'G', 'KG'].includes(unit)
        ? ['KG', 'G']
        : ['ML', 'L'].includes(unit)
          ? ['L', 'ML']
          : ['PCS'];
    return materialUnitOptions.filter((option) => units.includes(option.value));
};
export const getMaterialDoseBases = (
    product,
    startDay,
    environment = false
) => {
    const fixed = {
        value: 'FIXED_QUANTITY',
        label: 'Cố định',
    };
    if (product.category === 'OTHER') return [fixed];
    if (environment)
        return [fixed, { value: 'PER_M3_WATER', label: '/ m³ nước' }];
    return startDay >= 30
        ? [
              fixed,
              ...(getMaterialDoseUnits(product).some(
                  ({ value }) => value === 'KG'
              )
                  ? [
                        {
                            value: 'PERCENT_BIOMASS',
                            label: '% sinh khối',
                        },
                    ]
                  : []),
              {
                  value: 'PER_KG_BIOMASS',
                  label: '/ kg sinh khối',
              },
          ]
        : [fixed];
};

export const parseTemplateCreationOptions = (response) => {
    if (
        response?.success !== true ||
        !Array.isArray(response.data?.farms) ||
        !response.data.farms.every(isFarm)
    ) {
        throw new Error(invalidDataMessage);
    }
    return response.data;
};
export const parseTemplateMaterialPage = (response) => {
    const { data, meta } = response ?? {};
    if (
        response?.success !== true ||
        !Array.isArray(data) ||
        !isInteger(meta?.page, 1) ||
        ![5, 10, 20].includes(meta.limit) ||
        !isInteger(meta.totalResults, 0) ||
        !data.every(
            (item) =>
                typeof item?.id === 'string' &&
                typeof item.name === 'string' &&
                materialCategories.some(
                    ({ value }) => value === item.category
                ) &&
                Object.hasOwn(unitLabels, item.unit) &&
                Array.isArray(item.imageUrls) &&
                item.imageUrls.every((url) => typeof url === 'string') &&
                Number.isFinite(item.stockQuantity) &&
                item.stockQuantity >= 0 &&
                isInteger(item.lotCount, 0)
        )
    ) {
        throw new Error('Dữ liệu vật tư không hợp lệ.');
    }
    return { rows: data, meta };
};

export const parseTemplateEditor = (response) => {
    const data = response?.data;
    if (
        response?.success !== true ||
        typeof data?.id !== 'string' ||
        typeof data.title !== 'string' ||
        !isFarm(data.farm) ||
        !isInteger(data.versionNo, 1) ||
        typeof data.farmLocked !== 'boolean' ||
        ![null, 'WHITELEG', 'BLACK_TIGER'].includes(data.shrimpType) ||
        !(data.description === null || typeof data.description === 'string') ||
        !Number.isFinite(data.allowedVariancePct) ||
        data.allowedVariancePct < 0 ||
        data.allowedVariancePct > 100 ||
        !Array.isArray(data.items) ||
        !data.items.every(
            (item) =>
                typeof item?.id === 'string' &&
                isInteger(item.startDay, 1) &&
                isInteger(item.endDay, item.startDay) &&
                isInteger(item.repeatIntervalDays, 1) &&
                item.repeatIntervalDays <= 30 &&
                (item.mealNumber === null || isInteger(item.mealNumber, 1)) &&
                (item.plannedTime === null ||
                    /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(item.plannedTime)) &&
                typeof item.product?.name === 'string' &&
                operationTypes.includes(item.operationType) &&
                doseBases.includes(item.doseBasis) &&
                Number.isFinite(item.doseValue) &&
                item.doseValue > 0 &&
                Object.hasOwn(unitLabels, item.doseUnit)
        )
    ) {
        throw new Error('Dữ liệu chỉnh sửa phác đồ mẫu không hợp lệ.');
    }
    return data;
};

const mergeEditorStages = (left, right) => {
    const merged = { ...left, endDay: right.endDay, meals: [], environment: [] };
    const meals = new Map();
    const environment = new Map();
    for (const stage of [left, right]) {
        for (const meal of stage.meals) {
            if (!meals.has(meal.time))
                meals.set(meal.time, { ...meal, items: [] });
            const entries = meals.get(meal.time).items;
            for (const original of meal.items) {
                const item = {
                    ...original,
                    firstDay: original.firstDay ?? stage.startDay,
                    lastDay: original.lastDay ?? stage.endDay,
                    applicationDays: getApplicationDays(
                        original, stage.startDay, stage.endDay
                    ),
                };
                const existing = entries.find((entry) =>
                    (entry.product.id ?? entry.product.name.toLowerCase()) ===
                    (item.product.id ?? item.product.name.toLowerCase())
                );
                if (!existing) {
                    entries.push(item);
                    continue;
                }
                const increment = existing.dailyDoseIncrement ?? 0;
                if (
                    (!item.product.id &&
                        JSON.stringify(existing.product) !== JSON.stringify(item.product)) ||
                    existing.doseBasis !== item.doseBasis ||
                    existing.doseUnit !== item.doseUnit ||
                    existing.instructions !== item.instructions ||
                    increment !== (item.dailyDoseIncrement ?? 0) ||
                    Math.abs(
                        existing.doseValue + increment *
                            (item.firstDay - existing.firstDay) - item.doseValue
                    ) > 0.000001
                ) return null;
                existing.applicationDays = [...new Set([
                    ...existing.applicationDays, ...item.applicationDays,
                ])].sort((a, b) => a - b);
                if (increment > 0 && existing.applicationDays.some(
                    (day, index) => index > 0 &&
                        day !== existing.applicationDays[index - 1] + 1
                )) return null;
                existing.lastDay = Math.max(existing.lastDay, item.lastDay);
            }
            if (entries.length > 10) return null;
        }
        for (const item of stage.environment) {
            // Only fragments of the same stored rule can be joined; independent treatments stay independent.
            const source = item.key.split('/')[0];
            const days = item.repeatIntervalDays == null
                ? [item.firstDay]
                : getApplicationDays(item, stage.startDay, stage.endDay);
            if (!environment.has(source)) environment.set(source, { item, days });
            else environment.get(source).days.push(...days);
        }
    }
    if (meals.size > 12 || environment.size > 20) return null;
    merged.meals = [...meals.values()].sort((a, b) =>
        (a.time || '').localeCompare(b.time || '')
    );
    for (const { item, days: occurrences } of environment.values()) {
        const days = [...new Set(occurrences)].sort((a, b) => a - b);
        const interval = days.length > 1 ? days[1] - days[0] : null;
        if (interval > 30 || days.some(
            (day, index) => index > 0 && day - days[index - 1] !== interval
        )) return null;
        merged.environment.push({
            ...item,
            firstDay: days[0],
            lastDay: days.at(-1),
            repeatIntervalDays: interval,
        });
    }
    return merged;
};

/** Rebuild editable ranges from persisted rules, preserving the exact recurrence dates. */
export const getTemplateEditorStages = (items) => {
    // Keep recurrence rules compact rather than expanding every occurrence into a separate row,
    // which could exceed the 500-item limit and prevent reopening and saving a long template.
    const hydrate = (phases) => phases.map((phase, index) => {
        const meals = new Map();
        const environment = [];
        phase.rows.forEach((row) =>
            row.items.forEach((item) => {
                const material = {
                    key: `${item.id}/${phase.startDay}`,
                    product: item.product,
                    operationType: item.operationType,
                    firstDay: nextRepeatDay(
                        item.startDay,
                        item.repeatIntervalDays,
                        phase.startDay
                    ),
                    repeatIntervalDays: item.repeatIntervalDays,
                    lastDay: Math.min(item.endDay, phase.endDay),
                    applicationDays:
                        item.mealNumber === null
                            ? undefined
                            : getApplicationDays(
                                  item,
                                  phase.startDay,
                                  phase.endDay
                              ),
                    doseBasis: item.doseBasis,
                    doseValue: templateDoseAtDay(
                        item,
                        Math.max(item.startDay, phase.startDay)
                    ),
                    dailyDoseIncrement: item.dailyDoseIncrement ?? 0,
                    doseUnit: item.doseUnit,
                    instructions: item.instructions || '',
                };
                if (row.isEnvironment) {
                    const firstDay = nextRepeatDay(
                        item.startDay,
                        item.repeatIntervalDays,
                        phase.startDay
                    );
                    environment.push({
                        ...material,
                        time: item.plannedTime,
                        firstDay,
                        // A phase containing just one occurrence needs no recurrence rule.
                        repeatIntervalDays:
                            firstDay + item.repeatIntervalDays >
                            Math.min(item.endDay, phase.endDay)
                                ? null
                                : item.repeatIntervalDays,
                    });
                } else {
                    const dailyThroughoutPhase =
                        item.repeatIntervalDays === 1 &&
                        item.startDay <= phase.startDay &&
                        item.endDay >= phase.endDay;
                    if (dailyThroughoutPhase) {
                        // Daily feed follows an edited phase boundary; selected occasional dates stay explicit.
                        delete material.firstDay;
                        delete material.lastDay;
                        delete material.applicationDays;
                    }
                    if (!meals.has(item.plannedTime))
                        meals.set(item.plannedTime, {
                            key: `meal/${phase.startDay}/${item.plannedTime}`,
                            time: item.plannedTime,
                            items: [],
                        });
                    const mealItems = meals.get(item.plannedTime).items;
                    const matching = mealItems.find(
                        (entry) =>
                            (entry.product.id ?? entry.product.name) ===
                                (material.product.id ??
                                    material.product.name) &&
                            entry.doseBasis === material.doseBasis &&
                            entry.doseValue === material.doseValue &&
                            entry.doseUnit === material.doseUnit &&
                            entry.instructions === material.instructions &&
                            !entry.dailyDoseIncrement &&
                            !material.dailyDoseIncrement
                    );
                    if (matching) {
                        matching.applicationDays = [
                            ...new Set([
                                ...getApplicationDays(
                                    matching,
                                    phase.startDay,
                                    phase.endDay
                                ),
                                ...getApplicationDays(
                                    material,
                                    phase.startDay,
                                    phase.endDay
                                ),
                            ]),
                        ].sort((a, b) => a - b);
                        matching.firstDay = matching.applicationDays[0];
                        matching.lastDay = matching.applicationDays.at(-1);
                        matching.repeatIntervalDays = 1;
                    } else mealItems.push(material);
                }
            })
        );
        return {
            key: `stage/${index}/${phase.startDay}`,
            startDay: phase.startDay,
            endDay: phase.endDay,
            meals: [...meals.values()].sort((a, b) =>
                (a.time || '').localeCompare(b.time || '')
            ),
            environment,
        };
    });
    const stages = hydrate(getTemplatePhases(items));
    const itemCount = stages.reduce((count, stage) =>
        count + stage.environment.length + stage.meals.reduce(
            (sum, meal) => sum + meal.items.length, 0
        ), 0
    );
    if (stages.length <= 120 && itemCount <= 500 && stages.every((stage) =>
        stage.environment.length <= 20 && stage.meals.length <= 12 &&
            stage.meals.every((meal) => meal.items.length <= 10)
    )) return stages;
    // Flat rules do not retain authored phase boundaries. Fold compatible fragments
    // back together with explicit dates instead of rejecting a valid 120-phase input.
    const compact = [];
    for (const stage of hydrate(getTemplatePhases(items, { editor: true }))) {
        const joined = compact.length
            ? mergeEditorStages(compact.at(-1), stage)
            : null;
        if (joined) compact[compact.length - 1] = joined;
        else compact.push(stage);
    }
    if (compact.length > 120)
        throw new Error(
            'Không thể dựng mẫu trong giới hạn 120 giai đoạn mà vẫn giữ nguyên liều và ngày áp dụng.'
        );
    return compact;
};
const unitLabels = {
    KG: 'kg',
    G: 'g',
    L: 'l',
    ML: 'ml',
    PACK: 'gói',
    BOTTLE: 'chai',
    PCS: 'cái',
};
const doseNumber = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 4 });

export const parseProtocolTemplateDetail = (response) => {
    const { data } = response ?? {};
    if (
        response?.success !== true ||
        !isTemplate(data) ||
        !(
            data.duration === null ||
            (isInteger(data.duration?.startDay, 1) &&
                isInteger(data.duration?.endDay, data.duration.startDay))
        ) ||
        typeof data.updatedAt !== 'string' ||
        Number.isNaN(Date.parse(data.updatedAt)) ||
        !Array.isArray(data.items) ||
        !data.items.every(
            (item) =>
                typeof item?.id === 'string' &&
                operationTypes.includes(item.operationType) &&
                isInteger(item.startDay, 1) &&
                isInteger(item.endDay, item.startDay) &&
                isInteger(item.repeatIntervalDays, 1) &&
                item.repeatIntervalDays <= 30 &&
                (item.mealNumber === null || isInteger(item.mealNumber, 1)) &&
                (item.plannedTime === null ||
                    /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(item.plannedTime)) &&
                doseBases.includes(item.doseBasis) &&
                Number.isFinite(item.doseValue) &&
                item.doseValue > 0 &&
                Object.hasOwn(unitLabels, item.doseUnit) &&
                (item.instructions === null ||
                    typeof item.instructions === 'string') &&
                typeof item.product?.name === 'string' &&
                (item.product.imageUrls === undefined ||
                    (Array.isArray(item.product.imageUrls) &&
                        item.product.imageUrls.every(
                            (url) => typeof url === 'string'
                        )))
        )
    )
        throw new Error('Dữ liệu chi tiết phác đồ mẫu không hợp lệ.');
    return data;
};

/** Copying a phase must not restart an environmental material's repeat cycle. */
export const nextRepeatDay = (anchor, interval, startDay) =>
    anchor + Math.max(0, Math.ceil((startDay - anchor) / interval)) * interval;

/** Match the authoring API contract; never silently drop empty meals or invalid dosage rules. */
export const buildTemplateCreatePayload = (values, stages) => {
    if (!['WHITELEG', 'BLACK_TIGER'].includes(values.shrimpType))
        throw new Error('Chọn loài tôm cho phác đồ mẫu.');
    if (!stages.length || stages.length > 120)
        throw new Error('Mẫu cần từ 1 đến 120 giai đoạn.');
    let previousEnd = 0;
    let itemCount = 0;
    const mapMaterial = (item, startDay, environment = false) => {
        const increment = item.dailyDoseIncrement ?? 0;
        if (!operationTypes.includes(item.operationType))
            throw new Error('Chọn loại hoạt động của từng vật tư.');
        if (item.linearDaily && increment <= 0)
            throw new Error('Nhập mức tăng mỗi cữ mỗi ngày lớn hơn 0.');
        if (
            !Number.isFinite(increment) ||
            increment < 0 ||
            increment !== Number(increment.toFixed(4)) ||
            (increment > 0 &&
                (environment ||
                    item.product.category !== 'FEED' ||
                    item.doseBasis !== 'FIXED_QUANTITY' ||
                    startDay >= 30))
        )
            throw new Error(
                'Tăng đều chỉ dùng cho thức ăn liều cố định DOC 1–29.'
            );
        const selectionError = templateMaterialSelectionError(item.product, {
            environment,
        });
        if (selectionError)
            throw new Error(`${item.product.name}: ${selectionError}`);
        if (
            !Number.isFinite(item.doseValue) ||
            item.doseValue <= 0 ||
            item.doseValue > 9999999999 ||
            item.doseValue !== Number(item.doseValue.toFixed(4))
        ) {
            throw new Error(
                'Nhập liều lớn hơn 0 cho từng vật tư (lượng cho một cữ/lần xử lý).'
            );
        }
        if (
            !getMaterialDoseBases(item.product, startDay, environment).some(
                ({ value }) => value === item.doseBasis
            ) ||
            !getMaterialDoseUnits(item.product).some(
                ({ value }) => value === item.doseUnit
            ) ||
            (item.doseBasis === 'PERCENT_BIOMASS' && item.doseValue > 100)
        ) {
            throw new Error(
                'Kiểm tra DOC và quy cách vật tư: trước DOC 30 thức ăn/thuốc chỉ dùng liều cố định.'
            );
        }
        itemCount += 1;
        return {
            ...(item.product.id
                ? { productId: item.product.id }
                : {
                      recommendation: {
                          name: item.product.name,
                          category: item.product.category,
                          unit: item.product.unit,
                          conversionQuantity:
                              item.product.conversionQuantity ?? null,
                          conversionUnit: item.product.conversionUnit ?? null,
                          description: item.product.description || null,
                          imageUrls: item.product.imageUrls || [],
                          recommendationReason:
                              item.product.recommendationReason || '',
                          productCompliance: editableCompliance(
                              item.product.productCompliance
                          ),
                          ...(item.product.manufacturerId
                              ? { manufacturerId: item.product.manufacturerId }
                              : item.product.manufacturer?.name
                                ? { manufacturer: item.product.manufacturer }
                                : {}),
                      },
                  }),
            operationType:
                item.product.category === 'FEED'
                    ? 'FEEDING'
                    : item.product.category,
            ...(item.lastDay != null ? { lastDay: item.lastDay } : {}),
            ...(!environment && item.applicationDays
                ? { applicationDays: item.applicationDays }
                : {}),
            ...(!environment && item.firstDay != null
                ? { firstDay: item.firstDay }
                : {}),
            ...(!environment && item.repeatIntervalDays != null
                ? { repeatIntervalDays: item.repeatIntervalDays }
                : {}),
            doseBasis: item.doseBasis,
            doseValue: item.doseValue,
            dailyDoseIncrement: increment,
            doseUnit: item.doseUnit,
            instructions: item.instructions || null,
        };
    };
    const bodyStages = stages.map((stage) => {
        if (
            !isInteger(stage.startDay, 1) ||
            !isInteger(stage.endDay, stage.startDay) ||
            stage.endDay > 3650 ||
            stage.startDay <= previousEnd
        ) {
            throw new Error(
                'DOC bắt đầu từ 1; giai đoạn phải theo thứ tự, không chồng lấn, tối đa DOC 3650.'
            );
        }
        if (
            (!stage.meals.length && !stage.environment.length) ||
            stage.meals.length > 12 ||
            stage.environment.length > 20
        ) {
            throw new Error(
                'Mỗi giai đoạn cần ít nhất một hoạt động; tối đa 12 cữ và 20 xử lý môi trường.'
            );
        }
        if (
            new Set(stage.meals.map((meal) => meal.time)).size !==
            stage.meals.length
        )
            throw new Error(
                'Giờ của các cữ trong một giai đoạn không được trùng nhau.'
            );
        if (
            stage.meals.some(
                (meal, index) =>
                    !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(meal.time) ||
                    (index > 0 && meal.time <= stage.meals[index - 1].time)
            )
        )
            throw new Error(
                'Giờ các cữ phải hợp lệ và theo thứ tự trong ngày.'
            );
        previousEnd = stage.endDay;
        return {
            startDay: stage.startDay,
            endDay: stage.endDay,
            meals: stage.meals.map((meal) => {
                if (!meal.items.length || meal.items.length > 10)
                    throw new Error(
                        'Mỗi cữ cần từ 1 đến 10 vật tư; hãy xóa cữ không sử dụng.'
                    );
                const keys = meal.items.map(
                    (item) => item.product.id ?? item.product.name.toLowerCase()
                );
                if (new Set(keys).size !== keys.length)
                    throw new Error('Vật tư bị trùng trong cùng một cữ.');
                return {
                    time: meal.time,
                    items: meal.items.map((item) => {
                        if (
                            (item.dailyDoseIncrement ?? 0) > 0 &&
                            ((item.lastDay ?? stage.endDay) > 29 ||
                                item.doseValue +
                                    item.dailyDoseIncrement *
                                        ((item.lastDay ?? stage.endDay) -
                                            (item.firstDay ?? stage.startDay)) >
                                    9999999999)
                        )
                            throw new Error(
                                'Giai đoạn tăng đều phải kết thúc trước DOC 30 và có liều hợp lệ.'
                            );
                        if (
                            item.applicationDays &&
                            (!item.applicationDays.length ||
                                item.applicationDays.some(
                                    (day, index) =>
                                        !Number.isInteger(day) ||
                                        day < (item.firstDay ?? stage.startDay) ||
                                        day > (item.lastDay ?? stage.endDay) ||
                                        (index > 0 &&
                                            day <=
                                                item.applicationDays[index - 1])
                                ))
                        )
                            throw new Error(
                                'Chọn ngày áp dụng trong giai đoạn, theo thứ tự và không trùng.'
                            );
                        if (
                            (item.dailyDoseIncrement ?? 0) > 0 &&
                            item.applicationDays?.some(
                                (day, index) =>
                                    index > 0 &&
                                    day !== item.applicationDays[index - 1] + 1
                            )
                        )
                            throw new Error(
                                'Khẩu phần tăng đều phải áp dụng liên tục mỗi ngày.'
                            );
                        const firstDay = item.firstDay ?? stage.startDay;
                        if (
                            !isInteger(firstDay, stage.startDay) ||
                            firstDay > stage.endDay ||
                            (item.lastDay != null &&
                                (!isInteger(item.lastDay, firstDay) ||
                                    item.lastDay > stage.endDay)) ||
                            !isInteger(item.repeatIntervalDays ?? 1, 1) ||
                            (item.repeatIntervalDays ?? 1) > 30
                        )
                            throw new Error(
                                'DOC bắt đầu và chu kỳ của vật tư trong cữ không hợp lệ.'
                            );
                        return mapMaterial(item, firstDay);
                    }),
                };
            }),
            environment: stage.environment.map((item) => {
                if (
                    getEnvironmentRepeatError(item, stage) ||
                    !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(item.time)
                ) {
                    throw new Error(
                        'DOC xử lý phải nằm trong giai đoạn; chu kỳ lặp không được vượt số ngày còn lại. Để trống để dùng một lần.'
                    );
                }
                return {
                    ...mapMaterial(item, item.firstDay, true),
                    time: item.time,
                    firstDay: item.firstDay,
                    repeatIntervalDays: item.repeatIntervalDays ?? null,
                };
            }),
        };
    });
    if (itemCount > 500) throw new Error('Một mẫu có tối đa 500 hạng mục.');
    return {
        title: values.title,
        farmId: values.farmId,
        status: values.status ?? 'active',
        allowedVariancePct: values.allowedVariancePct ?? 10,
        referencePostCount: values.referencePostCount ?? null,
        shrimpType: values.shrimpType,
        description: values.description || null,
        stages: bodyStages,
    };
};

/** Format the authored dose for ONE occurrence; never calculate daily totals or invent biomass. */
export const formatTemplateDose = ({ doseBasis, doseValue, doseUnit }) => {
    const value = doseNumber.format(doseValue);
    if (doseBasis === 'PERCENT_BIOMASS') return `${value}% sinh khối`;
    const dose = `${value} ${unitLabels[doseUnit]}`;
    if (doseBasis === 'PER_KG_BIOMASS') return `${dose} / kg sinh khối`;
    if (doseBasis === 'PER_M3_WATER') return `${dose} / m³ nước`;
    return dose;
};

export const templateDoseAtDay = (item, day) =>
    Number(
        (
            item.doseValue +
            (item.dailyDoseIncrement ?? 0) * (day - item.startDay)
        ).toFixed(4)
    );

/** Enumerate dates for oral schedules without exposing an environmental repeat input. */
export const getApplicationDays = (item, startDay, endDay) => {
    if (item.applicationDays)
        return item.applicationDays.filter(
            (day) => day >= startDay && day <= endDay
        );
    const first = nextRepeatDay(
        item.startDay ?? item.firstDay ?? startDay,
        item.repeatIntervalDays ?? 1,
        startDay
    );
    const last = Math.min(item.endDay ?? item.lastDay ?? endDay, endDay);
    const days = [];
    for (let day = first; day <= last; day += item.repeatIntervalDays ?? 1)
        days.push(day);
    return days;
};

/** Feed ranges define husbandry phases; ancillary operations keep their own dates inside each phase. */
export const getTemplatePhases = (items, { editor = false } = {}) => {
    if (!items.length) return [];
    const feeds = items.filter(
        (item) => item.operationType === 'FEEDING' && item.mealNumber !== null
    );
    const anchors = editor || !feeds.length ? items : feeds;
    const boundaries = [
        ...new Set([
            Math.min(...items.map((item) => item.startDay)),
            Math.max(...items.map((item) => item.endDay)) + 1,
            ...anchors.flatMap((item) => [item.startDay, item.endDay + 1]),
        ]),
    ].sort((a, b) => a - b);
    return boundaries.slice(0, -1).flatMap((startDay, index) => {
        const endDay = boundaries[index + 1] - 1;
        const active = items.filter(
            (item) => getApplicationDays(item, startDay, endDay).length
        );
        if (!active.length) return [];
        const groups = new Map();
        active.forEach((item) => {
            const isEnvironment = item.mealNumber === null;
            // Supplements belong to the same meal even when they have different application dates.
            const key = isEnvironment
                ? `environment/${item.plannedTime}/${item.repeatIntervalDays}/${item.startDay}`
                : `meal/${item.mealNumber}/${item.plannedTime}`;
            if (!groups.has(key))
                groups.set(key, {
                    key,
                    isEnvironment,
                    operationType: item.operationType,
                    mealNumber: item.mealNumber,
                    plannedTime: item.plannedTime,
                    repeatIntervalDays: isEnvironment
                        ? item.repeatIntervalDays
                        : 1,
                    items: [],
                });
            groups.get(key).items.push({
                ...item,
                displayDoseValue: templateDoseAtDay(
                    item,
                    Math.max(startDay, item.startDay)
                ),
                displayApplicationDays: isEnvironment
                    ? undefined
                    : getApplicationDays(item, startDay, endDay),
                displayStartDay: Math.max(item.startDay, startDay),
                displayEndDay: Math.min(item.endDay, endDay),
            });
        });
        const rows = [...groups.values()].sort(
            (a, b) =>
                Number(a.isEnvironment) - Number(b.isEnvironment) ||
                (a.mealNumber ?? Infinity) - (b.mealNumber ?? Infinity) ||
                (a.plannedTime ?? '').localeCompare(b.plannedTime ?? '')
        );
        const meals = rows.filter((row) => !row.isEnvironment);
        return [
            {
                startDay,
                endDay,
                rows,
                mealCount: meals.length,
                dailyMeals:
                    meals.length > 0 &&
                    meals.every((row) =>
                        row.items.some(
                            (item) =>
                                item.repeatIntervalDays === 1 &&
                                item.startDay <= startDay &&
                                item.endDay >= endDay
                        )
                    ),
                environmentCount: rows.filter((row) => row.isEnvironment)
                    .length,
            },
        ];
    });
};

/** Keep post counts consistent across authoring forms. */
export const formatPostCount = (value) =>
    String(value ?? '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
export const parsePostCount = (value) => value?.replace(/\./g, '') ?? '';

/** Scope localized validation to template authoring, including dynamic field labels. */
export const templateValidateMessages = {
    default: '${label} không hợp lệ.',
    required: 'Vui lòng nhập ${label}.',
    types: {
        number: '${label} phải là số.',
        integer: '${label} phải là số nguyên.',
    },
    number: {
        min: '${label} phải từ ${min}.',
        max: '${label} tối đa ${max}.',
        range: '${label} phải từ ${min} đến ${max}.',
    },
    string: { max: '${label} tối đa ${max} ký tự.' },
};
