const DAY_MS = 86400000;
const vietnamOffset = 7 * 3600000;

const vietnamDay = (value) => {
    const timestamp = value == null ? NaN : new Date(value).getTime();
    return Number.isFinite(timestamp) ? Math.floor((timestamp + vietnamOffset) / DAY_MS) : null;
};

export const protocolDayDate = (anchor, day) => {
    const start = vietnamDay(anchor);
    return start == null ? null : new Date((start + day - 1) * DAY_MS).toISOString().slice(0, 10);
};

export const protocolDayPosition = (anchor, now, duration, treatment) => {
    const start = vietnamDay(anchor);
    const today = vietnamDay(now);
    if (start == null || today == null || duration < 1 || (treatment && new Date(now) < new Date(anchor))) {
        return { initial: 1, current: null };
    }
    const day = today - start + 1;
    return { initial: Math.max(1, Math.min(duration, day)), current: day >= 1 && day <= duration ? day : null };
};

export const protocolOccurrenceState = (row, protocolStatus) => {
    if (row.status !== 'PLANNED') return row.status;
    if (protocolStatus === 'ACTIVE') return row.timingStatus === 'OVERDUE' ? 'OVERDUE' : 'PLANNED';
    if (protocolStatus === 'APPROVED') return 'AWAITING_ACTIVATION';
    if (protocolStatus === 'PAUSED') return 'PAUSED';
    if (['DRAFT', 'PENDING_APPROVAL'].includes(protocolStatus)) return 'PENDING_APPROVAL';
    return 'LOCKED';
};

const stateOrder = [
    'OVERDUE', 'NOT_RECORDED', 'AWAITING_ACTIVATION', 'PAUSED', 'LOCKED',
    'PLANNED', 'NOT_GENERATED', 'PENDING_APPROVAL', 'COMPLETED', 'CANCELLED',
];

export const protocolMealState = (rows, status) => {
    const states = new Set(rows.map((row) => protocolOccurrenceState(row, status)));
    return stateOrder.find((state) => states.has(state)) ?? 'UNKNOWN';
};

const cancellationTime = (row) => Date.parse(row.cancelledAt ?? '') || 0;

export const protocolCurrentRows = (rows, identity = (row) => row.itemId) => {
    const current = new Map();
    for (const row of rows) {
        const key = identity(row);
        const previous = current.get(key);
        if (!previous || (previous.status === 'CANCELLED' &&
            (row.status !== 'CANCELLED' || cancellationTime(row) >= cancellationTime(previous)))) {
            current.set(key, row);
        }
    }
    return [...current.values()];
};

export const protocolMeals = (rows) => {
    const meals = new Map();
    for (const row of rows) {
        const identity = row.productionMealId ?? (row.time == null ? row.itemId : null);
        const key = JSON.stringify([identity, row.time, row.mealNumber ?? null]);
        if (!meals.has(key)) meals.set(key, { key, time: row.time, mealNumber: row.mealNumber, rows: [] });
        meals.get(key).rows.push(row);
    }
    return [...meals.values()];
};

/** Legacy records with different deadlines keep the start time and omit a shared deadline. */
export const mealTimeRange = (time, rows) => {
    if (!time) return 'Chưa đặt giờ';
    const minutes = new Set(rows.map((row) => row.scheduledAt && row.dueAt
        ? Math.trunc((Date.parse(row.dueAt) - Date.parse(row.scheduledAt)) / 60000)
        : row.dueAtMinutes));
    const [window] = minutes;
    if (minutes.size !== 1 || !Number.isInteger(window) || window <= 0) return time;
    const [hour, minute] = time.split(':').map(Number);
    const end = hour * 60 + minute + window;
    const pad = (value) => String(value).padStart(2, '0');
    const extraDays = Math.floor(end / 1440);
    return `${time} – ${pad(Math.floor(end / 60) % 24)}:${pad(end % 60)}${extraDays ? ` (+${extraDays} ngày)` : ''}`;
};

export const protocolDayMarkers = (rows, anchor) => {
    const start = vietnamDay(anchor);
    const markers = new Map();
    if (start == null) return markers;
    for (const row of protocolCurrentRows(rows, (entry) => `${entry.protocolItemId}:${entry.scheduledAt}`)) {
        const day = vietnamDay(row.scheduledAt);
        if (day == null) continue;
        const position = day - start + 1;
        if (!markers.has(position)) markers.set(position, { completed: 0, planned: 0, cancelled: 0, issues: 0 });
        const marker = markers.get(position);
        if (row.status === 'COMPLETED') marker.completed++;
        if (row.status === 'CANCELLED') marker.cancelled++;
        if (['PLANNED', 'NOT_RECORDED'].includes(row.status)) marker.planned++;
        if (row.quantityComparison?.exceedsThreshold || ['LATE', 'EARLY'].includes(row.timing?.status)) marker.issues++;
    }
    return markers;
};

export const protocolExpectedItems = (stages, day) => {
    const offset = day - 1;
    return stages.reduce((count, stage) => count + stage.meals.reduce((total, meal) =>
        total + meal.items.filter((item) =>
            offset >= item.firstDayOffset && offset <= item.lastDayOffset &&
            (offset - item.recurrenceAnchorOffset) % item.repeatIntervalDays === 0,
        ).length, 0), 0);
};
