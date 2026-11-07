/** Vietnamese grouping throughout; fixed precision or per-metric limits affect presentation only. */
export const metricNumber = (value, digits) => {
    if (value == null || !Number.isFinite(Number(value))) return '—';
    return new Intl.NumberFormat('vi-VN', {
        minimumFractionDigits: typeof digits === 'number' ? digits : 0,
        maximumFractionDigits: typeof digits === 'number' ? digits : 5,
        ...(typeof digits === 'object' ? digits : {}),
    }).format(Number(value));
};

/** Date-only stocking values and observation timestamps are displayed on Vietnam's calendar. */
export const metricDate = (value, withTime = false) => {
    if (!value || Number.isNaN(new Date(value).getTime())) return '—';
    const date = new Date(value);
    const options = { timeZone: 'Asia/Ho_Chi_Minh' };
    const day = date.toLocaleDateString('vi-VN', { ...options, day: '2-digit', month: '2-digit', year: 'numeric' });
    return withTime ? `${date.toLocaleTimeString('vi-VN', { ...options, hour: '2-digit', minute: '2-digit' })} ${day}` : day;
};

export const waterRange = ({ min, max }) => {
    if (min != null && max != null) return `${metricNumber(min)}–${metricNumber(max)}`;
    if (min != null) return `≥ ${metricNumber(min)}`;
    if (max != null) return `≤ ${metricNumber(max)}`;
    return '—';
};

/** Weekly DOC ticks retain the first and last actual observation without crowding long seasons. */
export const growthTicks = (lastDay, firstDay = 1) => {
    if (!Number.isFinite(lastDay) || lastDay < 1) return [1];
    const step = Math.max(7, Math.ceil((lastDay - firstDay) / 14 / 7) * 7);
    const ticks = [firstDay];
    for (let day = Math.ceil((firstDay + 1) / step) * step; day < lastDay; day += step) ticks.push(day);
    if (lastDay > firstDay) ticks.push(lastDay);
    return ticks;
};
