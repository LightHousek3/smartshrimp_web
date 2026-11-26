import { useEffect, useMemo, useState } from 'react';
import { Button, Empty, Select, Spin, Tag } from 'antd';
import { ClockCircleOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons';
import { expertProductionProtocolAPI, expertTreatmentProtocolAPI } from '../apis';
import { getErrorMessage } from '../utils/errorMessage';
import {
    mealTimeRange, protocolCurrentRows, protocolDayDate, protocolDayMarkers, protocolDayPosition, protocolMeals,
    protocolExpectedItems, protocolMealState,
} from '../utils/protocolExecutionUtils';
import { DOSE_LABELS, OPERATION_LABELS, UNIT_LABELS } from '../constants/productionProtocol';
import ErrorState from './ErrorState';
import ProtocolProductImages from './ProtocolProductImages';

const RANGE_SIZE = 7;
const itemColumns = 'grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-[minmax(0,1.35fr)_minmax(0,.85fr)_minmax(0,.85fr)_minmax(0,1.25fr)]';
const dateTime = new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short',
});
const number = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 9 });
const units = { ...UNIT_LABELS, MG: 'mg' };
const statuses = {
    COMPLETED: ['Hoàn thành', 'success'],
    CANCELLED: ['Đã hủy', 'default'],
    PLANNED: ['Đã lên lịch', 'processing'],
    PENDING_APPROVAL: ['Chờ duyệt', 'warning'],
    NOT_GENERATED: ['Chưa sinh lịch', 'default'],
    UNKNOWN: ['Chưa xác định', 'default'],
};
const labels = {
    NOT_RECORDED: ['Chưa ghi nhận', 'warning'],
    OVERDUE: ['Quá hạn', 'error'],
    AWAITING_ACTIVATION: ['Chờ hiệu lực', 'warning'],
    PAUSED: ['Tạm hoãn', 'warning'],
    LOCKED: ['Đã khóa ghi nhận', 'default'],
};
const markerStyles = {
    issues: ['Có sai lệch', '#ff637e'],
    planned: ['Chưa hoàn tất', '#ffb900'],
    cancelled: ['Có cữ đã hủy', '#94a3b8'],
    completed: ['Đã hoàn thành', '#00bdaa'],
};
const timingLabels = { ON_TIME: 'Đúng giờ', EARLY: 'Làm sớm', LATE: 'Làm muộn' };
const quantity = (value, unit) => value == null ? '—' : [number.format(value), units[unit]].filter(Boolean).join(' ');
const shortDate = (date) => date?.slice(5).split('-').reverse().join('/');

const MealBadges = ({ state }) => {
    const [title, color] = statuses[state] ?? statuses.PLANNED;
    const label = labels[state];
    return <div className="flex flex-wrap items-center justify-end gap-1.5">
        <Tag color={color} className="m-0!"><span className="me-1 inline-block h-1.5 w-1.5 rounded-full bg-current" />{title}</Tag>
        {label && <Tag color={label[1]} className="m-0!">{label[0]}</Tag>}
    </div>;
};

const ItemFacts = ({ row, replaced }) => {
    const comparison = row.quantityComparison;
    const differentProduct = row.actualProductDiffers && row.actualProductName;
    const hasExecution = row.executorName || row.executedAt || row.recordedAt;
    const cancelled = row.status === 'CANCELLED';
    const hasNotes = row.instructions || row.note || row.varianceReason || cancelled;
    return <article className={`grid ${itemColumns} min-w-0 border-t border-slate-100 px-3 py-3 sm:px-4`}>
        <div className="col-span-2 flex min-w-0 items-start gap-2 sm:col-span-1">
            <ProtocolProductImages product={{ name: row.productName, imageUrls: row.productImageUrls }} size={32} />
            <div className="min-w-0 [overflow-wrap:anywhere]">
                <div className="font-semibold text-slate-900">{row.productName}</div>
                <div className="text-xs text-slate-500">{OPERATION_LABELS[row.operationType]}</div>
                {differentProduct && <div className="text-xs text-rose-700">Vật tư thực dùng {row.actualProductName}</div>}
                {cancelled && <div className="text-xs text-slate-500">{replaced ? 'Lịch cũ đã hủy' : 'Đã hủy'}</div>}
            </div>
        </div>
        <div className="min-w-0 [overflow-wrap:anywhere]">
            <div className="text-xs text-slate-500 sm:hidden">Kế hoạch</div>
            <div className="font-medium tabular-nums">{quantity(row.plannedQuantity ?? row.doseValue, row.plannedQuantity == null ? row.doseUnit : row.unit)}</div>
            {row.plannedQuantity == null && row.doseBasis && <div className="text-xs text-slate-500">{DOSE_LABELS[row.doseBasis]}</div>}
        </div>
        <div className="min-w-0 [overflow-wrap:anywhere]">
            <div className="text-xs text-slate-500 sm:hidden">Thực dùng</div>
            <div className={row.actualQuantity == null ? 'text-slate-500' : 'font-semibold tabular-nums'}>
                {row.actualQuantity == null ? 'Chưa có' : quantity(row.actualQuantity, row.actualUnit)}
            </div>
            {comparison?.deviated && <div className={comparison.exceedsThreshold ? 'text-xs text-rose-700' : 'text-xs text-teal-700'}>
                {Number(comparison.difference) >= 0 ? '+' : '−'}{number.format(Number(comparison.percentage))}%
                {comparison.exceedsThreshold && ' · Vượt ngưỡng'}
            </div>}
        </div>
        <div className="col-span-2 min-w-0 [overflow-wrap:anywhere] sm:col-span-1">
            {hasExecution && <div className="space-y-0.5">
                {row.executorName && <div className="font-medium">{row.executorName}</div>}
                {row.executedAt && <div className="text-xs text-slate-600">Thực hiện {dateTime.format(new Date(row.executedAt))}{timingLabels[row.timingStatus] && ` · ${timingLabels[row.timingStatus]}`}</div>}
                {row.recordedAt && <div className="text-xs text-slate-500">Ghi nhận {dateTime.format(new Date(row.recordedAt))}</div>}
            </div>}
            {!hasExecution && !hasNotes && <span className="text-slate-400">—</span>}
        </div>
        {hasNotes && <details className="col-span-full rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-700">
            <summary className="w-fit cursor-pointer font-medium">{cancelled ? 'Chi tiết hủy lịch' : 'Hướng dẫn và ghi chú'}</summary>
            <dl className="mt-2 space-y-1.5 break-words">
                {row.instructions && <div><dt className="font-semibold">Hướng dẫn của Chuyên gia</dt><dd className="whitespace-pre-line">{row.instructions}</dd></div>}
                {row.varianceReason && <div><dt className="font-semibold">Lý do điều chỉnh</dt><dd className="whitespace-pre-line">{row.varianceReason}</dd></div>}
                {row.note && <div><dt className="font-semibold">Ghi chú thực hiện</dt><dd className="whitespace-pre-line">{row.note}</dd></div>}
                {cancelled && <div><dt className="font-semibold">Lý do không thực hiện</dt><dd className="whitespace-pre-line">{row.cancellationReason || 'Chưa có lý do'}</dd></div>}
                {row.cancelledAt && <div className="text-slate-500">{row.cancelledByName ?? 'Hệ thống'} · {dateTime.format(new Date(row.cancelledAt))}</div>}
            </dl>
        </details>}
    </article>;
};

const ProtocolExecutionSchedule = ({ detail }) => {
    const { id, seasonId, diseaseCaseId, protocolType, status, executionAnchor, executionDurationDays: duration = 0,
        executionRows, asOf } = detail;
    const treatment = protocolType === 'TREATMENT';
    const dayLabel = treatment ? 'Ngày điều trị' : 'DOC';
    const position = protocolDayPosition(executionAnchor, asOf ?? new Date(), duration, treatment);
    const [selected, setSelected] = useState(null);
    const [requestNo, setRequestNo] = useState(0);
    const [response, setResponse] = useState(null);
    const day = Math.min(selected ?? position.initial, Math.max(1, duration));
    const range = Math.floor((day - 1) / RANGE_SIZE);
    const first = range * RANGE_SIZE + 1;
    const end = Math.min(first + RANGE_SIZE - 1, duration);
    const markers = useMemo(() => protocolDayMarkers(executionRows ?? [], executionAnchor), [executionRows, executionAnchor]);
    const data = response?.day === day && response.requestNo === requestNo && response.asOf === asOf ? response : null;

    useEffect(() => {
        if (!duration) return undefined;
        const controller = new AbortController();
        const api = treatment ? expertTreatmentProtocolAPI : expertProductionProtocolAPI;
        api.day(treatment ? diseaseCaseId : seasonId, id, day, controller.signal)
            .then(({ data: envelope }) => {
                if (controller.signal.aborted) return;
                if (envelope?.data?.day !== day || !Array.isArray(envelope.data.rows)) {
                    throw new Error('Không thể đọc lịch theo ngày.');
                }
                setResponse({ day, requestNo, asOf, schedule: envelope.data });
            })
            .catch((error) => {
                if (!controller.signal.aborted) setResponse({ day, requestNo, asOf,
                    error: getErrorMessage(error, 'Không thể tải lịch theo từng cữ.') });
            });
        return () => controller.abort();
    }, [id, seasonId, diseaseCaseId, treatment, day, duration, requestNo, asOf]);

    if (!duration) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Phác đồ chưa có lịch theo cữ." />;
    const chooseRange = (value) => setSelected(value * RANGE_SIZE + 1);
    const dayTitle = `${dayLabel} ${day}`;
    return <div className="grid min-w-0 items-start gap-4 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-5">
        <nav className="min-w-0 rounded-xl border border-slate-200 bg-white" aria-label="Điều hướng lịch phác đồ">
            <div className="space-y-3 p-3">
                <div className="flex items-baseline justify-between gap-2">
                    <h3 className="m-0 font-semibold text-slate-900">Lịch phác đồ</h3>
                    <span className="text-xs text-slate-500">{duration} ngày</span>
                </div>
                <div>
                    <div className="flex gap-2">
                        <Button aria-label="Khoảng trước" icon={<LeftOutlined />} disabled={range === 0} onClick={() => chooseRange(range - 1)} />
                        <Select aria-label="Chọn khoảng ngày" className="min-w-0 flex-1" value={range} onChange={chooseRange}
                            options={Array.from({ length: Math.ceil(duration / RANGE_SIZE) }, (_, index) => ({
                                value: index, label: `${treatment ? 'Ngày' : 'DOC'} ${index * RANGE_SIZE + 1}–${Math.min((index + 1) * RANGE_SIZE, duration)}`,
                            }))} />
                        <Button aria-label="Khoảng sau" icon={<RightOutlined />} disabled={end === duration} onClick={() => chooseRange(range + 1)} />
                    </div>
                </div>
                <div>
                    <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-7 lg:grid-cols-1" role="group" aria-label="Ngày trong khoảng">
                        {Array.from({ length: end - first + 1 }, (_, index) => first + index).map((value) => {
                            const marker = markers.get(value);
                            const partial = status === 'ACTIVE' && marker?.completed > 0 &&
                                marker.completed + marker.cancelled < protocolExpectedItems(detail.stages ?? [], value);
                            const mark = marker && Object.keys(markerStyles).find((key) =>
                                marker[key] > 0 || (key === 'planned' && partial));
                            return <button type="button" key={value} aria-pressed={value === day}
                                className={`grid min-h-11 cursor-pointer items-center justify-items-center gap-0.5 rounded-md border px-2 py-1.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 lg:grid-cols-[1fr_auto_8px] lg:justify-items-start lg:gap-2 ${value === day
                                    ? 'border-blue-200 bg-blue-50 text-blue-800' : value === position.current
                                      ? 'border-teal-200 bg-teal-50 text-slate-800' : 'border-transparent bg-white text-slate-800 hover:bg-slate-50'}`}
                                onClick={() => setSelected(value)}>
                                <span>{treatment ? 'Ngày' : 'DOC'} {value}</span>
                                <span className="text-xs tabular-nums text-slate-500">{shortDate(protocolDayDate(executionAnchor, value))}</span>
                                {mark && <>
                                    <span aria-hidden="true" className="h-2 w-2 rounded-full"
                                        style={{ backgroundColor: markerStyles[mark][1] }} />
                                    <span className="sr-only">{markerStyles[mark][0]}</span>
                                </>}
                            </button>;
                        })}
                    </div>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1.5 border-t border-slate-100 pt-2.5 text-xs text-slate-600">
                    {Object.values(markerStyles).map(([label, color]) => <span key={label}>
                        <span className="me-1 inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />{label}
                    </span>)}
                </div>
            </div>
        </nav>
        <section className="min-w-0" aria-label={dayTitle}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <div>
                    <h3 className="m-0 text-lg font-semibold text-slate-900">{dayTitle}</h3>
                    {data?.schedule && <span className="text-xs text-slate-500">
                        {data.schedule.date && `${data.schedule.date.split('-').reverse().join('/')} · `}
                        Ngưỡng sai lệch ±{number.format(data.schedule.allowedVariancePct)}%
                    </span>}
                </div>
                <div className="flex items-center gap-2">
                    <Button aria-label="Ngày trước" icon={<LeftOutlined />} disabled={day === 1} onClick={() => setSelected(day - 1)} />
                    <Button aria-label="Ngày sau" icon={<RightOutlined />} disabled={day === duration} onClick={() => setSelected(day + 1)} />
                </div>
            </div>
            {!data ? <div className="grid min-h-36 place-items-center"><Spin aria-label="Đang tải lịch" /></div>
                : data.error ? <ErrorState message={data.error} onRetry={() => setRequestNo((value) => value + 1)} />
                : !data.schedule.rows.length ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có hạng mục trong ngày này." />
                : <div className="space-y-3">{protocolMeals(data.schedule.rows).map((group) => {
                    const current = protocolCurrentRows(group.rows);
                    const currentSet = new Set(current);
                    return <section key={group.key} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                        <header className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 px-3 py-2.5 sm:px-4">
                            <div>
                                <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-900">
                                    <ClockCircleOutlined className="text-blue-600" />
                                    {group.mealNumber == null ? 'Ngoài cữ ăn' : `Cữ ${group.mealNumber}`}
                                    <span className="font-medium tabular-nums text-slate-600">{mealTimeRange(group.time, current)}</span>
                                    <span className="text-xs font-normal text-slate-500">· {current.length} vật tư</span>
                                </div>
                            </div>
                            <MealBadges state={protocolMealState(current, status)} />
                        </header>
                        <div className={`${itemColumns} hidden border-t border-slate-100 px-4 py-2 text-xs font-medium text-slate-500 sm:grid`} aria-hidden="true">
                            <span>Vật tư</span><span>Kế hoạch</span><span>Thực dùng</span><span>Người và thời điểm</span>
                        </div>
                        {group.rows.map((row) => <ItemFacts key={row.scheduleId ?? row.itemId} row={row} replaced={!currentSet.has(row)} />)}
                    </section>;
                })}</div>}
        </section>
    </div>;
};

export default ProtocolExecutionSchedule;
