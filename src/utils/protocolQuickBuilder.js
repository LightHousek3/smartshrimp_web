import { getMaterialDoseUnits } from './protocolTemplateUtils.js';

import { divideDailyDose } from './protocolDoseAllocation.js';

/** Expand Expert-entered phases into per-meal rules without prescribing products or biological rates. */
export const buildQuickTemplateStages = ({
    shrimpType,
    referencePostCount,
    meals,
    phases,
}) => {
    if (!['WHITELEG', 'BLACK_TIGER'].includes(shrimpType))
        throw new Error('Chọn loài tôm.');
    if (
        !Number.isInteger(referencePostCount) ||
        referencePostCount < 1 ||
        referencePostCount > 1000000000
    )
        throw new Error(
            'Số post tham chiếu phải là số nguyên từ 1 đến 1.000.000.000.'
        );
    if (
        !Array.isArray(meals) ||
        !meals.length ||
        meals.length > 12 ||
        meals.some(
            (meal, index) =>
                !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(meal.time) ||
                !Number.isFinite(meal.sharePct) ||
                meal.sharePct <= 0 ||
                meal.sharePct > 100 ||
                (index > 0 && meal.time <= meals[index - 1].time)
        )
    )
        throw new Error(
            'Nhập từ 1 đến 12 cữ, giờ tăng dần không trùng và tỷ lệ mỗi cữ lớn hơn 0.'
        );
    for (const field of ['sharePct', 'growoutSharePct']) {
        if (
            meals.some(
                (meal) =>
                    !Number.isFinite(
                        meal[field] === undefined ? meal.sharePct : meal[field]
                    ) ||
                    (meal[field] === undefined ? meal.sharePct : meal[field]) <=
                        0 ||
                    (meal[field] === undefined ? meal.sharePct : meal[field]) >
                        100
            ) ||
            Math.abs(
                meals.reduce(
                    (sum, meal) =>
                        sum +
                        (meal[field] === undefined
                            ? meal.sharePct
                            : meal[field]),
                    0
                ) - 100
            ) > 0.000001
        )
            throw new Error(
                'Tổng tỷ lệ mỗi nhóm DOC của các cữ phải bằng 100%; mỗi tỷ lệ lớn hơn 0.'
            );
    }
    if (!Array.isArray(phases) || !phases.length || phases.length > 120)
        throw new Error('Nhập từ 1 đến 120 giai đoạn.');
    if (phases.length * meals.length > 500)
        throw new Error('Phác đồ mẫu có tối đa 500 hạng mục.');
    let previousEnd = 0;
    return phases.map((phase) => {
        if (
            !Number.isInteger(phase.startDay) ||
            !Number.isInteger(phase.endDay) ||
            phase.startDay <= previousEnd ||
            phase.endDay < phase.startDay ||
            phase.endDay > 3650
        )
            throw new Error(
                'Giai đoạn phải theo thứ tự, không chồng lấn, trong DOC 1–3650.'
            );
        previousEnd = phase.endDay;
        if (
            phase.product?.category !== 'FEED' ||
            phase.product.unavailable ||
            ['BANNED', 'TREATMENT_ONLY'].includes(phase.product.safety?.status)
        )
            throw new Error('Chọn thức ăn phù hợp cho từng giai đoạn.');
        const percent = phase.doseBasis === 'PERCENT_BIOMASS';
        if (
            !['FIXED_QUANTITY', 'PERCENT_BIOMASS'].includes(phase.doseBasis) ||
            (percent && phase.startDay < 30)
        )
            throw new Error(
                'DOC 1–29 dùng lượng cố định; chỉ dùng tỷ lệ sinh khối từ DOC 30.'
            );
        if (
            !Number.isFinite(phase.dailyDose) ||
            phase.dailyDose <= 0 ||
            phase.dailyDose > (percent ? 100 : 9999999999)
        )
            throw new Error('Nhập tổng khẩu phần mỗi ngày hợp lệ.');
        const increment = phase.dailyIncrement ?? 0;
        if (
            !Number.isFinite(increment) ||
            increment < 0 ||
            (increment > 0 && (percent || phase.endDay > 29))
        )
            throw new Error(
                'Tăng lượng mỗi ngày chỉ áp dụng cho thức ăn cố định trong DOC 1–29.'
            );
        const unit = percent ? 'KG' : phase.doseUnit;
        if (
            !getMaterialDoseUnits(phase.product).some(
                (option) => option.value === unit
            )
        )
            throw new Error('Đơn vị liều phải phù hợp thức ăn đã chọn.');
        const phaseMeals = meals.map((meal) => ({
            ...meal,
            sharePct:
                phase.startDay >= 30
                    ? (meal.growoutSharePct ?? meal.sharePct)
                    : meal.sharePct,
        }));
        const amounts = divideDailyDose(phase.dailyDose, phaseMeals);
        const increments = divideDailyDose(increment, phaseMeals);
        if (
            amounts.some(
                (amount, index) =>
                    amount <= 0 ||
                    amount +
                        increments[index] * (phase.endDay - phase.startDay) >
                        9999999999
            )
        )
            throw new Error(
                'Liều mỗi cữ quá nhỏ hoặc vượt giới hạn. Đổi đơn vị hoặc điều chỉnh khẩu phần.'
            );
        return {
            key: crypto.randomUUID(),
            startDay: phase.startDay,
            endDay: phase.endDay,
            environment: [],
            meals: meals.map((meal, index) => ({
                key: crypto.randomUUID(),
                time: meal.time,
                items: [
                    {
                        key: crypto.randomUUID(),
                        product: phase.product,
                        operationType: 'FEEDING',
                        doseBasis: phase.doseBasis,
                        doseValue: amounts[index],
                        doseUnit: unit,
                        dailyDoseIncrement: increments[index],
                        instructions: '',
                    },
                ],
            })),
        };
    });
};
