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
