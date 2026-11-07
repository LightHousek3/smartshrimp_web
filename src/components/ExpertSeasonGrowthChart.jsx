import { useEffect, useMemo, useRef } from 'react';
import { Tooltip } from 'antd';
import { Chart, Filler, LineController, LineElement, LinearScale, PointElement, Tooltip as ChartTooltip } from 'chart.js';
import { seasonChartConfig, seasonChartModel } from '../utils/seasonMetricsChart';
import { metricDate } from '../utils/seasonMetrics';

Chart.register(LineController, LineElement, LinearScale, PointElement, Filler, ChartTooltip);

/** Two compact history lines; no data-table UI, invented weights or zero-filled journal gaps. */
const ExpertSeasonGrowthChart = ({ series, mortality, stockingDate, harvests }) => {
    const canvas = useRef(null);
    const model = useMemo(() => seasonChartModel({ series, mortality, stockingDate, harvests }), [series, mortality, stockingDate, harvests]);
    const hasReadings = model.hasWeight || model.hasMortality;
    useEffect(() => {
        if (!hasReadings) return;
        const chart = new Chart(canvas.current, seasonChartConfig(model));
        return () => chart.destroy();
    }, [model, hasReadings]);
    if (!hasReadings) return null;

    return <div className="mt-4 min-w-0">
        <div className="mb-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-[#6a7994]">
            {model.hasWeight && <span className="inline-flex items-center gap-1"><span className="h-0.5 w-3 bg-[#1d7ad6]" />Trọng lượng (g)</span>}
            <Tooltip trigger={['hover', 'focus', 'click']} title="Tổng số chết ghi nhận từng ngày, từ nhật ký đầu tiên đến mới nhất; không cộng dồn. Ngày thiếu nhật ký được ngắt đường, không coi là 0. Trục con độc lập với trục g; cần ngày thả để ghép theo DOC.">
                <span tabIndex={0} className="inline-flex items-center gap-1">
                    <span className="h-0.5 w-3 bg-[#d43b57]" />
                    Số chết (con){model.mortalityFrom && ` · ${metricDate(model.mortalityFrom)}–${metricDate(model.mortalityTo)}`}
                    {!model.hasMortality && (stockingDate ? ' · Chưa có nhật ký' : ' · Chưa có ngày thả')}
                </span>
            </Tooltip>
        </div>
        <div className="h-[180px] min-w-0">
            <canvas ref={canvas} role="img" aria-label={`Biểu đồ đường trọng lượng trung bình theo DOC (trục trái, g) và số chết ghi nhận từng ngày (trục phải, con). Hai trục độc lập. ${model.mortalityFrom ? `Số chết từ ${metricDate(model.mortalityFrom)} đến ${metricDate(model.mortalityTo)}; ngày thiếu nhật ký được ngắt đường.` : 'Chưa có lịch sử số chết theo DOC.'}`} />
        </div>
    </div>;
};

export default ExpertSeasonGrowthChart;
