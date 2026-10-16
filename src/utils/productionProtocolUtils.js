import { allowedDoseBases, OPERATION_LABELS, UNIT_LABELS } from '../constants/productionProtocol.js';

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
    return Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'id').map(([key, entry]) => [key, cloneGroup(entry)]));
};
export const protocolToForm = (detail) => ({
    title: detail?.title || '', summary: detail?.summary || '',
    allowedVariancePct: detail?.allowedVariancePct ?? '10', rollingWindowDays: detail?.rollingWindowDays ?? 7,
    stages: (detail?.stages || []).map((stage) => ({ ...stage,
        startDoc: stage.startDayOffset + 1, endDoc: stage.endDayOffset + 1,
        meals: stage.meals.map((meal) => ({ ...meal, items: meal.items.map((item) => ({ ...item })) })),
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
export const protocolPayload = (values, revision) => {
    const allowedVariancePct = decimal(values.allowedVariancePct, 3, 2, 'Sai lệch cho phép', true);
    if (Number(allowedVariancePct) > 100) fail('Sai lệch cho phép phải trong 0–100%.');
    if ((values.summary || '').length > 4000) fail('Ghi chú tối đa 4000 ký tự.');
    if (values.stages.length > 50) fail('Tối đa 50 giai đoạn.');
    const overlap = stageOverlapError(values.stages);
    if (overlap) fail(overlap);
    let itemCount = 0;
    const stages = values.stages.map((stage, stageIndex) => {
        const label = `Giai đoạn ${stageIndex + 1}`;
        const start = integer(stage.startDoc, 1, 2147483648, `${label} DOC đầu`) - 1;
        const end = integer(stage.endDoc, start + 1, 2147483648, `${label} DOC cuối`) - 1;
        if (!stage.meals.length || stage.meals.length > 50) fail(`${label}: cần 1–50 cữ có hạng mục.`);
        return { ...(stage.id && { id: stage.id }),
            startDayOffset: start, endDayOffset: end, meals: stage.meals.map((meal, mealIndex) => {
                const mealLabel = `${label}, cữ ${mealIndex + 1}`;
                if (meal.plannedTime && !/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,3})?)?$/.test(meal.plannedTime)) fail(`${mealLabel}: giờ không hợp lệ.`);
                if (!meal.items.length || meal.items.length > 100) fail(`${mealLabel}: cần 1–100 hạng mục.`);
                return { ...(meal.id && { id: meal.id }), mealNumber: meal.mealNumber == null ? null : integer(meal.mealNumber, 1, 32767, mealLabel),
                    plannedTime: meal.plannedTime || null, items: meal.items.map((item, itemIndex) => {
                        itemCount++;
                        const itemLabel = `${mealLabel}, hạng mục ${itemIndex + 1}`;
                        if (!OPERATION_LABELS[item.operationType] || !UNIT_LABELS[item.doseUnit]) fail(`${itemLabel}: chọn hoạt động và đơn vị.`);
                        if (!allowedDoseBases(item.operationType, start).includes(item.doseBasis)) fail(`${itemLabel}: cơ sở liều không phù hợp với tuổi nuôi.`);
                        const recommendedProductName = item.productId ? (item.recommendedProductName?.trim() || null)
                            : text(item.recommendedProductName, 255, `${itemLabel} tên vật tư`);
                        if ((recommendedProductName || '').length > 255) fail(`${itemLabel}: tên vật tư tối đa 255 ký tự.`);
                        if ((item.instructions || '').length > 4000) fail(`${itemLabel}: hướng dẫn tối đa 4000 ký tự.`);
                        return { ...(item.id && { id: item.id }), operationType: item.operationType, productId: item.productId || null,
                            recommendedProductName, recommendedCategory: item.recommendedCategory || null,
                            repeatIntervalDays: integer(item.repeatIntervalDays, 1, 30, `${itemLabel} chu kỳ`),
                            doseBasis: item.doseBasis, doseValue: decimal(item.doseValue, 10, 4, `${itemLabel} liều`),
                            doseUnit: item.doseUnit, instructions: item.instructions?.trim() || null };
                    }) };
            }) };
    });
    if (itemCount > 1000) fail('Tối đa 1000 hạng mục trong một phác đồ.');
    return { title: text(values.title, 500, 'Tên phác đồ'), summary: values.summary?.trim() || null,
        allowedVariancePct, rollingWindowDays: integer(values.rollingWindowDays, 1, 14, 'Cửa sổ lịch'), stages,
        ...(revision != null && { revision }) };
};
