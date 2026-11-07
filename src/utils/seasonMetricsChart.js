import { growthTicks, metricDate, metricNumber } from './seasonMetrics.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Align observations by real DOC, never by array index or by fabricating zero readings. */
export const seasonChartModel = ({ series = [], mortality, stockingDate, harvests = [] }) => {
    const stocking = new Date(stockingDate).getTime();
    const docOfDate = (date) => date && stockingDate && Number.isFinite(stocking)
        ? Math.round((new Date(date).getTime() - stocking) / DAY_MS) + 1 : null;
    const points = new Map(series.map(({ dayOfCulture, avgWeightG }) => [dayOfCulture, { dayOfCulture, avgWeightG }]));
    for (const { date, count } of mortality?.series ?? []) {
        const doc = docOfDate(date);
        if (doc == null || !Number.isFinite(doc) || doc < 1) continue;
        points.set(doc, { ...points.get(doc), dayOfCulture: doc, mortalityCount: count });
    }
    const mortalityFrom = mortality?.series?.[0]?.date ?? null;
    const mortalityTo = mortality?.series?.at(-1)?.date ?? null;
    const from = docOfDate(mortalityFrom);
    const to = docOfDate(mortalityTo);
    const rows = [...points.values()].sort((a, b) => a.dayOfCulture - b.dayOfCulture).map((point) => ({
        ...point, avgWeightG: point.avgWeightG ?? null, mortalityCount: point.mortalityCount ?? null,
        date: stockingDate && Number.isFinite(stocking)
            ? new Date(stocking + (point.dayOfCulture - 1) * DAY_MS).toISOString().slice(0, 10) : null,
        inMortalityHistory: Number.isFinite(from) && Number.isFinite(to) && point.dayOfCulture >= from && point.dayOfCulture <= to,
    }));
    const events = harvests.filter((event) => Number.isFinite(event.dayOfCulture) && event.dayOfCulture >= 1);
    return {
        points: rows, harvests: events, mortalityFrom, mortalityTo,
        hasWeight: rows.some((point) => point.avgWeightG != null),
        hasMortality: rows.some((point) => point.mortalityCount != null),
        firstDay: rows[0]?.dayOfCulture ?? 1,
        lastDay: Math.max(rows.at(-1)?.dayOfCulture ?? 1, ...events.map((event) => event.dayOfCulture)),
    };
};

/** Both lines share real DOC spacing; mortality keeps missing-day gaps and an independent count axis. */
export const seasonChartConfig = (model) => {
    const { points, firstDay, lastDay, hasWeight, hasMortality } = model;
    const tickFont = { family: 'Plus Jakarta Sans', size: 10 };
    return {
        type: 'line',
        data: { datasets: [
            ...(hasWeight ? [{ type: 'line', label: 'Trọng lượng TB', yAxisID: 'weight', order: 1,
                data: points.map((point) => ({ x: point.dayOfCulture, y: point.avgWeightG })),
                spanGaps: true, borderColor: '#1d7ad6', borderWidth: 2,
                pointRadius: points.filter((point) => point.avgWeightG != null).length === 1 ? 3 : 0, pointHoverRadius: 4,
                pointHoverBackgroundColor: '#1d7ad6', pointHoverBorderColor: '#fff', pointHoverBorderWidth: 2,
                fill: 'origin', backgroundColor: 'rgba(29,122,214,0.06)',
            }] : []),
            ...(hasMortality ? [{ type: 'line', label: 'Số chết ghi nhận', yAxisID: 'mortality', order: 2,
                data: points.map((point) => ({ x: point.dayOfCulture, y: point.mortalityCount })),
                spanGaps: false, borderColor: '#d43b57', borderWidth: 2, fill: false,
                pointRadius: (context) => {
                    const index = context.dataIndex;
                    // Isolated readings (including zero) must remain visible when a gap breaks the line.
                    return points[index - 1]?.mortalityCount == null && points[index + 1]?.mortalityCount == null ? 3 : 0;
                },
                pointHoverRadius: 4, pointBackgroundColor: '#d43b57', pointHoverBorderColor: '#fff', pointHoverBorderWidth: 2,
            }] : []),
        ] },
        plugins: [{ id: 'seasonEvents', afterDraw: ({ ctx, chartArea, scales }) => {
            ctx.save(); ctx.strokeStyle = '#d08a22'; ctx.fillStyle = '#966118'; ctx.setLineDash([4, 4]);
            for (const day of new Set(model.harvests.map((event) => event.dayOfCulture))) {
                if (day < firstDay || day > lastDay) continue;
                const x = scales.x.getPixelForValue(day);
                ctx.beginPath(); ctx.moveTo(x, chartArea.top); ctx.lineTo(x, chartArea.bottom); ctx.stroke();
                ctx.textAlign = x > chartArea.right - 60 ? 'right' : 'left';
                ctx.fillText(`Thu D${day}`, x, chartArea.top + 12);
            }
            ctx.restore();
        } }],
        options: {
            responsive: true, maintainAspectRatio: false, animation: false,
            interaction: { mode: 'index', axis: 'x', intersect: false },
            scales: {
                x: { type: 'linear', min: firstDay - 0.5, max: Math.max(firstDay + 0.5, lastDay + 0.5),
                    border: { display: false }, grid: { display: false },
                    afterBuildTicks: (axis) => { axis.ticks = growthTicks(lastDay, firstDay).map((value) => ({ value })); },
                    ticks: { color: '#6a7994', maxRotation: 0, font: tickFont, callback: (value) => `D${value}` } },
                weight: { type: 'linear', axis: 'y', position: 'left', display: hasWeight, beginAtZero: true,
                    border: { display: false }, grid: { color: '#eef1f7', drawTicks: false },
                    ticks: { count: 5, padding: 6, color: '#1d7ad6', font: tickFont, callback: (value) => `${metricNumber(value)} g` } },
                mortality: { type: 'linear', axis: 'y', position: 'right', display: hasMortality, beginAtZero: true, grace: '10%',
                    border: { display: false }, grid: { drawOnChartArea: false, drawTicks: false },
                    ticks: { precision: 0, maxTicksLimit: 5, padding: 6, color: '#d43b57', font: tickFont,
                        callback: (value) => `${metricNumber(value)} con` } },
            },
            plugins: { tooltip: {
                backgroundColor: '#fff', borderColor: '#e5e8f0', borderWidth: 1,
                titleColor: '#3a4a63', bodyColor: '#3a4a63', displayColors: true, padding: 10,
                callbacks: {
                    title: (items) => {
                        const point = points[items[0].dataIndex];
                        return `DOC ${point.dayOfCulture}${point.date ? ` · ${metricDate(point.date)}` : ''}`;
                    },
                    label: (item) => `${item.dataset.label}: ${metricNumber(item.parsed.y)} ${item.dataset.yAxisID === 'weight' ? 'g' : 'con'}`,
                    afterBody: (items) => {
                        const point = points[items[0].dataIndex];
                        if (!point.inMortalityHistory) return 'Số chết: ngoài khoảng đã ghi nhận';
                        return point.mortalityCount == null ? 'Số chết: chưa có nhật ký' : '';
                    },
                },
            } },
        },
    };
};
