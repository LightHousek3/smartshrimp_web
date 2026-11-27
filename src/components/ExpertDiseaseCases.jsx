import { useEffect, useState, useMemo } from 'react';
import {
    Badge,
    Card,
    ConfigProvider,
    Flex,
    Select,
    Table,
    Tag,
    Typography,
} from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { expertDiseaseCaseAPI, expertSeasonAPI } from '../apis';
import Loading from './Loading';
import { getErrorMessage } from '../utils/errorMessage.js';
import { protocolError } from '../constants/productionProtocol';
import ErrorState from './ErrorState';
import ExpertListToolbar from './ExpertListToolbar';

const { Title, Paragraph, Text } = Typography;

const statusTone = {
    OPEN: 'bg-[#eaf4ff]! text-[#0f62b4]! [&_.ant-badge-status-dot]:bg-[#1d7ad6]!',
    WAITING_FOR_INFO: 'bg-[#fbf0dc]! text-[#a1600c]! [&_.ant-badge-status-dot]:bg-[#d98314]!',
    IN_TREATMENT: 'bg-[#fce9ed]! text-[#bb334f]! [&_.ant-badge-status-dot]:bg-[#d43b57]!',
    MONITORING: 'bg-[#efeafc]! text-[#5b3fb8]! [&_.ant-badge-status-dot]:bg-[#7b5bd6]!',
    RESOLVED: 'bg-[#e2f6f3]! text-[#0b7a70]! [&_.ant-badge-status-dot]:bg-[#0f9b8e]!',
};

const statusLabels = {
    OPEN: 'Mới',
    WAITING_FOR_INFO: 'Chờ bổ sung',
    IN_TREATMENT: 'Đang điều trị',
    MONITORING: 'Theo dõi',
    RESOLVED: 'Đã giải quyết',
};

const severityTone = {
    LOW: 'bg-[#eef1f6]! text-[#475569]! [&_.ant-badge-status-dot]:bg-[#94a3b8]!',
    MEDIUM: 'bg-[#fbf0dc]! text-[#a1600c]! [&_.ant-badge-status-dot]:bg-[#d98314]!',
    HIGH: 'bg-[#fce9ed]! text-[#bb334f]! [&_.ant-badge-status-dot]:bg-[#d43b57]!',
    CRITICAL: 'bg-[#d43b57]! text-[#ffffff]! [&_.ant-badge-status-dot]:bg-[#ffffff]!',
};

const severityLabels = {
    LOW: 'Thấp',
    MEDIUM: 'Trung bình',
    HIGH: 'Cao',
    CRITICAL: 'Nghiêm trọng',
};

const statusOptions = [
    { value: '', label: 'Tất cả trạng thái' },
    { value: 'action', label: 'Cần phản hồi' },
    { value: 'OPEN', label: 'Mới' },
    { value: 'IN_TREATMENT', label: 'Đang điều trị' },
    { value: 'MONITORING', label: 'Theo dõi' },
    { value: 'RESOLVED', label: 'Đã giải quyết' },
];

const severityOptions = [
    { value: 'CRITICAL', label: 'Nghiêm trọng' },
    { value: 'HIGH', label: 'Cao' },
    { value: 'MEDIUM', label: 'Trung bình' },
    { value: 'LOW', label: 'Thấp' },
];

const tableHeaderClassName =
    'h-11.5! border-b! border-[#e5e8f0]! bg-[#f8fafc]! px-4! py-3! text-[13px]! font-semibold! leading-5.25! text-[#6a7994]! @max-[1100px]:px-2! @max-[1100px]:text-xs!';
const tableCellClassName =
    'h-16.75! border-b! border-[#e5e8f0]! px-4! py-3! align-middle! text-[13px]! leading-5.25! @max-[1100px]:px-2!';
const primaryTextClassName = 'block! w-full! truncate! text-[13px]! leading-5.25! text-[#0f1c2e]!';
const secondaryTextClassName = 'block! w-full! truncate! text-[11.5px]! leading-4.75! text-[#6a7994]!';

const pillClassName = [
    'm-0! inline-flex! min-h-5! w-fit! max-w-full! self-start! items-center! gap-1.5!',
    'rounded-full! border-0! px-3! py-px! text-[10px]! font-semibold! leading-4.5! whitespace-nowrap!',
    '@max-[1300px]:gap-1! @max-[1300px]:px-2.5! @max-[1300px]:text-[9px]!',
].join(' ');

const tableClassName = [
    'w-full! min-w-0! pb-4!',
    '[&_.ant-table-content>table]:w-full!',
    '[&_.ant-table-content>table]:table-fixed!',
    '[&_.ant-table-thead>tr>th:first-child]:rounded-tl-[14px]!',
    '[&_.ant-table-thead>tr>th:last-child]:rounded-tr-[14px]!',
    '[&_.ant-table-column-sorters]:gap-1!',
    '[&_.ant-table-column-sorter]:ms-0!',
    '[&_.ant-table-column-sorter]:shrink-0!',
    '[&_.ant-table-pagination]:m-0!',
    '[&_.ant-table-pagination]:min-h-13!',
    '[&_.ant-table-pagination]:gap-y-2!',
    '[&_.ant-table-pagination]:px-4!',
    '[&_.ant-table-pagination]:pt-4!',
    '[&_.ant-table-pagination]:pb-0!',
    '[&_.ant-pagination-total-text]:mr-2!',
    '[&_.ant-pagination-total-text]:h-9!',
    '[&_.ant-pagination-total-text]:text-[13px]!',
    '[&_.ant-pagination-total-text]:leading-8.5!',
    '[&_.ant-pagination-item]:h-9!',
    '[&_.ant-pagination-item]:min-w-9!',
    '[&_.ant-pagination-item]:rounded-[10px]!',
    '[&_.ant-pagination-item]:leading-8.5!',
    '[&_.ant-pagination-prev]:h-9!',
    '[&_.ant-pagination-prev]:min-w-9!',
    '[&_.ant-pagination-next]:h-9!',
    '[&_.ant-pagination-next]:min-w-9!',
    '[&_.ant-pagination-options]:ml-4!',
    '[&_.ant-pagination-options-size-changer]:h-9!',
    '[&_.ant-pagination-options-size-changer]:w-24.5!',
].join(' ');

const caseTheme = {
    token: {
        colorPrimary: '#1d7ad6',
        colorText: 'rgba(15,28,46,0.88)',
        colorTextPlaceholder: 'rgba(15,28,46,0.25)',
        colorBorder: '#e5e8f0',
        borderRadius: 10,
        controlHeight: 36,
        fontSize: 13,
        lineHeight: 21 / 13,
    },
    components: {
        Table: {
            headerBg: '#f8fafc',
            headerColor: '#6a7994',
            headerSplitColor: '#eef1f7',
            borderColor: '#e5e8f0',
            rowHoverBg: '#fbfdff',
            cellPaddingBlock: 12,
            cellPaddingInline: 16,
        },
        Pagination: { itemSize: 36 },
        Input: { paddingBlock: 6.5, paddingInline: 11 },
        Select: { optionFontSize: 13 },
    },
};


const StatusPill = ({ tone, children, dot = true }) => (
    <Tag
        className={`${pillClassName} ${tone || ''}`}
        style={{ borderRadius: 9999 }}
    >
        {dot && (
            <Badge
                color="currentColor"
                className="inline-flex! w-1.5! shrink-0! items-center! [&_.ant-badge-status-dot]:size-1.5!"
            />
        )}
        <Text
            className="min-w-0! text-[length:inherit]! text-inherit! font-semibold! leading-4.5!"
            ellipsis={{ tooltip: children }}
        >
            {children}
        </Text>
    </Tag>
);

const fmtRelative = (isoString) => {
    if (!isoString) return '—';
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;

    return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
};

/** Keep season-scoped case loading separate from the filters used on the assigned-case page. */
const DiseaseCaseList = ({ seasonId }) => {
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [farmError, setFarmError] = useState(null);
    const [attempt, setAttempt] = useState(0);
    const [cases, setCases] = useState([]);
    const [total, setTotal] = useState(0);
    const [farms, setFarms] = useState([]);
    const [searchInput, setSearchInput] = useState('');

    const [filters, setFilters] = useState({
        page: 1,
        limit: 10,
        status: '',
        severity: [],
        farmId: '',
        search: '',
    });

    useEffect(() => {
        if (seasonId) return;
        const controller = new AbortController();
        const fetchFarms = async () => {
            try {
                const res = await expertSeasonAPI.getAssignedSeasons({ limit: 10 }, controller.signal);
                if (controller.signal.aborted) return;
                if (!Array.isArray(res.data?.meta?.farms)) throw new Error('Dữ liệu trang trại không hợp lệ.');
                setFarms(res.data.meta.farms);
                setFarmError(null);
            } catch (err) {
                if (!controller.signal.aborted) {
                    setFarmError(getErrorMessage(err, 'Không thể tải danh sách trang trại.'));
                }
            }
        };
        fetchFarms();
        return () => controller.abort();
    }, [seasonId, attempt]);

    // Debounce search input
    useEffect(() => {
        const normalized = searchInput.trim();
        if (normalized === filters.search) return;

        const timer = setTimeout(() => {
            setLoading(true);
            setFilters((prev) => ({ ...prev, search: normalized, page: 1 }));
        }, 300);
        return () => clearTimeout(timer);
    }, [searchInput, filters.search]);

    useEffect(() => {
        const controller = new AbortController();
        const params = {
            page: seasonId ? 1 : filters.page,
            limit: seasonId ? 100 : filters.limit,
            ...(seasonId ? { seasonId } : {}),
            ...(filters.status ? { status: filters.status } : {}),
            ...(filters.severity?.length > 0 ? { severity: filters.severity.join(',') } : {}),
            ...(filters.farmId ? { farmId: filters.farmId } : {}),
            ...(filters.search ? { search: filters.search } : {}),
        };

        /** Publish the complete season case list only after every requested page succeeds. */
        const load = async () => {
            const response = await expertDiseaseCaseAPI.list(params, controller.signal);
            const rows = [...(response.data.data || [])];
            const count = response.data.meta?.total || 0;
            // The season tab has no pagination controls; collect every API page before displaying it.
            if (seasonId) {
                for (let page = 2; page <= Math.ceil(count / params.limit); page += 1) {
                    if (controller.signal.aborted) return;
                    const next = await expertDiseaseCaseAPI.list({ ...params, page }, controller.signal);
                    rows.push(...next.data.data);
                }
            }
            if (controller.signal.aborted) return;
            setError(null);
            setCases(rows);
            setTotal(count);
        };
        load()
            .catch((error) => {
                if (controller.signal.aborted) return;
                setError(protocolError(error));
            })
            .finally(() => {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            });

        return () => controller.abort();
    }, [seasonId, filters, attempt]);

    const rawColumns = useMemo(
        () => [
            {
                title: 'Mức độ',
                dataIndex: 'severity',
                key: 'severity',
                width: 120,
                render: (sev) => (
                    <StatusPill tone={severityTone[sev]}>
                        {severityLabels[sev] || sev}
                    </StatusPill>
                ),
            },
            {
                title: 'Ca bệnh',
                dataIndex: 'title',
                key: 'title',
                width: 300,
                render: (title, record) => (
                    <div className="flex items-center gap-2 min-w-0">
                        <Text
                            className={`${primaryTextClassName} font-semibold! hover:text-[#1d7ad6] transition-colors`}
                            ellipsis={{ tooltip: title }}
                        >
                            {title}
                        </Text>
                        {record.needsResponse && (
                            <span
                                className="size-1.5 rounded-full bg-[#1d7ad6] shrink-0"
                                title="Cần phản hồi"
                            />
                        )}
                    </div>
                ),
            },
            {
                title: 'Vụ · Ao',
                key: 'seasonPond',
                width: 220,
                render: (_, record) => {
                    const pondName = record.season?.pond?.name || 'Ao';
                    const seasonTitle = record.season?.name ? record.season.name.split(' — ')[0] : 'Vụ nuôi';
                    const farmName = record.season?.pond?.farm?.name || record.season?.farm?.name || 'Trang trại';

                    return (
                        <Flex vertical gap={0} className="min-w-0">
                            <Text
                                className={primaryTextClassName}
                                ellipsis={{
                                    tooltip: `${pondName} — ${seasonTitle}`,
                                }}
                            >
                                {pondName} — {seasonTitle}
                            </Text>
                            <Text
                                className={secondaryTextClassName}
                                ellipsis={{
                                    tooltip: farmName,
                                }}
                            >
                                {farmName}
                            </Text>
                        </Flex>
                    );
                },
            },
            {
                title: 'Trạng thái',
                dataIndex: 'status',
                key: 'status',
                width: 130,
                render: (st) => (
                    <StatusPill tone={statusTone[st]}>
                        {statusLabels[st] || st}
                    </StatusPill>
                ),
            },
            {
                title: 'Báo bởi',
                key: 'reporter',
                width: 130,
                render: (_, record) => (
                    <Text className={primaryTextClassName} ellipsis={{ tooltip: record.reporter?.fullName }}>
                        {record.reporter?.fullName || '—'}
                    </Text>
                ),
            },
            {
                title: 'Cập nhật',
                dataIndex: 'updatedAt',
                key: 'updatedAt',
                width: 110,
                sorter: (a, b) => new Date(a.updatedAt || a.createdAt) - new Date(b.updatedAt || b.createdAt),
                render: (updatedAt, record) => (
                    <Text className={secondaryTextClassName}>
                        {fmtRelative(updatedAt || record.createdAt)}
                    </Text>
                ),
            },
            {
                title: '',
                key: 'action',
                width: 48,
                align: 'center',
                render: (_, record) => (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/expert/disease-cases/${record.id}`);
                        }}
                        className="inline-flex size-7 items-center justify-center rounded-full text-[#1d7ad6] hover:bg-blue-50 focus-visible:outline-2 cursor-pointer transition-colors border-0 bg-transparent p-0"
                        title="Xem chi tiết"
                        aria-label={`Xem chi tiết ca bệnh ${record.title || record.id}`}
                    >
                        <EyeOutlined className="text-[13px]" />
                    </button>
                ),
            },
        ],
        [navigate],
    );

    const columns = useMemo(
        () =>
            rawColumns.filter(column => !seasonId || column.key !== 'seasonPond').map((column, _index, allColumns) => ({
                ...column,
                // Preserve proportions at every available width
                width: `${(column.width / allColumns.reduce((total, item) => total + item.width, 0)) * 100}%`,
                onHeaderCell: () => ({ className: tableHeaderClassName }),
                onCell: () => ({ className: tableCellClassName }),
            })),
        [rawColumns, seasonId],
    );

    const loadError = error || (seasonId ? null : farmError);

    return (
        <ConfigProvider theme={caseTheme}>
            <Flex vertical gap={0} className="w-full! min-w-0!">
                {!seasonId && <Flex vertical gap={0} className="w-full! min-w-0!">
                    <Title
                        level={1}
                        className="m-0! font-['Sora','Plus_Jakarta_Sans',sans-serif]! text-[22px]! leading-6.875! font-bold! text-[#0f1c2e]!"
                    >
                        Ca bệnh được giao
                    </Title>
                    <Paragraph className="mb-0! mt-1! text-[13px]! leading-5.25! text-[#6a7994]!">
                        Ưu tiên theo mức độ nghiêm trọng. “Cần phản hồi” là các ca mà tin nhắn cuối đến từ Kỹ thuật viên hoặc chưa có đánh giá của bạn.
                    </Paragraph>
                </Flex>}

                <Card
                    className={`@container ${seasonId ? '' : 'mt-5!'} w-full! min-w-0! rounded-[14px]! border-[#e5e8f0]! bg-white! shadow-[0_1px_1px_rgba(15,28,46,0.04)]! [&>.ant-card-body]:p-0!`}
                    aria-label={seasonId ? 'Danh sách ca bệnh của vụ nuôi' : 'Danh sách ca bệnh được giao'}
                    role="region"
                >
                    {!seasonId && <ExpertListToolbar
                        searchProps={{
                            placeholder: 'Mã ca, tiêu đề, ao, kỹ thuật viên…',
                            'aria-label': 'Tìm theo mã ca, tiêu đề, ao hoặc kỹ thuật viên',
                            value: searchInput,
                            onChange: (event) => setSearchInput(event.target.value),
                        }}
                    >
                        <Select
                            allowClear
                            value={filters.status}
                            onChange={(val) => {
                                setLoading(true);
                                setFilters((prev) => ({ ...prev, status: val || '', page: 1 }));
                            }}
                            className="w-44!"
                            aria-label="Lọc trạng thái"
                            placeholder="Tất cả trạng thái"
                            options={statusOptions}
                        />

                        <Select
                            mode="multiple"
                            allowClear
                            maxTagCount="responsive"
                            aria-label="Lọc mức độ"
                            placeholder="Mức độ"
                            value={filters.severity}
                            onChange={(val) => {
                                setLoading(true);
                                setFilters((prev) => ({ ...prev, severity: val || [], page: 1 }));
                            }}
                            className="w-44!"
                            options={severityOptions}
                        />

                        <Select
                            allowClear
                            aria-label="Lọc trang trại"
                            placeholder="Trang trại"
                            value={filters.farmId || undefined}
                            onChange={(val) => {
                                setLoading(true);
                                setFilters((prev) => ({ ...prev, farmId: val || '', page: 1 }));
                            }}
                            className="w-56!"
                            options={farms.map((f) => ({ value: f.id, label: f.name }))}
                        />
                    </ExpertListToolbar>}

                    {loading ? <Loading className="min-h-90! w-full!" tip="Đang tải danh sách ca bệnh" />
                        : loadError ? <ErrorState message={loadError} onRetry={() => {
                            setLoading(true);
                            setAttempt(value => value + 1);
                        }} /> : <Table
                        rowKey="id"
                        dataSource={cases}
                        columns={columns}
                        className={tableClassName}
                        onRow={(record) => ({
                            tabIndex: 0,
                            'aria-label': `Xem chi tiết ca bệnh ${record.title || record.id}`,
                            onClick: () => navigate(`/expert/disease-cases/${record.id}`),
                            onKeyDown: event => {
                                if (event.target === event.currentTarget && event.key === 'Enter') navigate(`/expert/disease-cases/${record.id}`);
                            },
                            className: 'cursor-pointer hover:bg-[#fbfdff] transition-colors',
                        })}
                        pagination={seasonId ? false : {
                            current: filters.page,
                            pageSize: filters.limit,
                            total,
                            showSizeChanger: true,
                            pageSizeOptions: ['10', '20', '50'],
                            onChange: (page, limit) => { setLoading(true); setFilters((prev) => ({ ...prev, page, limit })); },
                            showTotal: (totalCount) => (
                                <span className="text-[13px] text-[#6a7994]">
                                    {totalCount} ca
                                </span>
                            ),
                        }}
                        locale={{
                            emptyText:
                                filters.status === 'action'
                                    ? 'Không có ca nào cần phản hồi'
                                    : seasonId
                                        ? 'Chưa có ca bệnh trong vụ nuôi này'
                                        : 'Không có ca phù hợp',
                        }}
                    />}
                </Card>
            </Flex>
        </ConfigProvider>
    );
};

/** Reset filters and cancel pending requests before showing another season's cases. */
const ExpertDiseaseCases = ({ seasonId }) => <DiseaseCaseList key={seasonId || 'assigned'} seasonId={seasonId} />;

export default ExpertDiseaseCases;
