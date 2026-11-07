import { Card, Table, Tooltip } from 'antd';
import ExpertSeasonGrowthChart from './ExpertSeasonGrowthChart';
import { HEALTH_LABELS, HEALTH_TONES, SHRIMP_TYPE_LABELS, WATER_METRICS } from '../constants/seasonMetrics';
import { metricDate, metricNumber, waterRange } from '../utils/seasonMetrics';
import { Pill } from '../pages/expert/expertUI';

const panelClass = 'overflow-hidden! rounded-[14px]! border-[#e5e8f0]! bg-white! shadow-[0_1px_2px_rgba(15,28,46,0.04)]! [&>.ant-card-body]:p-0!';
const gridClass = 'grid gap-2.5';

/** Keep tiles compact; observation sources remain available on hover and keyboard focus. */
const Metric = ({ label, value, unit, hint, detail, danger = false, text = false, children }) => {
    const tile = <div tabIndex={detail ? 0 : undefined} className={`h-full min-w-0 rounded-xl border px-3.5 py-3 ${danger ? 'border-[rgba(212,59,87,0.3)] bg-[#fbe6ea]' : 'border-[#eef1f7] bg-[#f8fafc]'}`}>
        <div className="text-[11px] font-medium leading-[18px] text-[#6a7994]">{label}</div>
        {children || <div className={`mt-0.5 flex flex-wrap items-baseline gap-1 font-semibold leading-[27.5px] ${danger ? 'text-[#d43b57]' : 'text-[#0f1c2e]'}`}>
            <span className={text ? 'text-[15px]' : 'font-[JetBrains_Mono,monospace] text-[17px]'}>{value}</span>
            {unit && <span className="text-[11px] font-medium text-[#6a7994]">{unit}</span>}
        </div>}
        {hint && <div className="mt-0.5 text-[10.5px] leading-[17px] text-[#6a7994]">{hint}</div>}
    </div>;
    return detail ? <Tooltip title={detail} trigger={['hover', 'focus', 'click']}>{tile}</Tooltip> : tile;
};

const Panel = ({ title, timestamp, children }) => <Card className={panelClass}>
    <div className="flex min-h-[51px] flex-wrap items-center justify-between gap-2 border-b border-[#eef1f7] px-5 py-3.5">
        <h2 className="m-0 text-sm font-bold leading-[22px] text-[#0f1c2e]">{title}</h2>
        {timestamp && <span className="text-[11.5px] leading-[19px] text-[#6a7994]">{timestamp}</span>}
    </div>
    <div className="p-5">{children}</div>
</Card>;

/** Compact presentation preserves independent health/stock/FCR sources and post-harvest rules. */
const ExpertSeasonMetrics = ({ season }) => {
    const planning = season.status === 'PLANNING';
    const { stocking, growth, water, stock, health, feed, harvest } = season;
    const mortality = health?.mortality;
    const latestHarvest = harvest?.events.at(-1);
    const hasReadings = Boolean(growth || health?.recordedAt || stock?.population || stock?.biomass || feed?.asOf);
    return <div className="space-y-4!">
        <Panel title="Thông tin thả giống">
            <div className={`${gridClass} grid-cols-5 max-[1150px]:grid-cols-3 max-[650px]:grid-cols-2 max-[420px]:grid-cols-1`}>
                <Metric label="Loài tôm" value={SHRIMP_TYPE_LABELS[season.shrimpType] || '—'} text />
                <Metric label={planning ? 'Số giống dự kiến' : 'Số lượng thả ban đầu'} value={metricNumber(stocking.initialQuantity)} unit="con" />
                <Metric label={planning ? 'Mật độ thả dự kiến' : 'Mật độ thả ban đầu'} value={metricNumber(stocking.initialDensityPerM2)} unit="con/m²" />
                <Metric label={planning ? 'Ngày thả dự kiến' : 'Ngày thả giống'} value={metricDate(stocking.stockingDate)} />
                <Metric label="Ngày dự kiến kết thúc" value={metricDate(stocking.expectedEndDate)} />
            </div>
        </Panel>
        {!planning && <div className="grid grid-cols-[minmax(0,7fr)_minmax(0,5fr)] items-stretch gap-4 max-[1100px]:grid-cols-1">
            <Panel title="Tăng trưởng & hiệu quả" timestamp={growth?.recordedAt && `Cân mẫu ${metricDate(growth.recordedAt, true)}`}>
                {!growth && <p className="mb-3 text-[13px] text-[#6a7994]">Chưa có dữ liệu cân mẫu.</p>}
                {hasReadings && <div className={`${gridClass} grid-cols-4 max-[650px]:grid-cols-2 max-[420px]:grid-cols-1`}>
                    <Metric label="Trọng lượng TB" value={metricNumber(growth?.avgWeightG)} unit="g"
                        hint={growth?.sizePerKg != null && `size ~${metricNumber(growth.sizePerKg)} con/kg`}
                        detail={`Lần cân gần nhất: ${metricDate(growth?.recordedAt, true)}. ${growth?.beforeLatestHarvest ? 'Mẫu trước hoặc cùng mốc thu, chưa đại diện cho đàn còn lại.' : ''}`} />
                    <Metric label="Tăng trọng / ngày" value={metricNumber(growth?.dailyWeightGainG, 2)} unit="g"
                        detail="Cần hai ngày cân khác nhau sau lần thu gần nhất. Không so đàn trước và sau thu chọn lọc; đã thu cuối thì không tính tăng trọng hiện tại." />
                    <Metric label="Tỷ lệ sống ước tính" value={metricNumber(stock?.survivalRatePct, 1)} unit="%"
                        detail={`Tỷ lệ toàn vụ = (số con còn lại + số con đã thu tới cùng mốc) / số con thả. Mốc: ${metricDate(stock?.population?.recordedAt, true)}. Thiếu số con của một lần thu thì chưa xác định được.`} />
                    <Metric label="FCR tạm tính" value={metricNumber(feed?.estimatedFcr, 2)}
                        hint={`${metricNumber(feed?.totalFeedKg, { maximumFractionDigits: 2 })} kg thức ăn`}
                        detail={`FCR = thức ăn / (sinh khối còn lại + sinh khối đã thu), bỏ qua sinh khối giống nhỏ. Thức ăn đến mốc FCR ${metricDate(feed?.asOf, true)}: ${metricNumber(feed?.totalFeedKg, { maximumFractionDigits: 3 })} kg. ${feed?.awaitingPostHarvestBiomass ? `Chờ sinh khối sau lần thu tỉa ${metricDate(latestHarvest?.harvestedAt, true)}.` : 'Thiếu sinh khối phù hợp hoặc quy đổi thức ăn thì chưa tính được.'}`} />
                    <Metric label="Sinh khối" value={metricNumber(stock?.biomass?.kg, { maximumFractionDigits: 2 })} unit="kg"
                        detail={`Sinh khối còn lại tại ${metricDate(stock?.biomass?.recordedAt, true)}. Sau thu tỉa cần quan trắc mới; thu cuối còn lại 0.`} />
                    <Metric label="Số tôm ước tính" value={metricNumber(stock?.population?.count)} unit="con"
                        detail={stock?.population ? `Số con còn lại: ${stock.population.source === 'HARVEST' ? 'Theo lần thu' : 'Theo nhật ký'} ${metricDate(stock.population.recordedAt, true)}.` : 'Chưa có ước tính số con còn lại.'} />
                    <Metric label="Số chết 7 ngày" value={metricNumber(mortality?.total)} unit="con"
                        danger={mortality?.total > 0 && ['WARNING', 'CRITICAL'].includes(health?.status)}
                        detail={mortality && `${metricDate(mortality.from)}–${metricDate(mortality.to)} · ${mortality.recordedDays}/${mortality.days} ngày có nhật ký. Ngày ${metricDate(mortality.to)}: ${metricNumber(mortality.lastDayCount)} con. Chỉ cộng số chết đã ghi, không gồm số đã thu. Có nhật ký không chứng minh kiểm đếm đầy đủ. Thiếu nhật ký giữ trống, không coi là 0.`} />
                    <Metric label="Đánh giá sức khỏe" detail={`Ghi nhận ${metricDate(health?.recordedAt, true)}, độc lập với thời điểm cân mẫu.`}>
                        <div className="mt-1.5">{health?.status ? <Pill t={HEALTH_TONES[health.status]}>{HEALTH_LABELS[health.status]}</Pill> : '—'}</div>
                    </Metric>
                </div>}
                {(growth?.beforeLatestHarvest || feed?.awaitingPostHarvestBiomass || stock?.survivalRatePct > 100) &&
                    <p role="status" className={`mb-0 mt-2 text-[11px] ${stock?.survivalRatePct > 100 ? 'text-[#b06c13]' : 'text-[#6a7994]'}`}>
                        {[growth?.beforeLatestHarvest && 'Mẫu cân trước lần thu gần nhất',
                            feed?.awaitingPostHarvestBiomass && 'Chờ sinh khối sau thu tỉa',
                            stock?.survivalRatePct > 100 && 'Tỷ lệ sống vượt 100% — cần đối soát số lượng'].filter(Boolean).join(' · ')}
                    </p>}
                <ExpertSeasonGrowthChart series={growth?.series} mortality={mortality}
                    stockingDate={stocking.stockingDate} harvests={harvest?.events} />
            </Panel>
            <Panel title="Môi trường nước" timestamp={water && `Đo ${metricDate(water.recordedAt, true)}`}>
                {water ? <div className={`${gridClass} grid-cols-2 max-[420px]:grid-cols-1`}>
                    {WATER_METRICS.map(({ field, label, unit }) => {
                        const metric = water.metrics.find((item) => item.field === field);
                        return <Metric key={field} label={label} value={metricNumber(metric?.value)} unit={unit}
                            danger={metric?.exceeded} hint={metric && waterRange(metric)} />;
                    })}
                </div> : <p className="m-0 text-[13px] text-[#6a7994]">Chưa có nhật ký nước.</p>}
            </Panel>
        </div>}
        {!planning && <Panel title="Thu hoạch" timestamp={latestHarvest && `Lần gần nhất ${metricDate(latestHarvest.harvestedAt, true)}`}>
            {harvest?.count ? <>
                <p className="mb-3 text-[13px] text-[#3a4a63]">{harvest.count} lần thu · Tổng {metricNumber(harvest.totalWeightKg, { maximumFractionDigits: 2 })} kg · {latestHarvest.type === 'FINAL' ? 'Đã thu cuối' : 'Lần gần nhất: thu tỉa'}</p>
                <details><summary className="cursor-pointer text-[13px] text-[#1d7ad6]">Xem lịch sử thu hoạch</summary>
                    <Table className="mt-3" size="small" rowKey="id" scroll={{ x: 700 }} dataSource={[...harvest.events].reverse()}
                        pagination={{ pageSize: 5, hideOnSinglePage: true, showSizeChanger: false }} columns={[
                            { title: 'Thời điểm / DOC', key: 'time', render: (_, event) => `${metricDate(event.harvestedAt, true)} · D${event.dayOfCulture ?? '—'}` },
                            { title: 'Loại thu', dataIndex: 'type', render: (value) => value === 'FINAL' ? 'Thu cuối' : 'Thu tỉa' },
                            { title: 'Khối lượng (kg)', dataIndex: 'totalWeightKg', render: (value) => metricNumber(value, { maximumFractionDigits: 2 }) },
                            { title: 'Số con đã thu', dataIndex: 'quantityCount', render: (value) => metricNumber(value) },
                            { title: 'Còn lại ước tính (con)', dataIndex: 'estimatedRemainingCount', render: (value) => metricNumber(value) },
                        ]} />
                </details>
            </> : <p className="m-0 text-[13px] text-[#6a7994]">Chưa có lần thu hoạch.</p>}
        </Panel>}
    </div>;
};

export default ExpertSeasonMetrics;
