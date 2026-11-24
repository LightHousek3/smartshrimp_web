import { PROTOCOL_TIMING } from '../constants/productionProtocol.js';

/** Keep the configured interval relative to the occurrence, independent of form entry time. */
export const executionWindowMinutes = (value, label = 'Khoảng thực hiện') => {
    const minutes = value ?? PROTOCOL_TIMING.defaultMinutes;
    if (typeof minutes !== 'number' || !Number.isFinite(minutes))
        throw new Error(`${label}: vui lòng nhập số phút hợp lệ.`);
    if (minutes > PROTOCOL_TIMING.maxMinutes)
        throw new Error(`${label}: thời gian quá lớn, vui lòng nhập khoảng ngắn hơn.`);
    if (!Number.isInteger(minutes))
        throw new Error(`${label}: vui lòng nhập số phút nguyên.`);
    if (minutes < PROTOCOL_TIMING.minMinutes)
        throw new Error(`${label}: cần ít nhất 10 phút kể từ giờ dự kiến.`);
    return minutes;
};

/** Use the latest original deadline when editing a meal with older item-level windows. */
export const mealExecutionWindow = (meal) =>
    meal.dueAtMinutes ??
    (meal.items.length
        ? Math.max(...meal.items.map((item) => item.dueAtMinutes ?? PROTOCOL_TIMING.defaultMinutes))
        : PROTOCOL_TIMING.defaultMinutes);

export const executionTimeRange = (time, minutes) => {
    if (!time) return 'Chưa đặt giờ';
    const [hour, minute] = time.slice(0, 5).split(':').map(Number);
    const end = hour * 60 + minute + minutes;
    const days = Math.floor(end / 1440);
    const clock = [Math.floor((end % 1440) / 60), end % 60]
        .map((value) => String(value).padStart(2, '0'))
        .join(':');
    return `${time.slice(0, 5)} – ${clock}${days ? ` (+${days} ngày)` : ''}`;
};
