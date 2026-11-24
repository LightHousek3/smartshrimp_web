import { protocolPayload, treatmentStartError } from './productionProtocolUtils.js';
import {
    getApplicationDays,
    nextRepeatDay,
    assertMaterialDailyIncrement,
} from './protocolTemplateUtils.js';
import { proposalMissingFields, templateMaterialSelectionError } from './materialCompliance.js';
import { mealExecutionWindow } from './protocolTiming.js';
import { PROTOCOL_TIMING } from '../constants/productionProtocol.js';

const key = () => crypto.randomUUID();
const numeric = (value) => (value == null ? null : Number(value));
/** Restore proposal content without catalog identity, retaining deleted-product markers. */
const productFor = (item) => {
    if (!item.productId && item.recommendedProductDetails?.proposed) {
        const proposal = structuredClone(item.recommendedProductDetails.proposed);
        return {
            ...proposal,
            category: proposal.category.toUpperCase(),
            unit: proposal.unit.toUpperCase(),
            conversionUnit: proposal.conversionUnit?.toUpperCase() ?? null,
            unavailable: Boolean(item.recommendedProductDetails.review?.deletedProductId),
        };
    }
    const product = { ...item.materialSnapshot, ...item.product, id: item.productId };
    return {
        ...product,
        name: product.name || item.recommendedProductDetails?.proposed?.name || 'Vật tư cũ',
        category:
            product.category || (item.operationType === 'FEEDING' ? 'FEED' : item.operationType),
        unit: product.unit || item.doseUnit,
        productCompliance: product.productCompliance || product.compliance,
    };
};

/** Preserve operational identities and anchors; the shared editor displays one-based days. */
export const protocolToEditorStages = (detail) =>
    (detail?.stages || []).map((stage) => {
        const result = {
            key: stage.id || key(),
            id: stage.id,
            startDay: stage.startDayOffset + 1,
            endDay: stage.endDayOffset + 1,
            meals: [],
            environment: [],
        };
        for (const meal of stage.meals) {
            const items = meal.items.map((item) => ({
                key: item.id || key(),
                id: item.id,
                product: productFor(item),
                operationType: item.operationType,
                doseBasis: item.doseBasis,
                doseValue: numeric(item.doseValue),
                doseUnit: item.doseUnit,
                dailyDoseIncrement: numeric(item.dailyDoseIncrement) || 0,
                dueAtMinutes: item.dueAtMinutes ?? PROTOCOL_TIMING.defaultMinutes,
                instructions: item.instructions || '',
                firstDay: (item.firstDayOffset ?? stage.startDayOffset) + 1,
                lastDay: (item.lastDayOffset ?? stage.endDayOffset) + 1,
                repeatIntervalDays: item.repeatIntervalDays,
                recurrenceAnchorDay:
                    (item.recurrenceAnchorOffset ?? item.firstDayOffset ?? stage.startDayOffset) +
                    1,
                doseAnchorDay:
                    (item.doseAnchorOffset ?? item.firstDayOffset ?? stage.startDayOffset) + 1,
                originalRecommendation: item.recommendedProductDetails,
                recommendedManufacturerId: item.recommendedManufacturerId,
            }));
            if (meal.mealNumber == null)
                result.environment.push(
                    ...items.map((item) => ({
                        ...item,
                        time: meal.plannedTime,
                        originalMealId: meal.id,
                        originalTime: meal.plannedTime,
                        repeatIntervalDays: item.repeatIntervalDays,
                    })),
                );
            else
                result.meals.push({
                    key: meal.id || key(),
                    id: meal.id,
                    time: meal.plannedTime,
                    dueAtMinutes: mealExecutionWindow({ items }),
                    items,
                });
        }
        return result;
    });

const runs = (days) => {
    const result = [];
    for (const day of days) {
        const last = result.at(-1);
        if (last && day === last[1] + 1) last[1] = day;
        else result.push([day, day]);
    }
    return result;
};
const decimal = (value) =>
    Number(value)
        .toFixed(4)
        .replace(/\.?0+$/, '') || '0';

/** A copied meal is a new occurrence group; keep doses and anchors, never persisted identities. */
export const copyEditorMeal = (meal, time) => ({
    key: key(),
    time,
    dueAtMinutes: mealExecutionWindow(meal),
    items: meal.items.map((item) => {
        const copy = structuredClone(item);
        for (const field of ['id', 'originalMealId']) delete copy[field];
        return { ...copy, key: key() };
    }),
});

/** Convert explicit selected days into compact rules without resetting a recurrence or dose anchor. */
export const editorProtocolPayload = (
    values,
    stages,
    application,
    { progressive = false, submitForApproval = false } = {},
) => {
    const { season, detail } = application;
    /** Split selected days into saved intervals while retaining dose anchors and catalog revisions. */
    const toItems = (item, stage, environment = false) => {
        assertMaterialDailyIncrement(item, environment);
        const selectionError = templateMaterialSelectionError(item.product, {
            environment,
            production: season.protocolType !== 'TREATMENT',
            protocolLabel: 'phác đồ',
        });
        if (selectionError) throw new Error(selectionError);
        if (!item.product.id) {
            const missing = proposalMissingFields(item.product);
            if (missing.length)
                throw new Error(`${item.product.name}: cần bổ sung ${missing.join(', ')}.`);
        }
        const days =
            environment && item.repeatIntervalDays == null
                ? [item.firstDay ?? stage.startDay]
                : getApplicationDays(item, stage.startDay, stage.endDay);
        if (!days.length) throw new Error('Vật tư cần ít nhất một ngày áp dụng trong giai đoạn.');
        const intervals = item.applicationDays
            ? runs(days)
            : [
                  [
                      days[0],
                      environment && item.repeatIntervalDays == null
                          ? days[0]
                          : Math.min(item.lastDay ?? stage.endDay, stage.endDay),
                  ],
              ];
        return intervals.map(([first, last], index) => ({
            ...(item.id && index === 0 ? { id: item.id } : {}),
            operationType: item.product.category === 'FEED' ? 'FEEDING' : item.product.category,
            productId: item.product.id || null,
            ...(item.product.id && { productRevision: item.product.materialRevision }),
            ...(!item.product.id
                ? {
                      recommendedProductDetails: { proposed: item.product },
                      recommendedManufacturerId: item.product.manufacturerId || null,
                  }
                : item.originalRecommendation
                  ? {
                        recommendedProductDetails: item.originalRecommendation,
                        recommendedManufacturerId: item.recommendedManufacturerId,
                    }
                  : {}),
            doseBasis: item.doseBasis,
            doseValue: decimal(item.doseValue),
            doseUnit: item.doseUnit,
            dailyDoseIncrement: decimal(item.dailyDoseIncrement ?? 0),
            dueAtMinutes: item.dueAtMinutes ?? PROTOCOL_TIMING.defaultMinutes,
            instructions: item.instructions || null,
            firstDoc: first,
            lastDoc: last,
            repeatIntervalDays:
                item.applicationDays || (environment && item.repeatIntervalDays == null)
                    ? 1
                    : (item.repeatIntervalDays ?? 1),
            recurrenceAnchorDoc: item.applicationDays
                ? first
                : (item.recurrenceAnchorDay ?? item.firstDay ?? stage.startDay),
            doseAnchorDoc: item.doseAnchorDay ?? item.firstDay ?? stage.startDay,
        }));
    };
    const body = protocolPayload(
        {
            title: progressive ? values.title || 'Đang soạn' : values.title,
            summary: values.description || '',
            allowedVariancePct: String(values.allowedVariancePct ?? 10),
            rollingWindowDays: 3,
            treatmentStartAt: values.treatmentStartAt,
            stages: stages.map((stage) => {
                const environmentGroups = [];
                for (const item of stage.environment) {
                    let group = environmentGroups.find(
                        (g) => g.sourceId === item.originalMealId && g.plannedTime === item.time,
                    );
                    if (!group) {
                        group = {
                            sourceId: item.originalMealId,
                            id: environmentGroups.some((g) => g.id === item.originalMealId)
                                ? undefined
                                : item.originalMealId,
                            mealNumber: null,
                            plannedTime: item.time,
                            items: [],
                        };
                        environmentGroups.push(group);
                    }
                    group.items.push(...toItems(item, stage, true));
                }
                return {
                    id: stage.id,
                    startDoc: stage.startDay,
                    endDoc: stage.endDay,
                    meals: [
                        ...stage.meals.map((meal, index) => ({
                            id: meal.id,
                            mealNumber: index + 1,
                            plannedTime: meal.time,
                            items: meal.items.flatMap((item) =>
                                toItems({ ...item, dueAtMinutes: mealExecutionWindow(meal) }, stage),
                            ),
                        })),
                        ...environmentGroups.map(({ id, mealNumber, plannedTime, items }) => ({
                            id,
                            mealNumber,
                            plannedTime,
                            items,
                        })),
                    ],
                };
            }),
        },
        detail?.revision,
        progressive ? { ...season, expectedEndDate: null } : season,
    );
    if (season.protocolType === 'TREATMENT' && submitForApproval) {
        const error = treatmentStartError(values.treatmentStartAt, season, { future: true });
        if (error) throw new Error(error);
        const items = body.stages.flatMap((stage) => stage.meals.flatMap((meal) => meal.items));
        if (!items.some((item) => item.firstDayOffset === 0))
            throw new Error('Ngày điều trị 1 cần ít nhất một lần thực hiện từ mốc bắt đầu.');
    }
    return body;
};

/** Copy the next phase while retaining recurrence cadence and dropping database identities. */
export const copyEditorStage = (source, startDay) => {
    const endDay = startDay + source.endDay - source.startDay;
    if (endDay > 3650) throw new Error('Giai đoạn sao chép vượt phạm vi ngày cho phép.');
    /** Advance copied doses and application windows while assigning fresh editor identities. */
    const copyItem = (item) => {
        const rest = structuredClone(item);
        for (const field of ['id', 'originalMealId', 'originalRecommendation']) delete rest[field];
        const interval = item.repeatIntervalDays ?? 1;
        const shift = startDay - source.startDay;
        const explicitWindow =
            item.applicationDays ||
            item.repeatIntervalDays == null ||
            (item.firstDay ?? source.startDay) > source.startDay ||
            (item.lastDay ?? source.endDay) < source.endDay;
        const firstDay = explicitWindow
            ? (item.applicationDays?.[0] ?? item.firstDay ?? source.startDay) + shift
            : nextRepeatDay(
                  item.recurrenceAnchorDay ?? item.firstDay ?? source.startDay,
                  interval,
                  startDay,
              );
        const doseAnchor = item.doseAnchorDay ?? item.firstDay ?? source.startDay;
        return {
            ...rest,
            key: key(),
            firstDay,
            lastDay: explicitWindow ? (item.lastDay ?? source.endDay) + shift : endDay,
            doseValue: Number(
                (item.doseValue + (item.dailyDoseIncrement ?? 0) * (firstDay - doseAnchor)).toFixed(
                    4,
                ),
            ),
            doseAnchorDay: firstDay,
            recurrenceAnchorDay: firstDay,
            ...(item.applicationDays && {
                applicationDays: item.applicationDays.map(
                    (day) => day + startDay - source.startDay,
                ),
            }),
        };
    };
    return {
        key: key(),
        startDay,
        endDay,
        meals: source.meals.map((meal) => ({
            key: key(),
            time: meal.time,
            dueAtMinutes: mealExecutionWindow(meal),
            items: meal.items.map(copyItem).filter((item) => item.firstDay <= endDay),
        })),
        environment: source.environment.map(copyItem).filter((item) => item.firstDay <= endDay),
    };
};
