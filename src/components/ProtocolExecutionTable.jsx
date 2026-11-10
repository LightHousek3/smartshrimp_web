import { useMemo, useState } from 'react';
import { DatePicker, Input, Select, Space, Table, Tag, Typography } from 'antd';
import { filterExecutionRows, treatmentDay } from '../utils/protocolExecutionUtils';
import { DOSE_LABELS, UNIT_LABELS } from '../constants/productionProtocol';

const dateText = value => value ? new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : '—';
const timing = { ON_TIME: ['Đúng giờ', 'green'], EARLY: ['Làm sớm', 'orange'], LATE: ['Làm muộn', 'red'],
    OVERDUE: ['Quá hạn chưa làm', 'red'], PENDING: ['Chưa làm', 'blue'], CANCELLED: ['Đã hủy', 'default'], UNKNOWN: ['Chưa đủ dữ liệu giờ', 'default'] };
const options = [ ['ALL', 'Tất cả'], ['QUANTITY', 'Lệch lượng'], ['THRESHOLD', 'Vượt ngưỡng'],
    ['TIMING', 'Lệch giờ'], ['UNEXECUTED', 'Chưa thực hiện'], ['CANCELLED', 'Đã hủy'] ].map(([value, label]) => ({ value, label }));

/** All tab interactions use the detail snapshot. Refresh belongs to the enclosing detail action. */
const ProtocolExecutionTable = ({ rows = [], asOf, coverage, treatmentStartAt }) => {
    const [search, setSearch] = useState('');
    const [kind, setKind] = useState('ALL');
    const [meal, setMeal] = useState('ALL');
    const [range, setRange] = useState(null);
    const [page, setPage] = useState(1);
    const filtered = useMemo(() => filterExecutionRows(rows, { search, kind, meal,
        startDate: range?.[0]?.format('YYYY-MM-DD'), endDate: range?.[1]?.format('YYYY-MM-DD') }), [rows, search, kind, meal, range]);
    const meals = [...new Set(rows.map(row => row.mealNumber == null ? 'ENVIRONMENT' : String(row.mealNumber)))];
    const columns = [
        { title: 'Lịch dự kiến / hạn', key: 'plan', width: 190, sorter: (a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt),
            render: (_, row) => <>{treatmentStartAt && <div>Ngày điều trị {treatmentDay(row.scheduledAt, treatmentStartAt)}</div>}
                <div>{row.mealNumber == null ? 'Ngoài cữ ăn' : `Cữ ${row.mealNumber}`} · {dateText(row.scheduledAt)}</div><Typography.Text type="secondary">Hạn: {dateText(row.timing?.dueAt)}</Typography.Text></> },
        { title: 'Vật tư / lượng', key: 'quantity', width: 230, render: (_, row) => <>
            <div>{row.plannedProduct?.name || 'Chưa xác định vật tư'}</div>
            <div>Kế hoạch: {row.plannedQuantity} {UNIT_LABELS[row.unit] || row.unit}</div>
            <div>Thực dùng: {row.actualQuantity ?? '—'} {row.actualQuantity != null && (UNIT_LABELS[row.unit] || row.unit)}</div>
            {row.actualProduct && row.actualProduct.id !== row.plannedProduct?.id && <Tag color="red">Khác vật tư kế hoạch: {row.actualProduct.name}</Tag>}
            {row.quantityComparison?.deviated && <Tag color={row.quantityComparison.exceedsThreshold ? 'red' : 'orange'}>
                Lệch {Number(row.quantityComparison.percentage).toLocaleString('vi-VN', { maximumFractionDigits: 6 })}%
                {row.quantityComparison.exceedsThreshold ? ' · Vượt ngưỡng' : ''}</Tag>}
        </> },
        { title: 'Thực hiện', key: 'execution', width: 200, render: (_, row) => {
            const [label, color] = timing[row.timing?.status] || timing.UNKNOWN;
            return <><Tag color={color}>{label}</Tag><div>{row.executor?.fullName || '—'}</div>
                <div>Thực dùng: {dateText(row.executedAt)}</div><Typography.Text type="secondary">Nhập: {dateText(row.recordedAt)}</Typography.Text></>;
        } },
        { title: 'Lý do / ghi chú', key: 'reason', width: 220, render: (_, row) => <>
            <div>{row.varianceReason || row.cancellationReason || '—'}</div><div>{row.note}</div>
            {row.cancellationType && <Typography.Text type="secondary">Lịch đã hủy</Typography.Text>}
        </> },
    ];
    return <>
        <Space wrap className="mb-4">
            <Input aria-label="Tìm dữ liệu thực hiện" placeholder="Vật tư, KTV, lý do…" value={search}
                onChange={event => { setSearch(event.target.value); setPage(1); }} allowClear />
            <Select aria-label="Lọc thực hiện" value={kind} options={options} className="min-w-44"
                onChange={value => { setKind(value); setPage(1); }} />
            <Select aria-label="Lọc cữ" value={meal} className="min-w-36"
                options={[{ value: 'ALL', label: 'Mọi cữ' }, ...meals.map(value => ({ value, label: value === 'ENVIRONMENT' ? 'Ngoài cữ ăn' : `Cữ ${value}` }))]}
                onChange={value => { setMeal(value); setPage(1); }} />
            <DatePicker.RangePicker onChange={value => { setRange(value); setPage(1); }} format="DD/MM/YYYY" />
        </Space>
        <Typography.Paragraph type="secondary">
            Dữ liệu tại {dateText(asOf)} · {filtered.length}/{rows.length} lịch đã sinh.
            {coverage && ` Toàn liệu trình: ${coverage.acceptedCount}/${coverage.expectedCount} lần đạt điều kiện hoàn tất.`}
        </Typography.Paragraph>
        <Table rowKey="id" dataSource={filtered} columns={columns} scroll={{ x: 850 }}
            locale={{ emptyText: 'Không có lịch phù hợp với bộ lọc.' }}
            pagination={{ current: page, defaultPageSize: 20, showSizeChanger: true, onChange: setPage }}
            expandable={{ expandedRowRender: row => <Space direction="vertical">
                <span>Chỉ dẫn: {row.instructions || '—'}</span>
                <span>Cơ sở tính: {DOSE_LABELS[row.doseBasis] || '—'} · {row.doseValue ?? '—'}; căn cứ {row.basisQuantity ?? '—'} {row.basisUnit === 'kg_biomass' ? 'kg sinh khối' : row.basisUnit === 'm3_water' ? 'm³ nước' : ''}</span>
                <span>Nguồn sinh khối: {row.sourceHealthLog ? `${row.sourceHealthLog.estimatedBiomassKg} kg · ghi nhận ${dateText(row.sourceHealthLog.recordedAt)}${row.sourceHealthLog.isVoided ? ' · Đã vô hiệu sau khi lập lịch' : ''}` : row.sourceHealthLogId ? 'Nguồn lịch sử' : 'Không áp dụng'} · Tính lúc {dateText(row.calculatedAt)}</span>
            </Space> }} />
    </>;
};

export default ProtocolExecutionTable;
