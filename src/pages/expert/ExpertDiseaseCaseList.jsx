import { useEffect, useState, useMemo } from 'react';
import {
    App,
    Badge,
    Card,
    ConfigProvider,
    Flex,
    Input,
    Select,
    Table,
    Tag,
    Typography,
} from 'antd';
import { EyeOutlined, SearchOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { expertDiseaseCaseAPI, expertSeasonAPI } from '../../apis';

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
    { value: 'WAITING_FOR_INFO', label: 'Chờ bổ sung' },
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
const monoClassName = "font-['JetBrains_Mono',monospace]!";

const pillClassName = [
    'm-0! inline-flex! min-h-5! w-fit! max-w-full! self-start! items-center! gap-1.5!',
    'rounded-full! border-0! px-3! py-px! text-[10px]! font-semibold! leading-4.5! whitespace-nowrap!',
    '@max-[1300px]:gap-1! @max-[1300px]:px-2.5! @max-[1300px]:text-[9px]!',
].join(' ');

const filterClassName = [
    'h-9! max-w-full!',
    '[&_.ant-select-selector]:rounded-[10px]!',
    '[&_.ant-select-selector]:border-[#e5e8f0]!',
    '[&_.ant-select-selector]:px-2.75!',
    '[&_.ant-select-arrow]:text-[10px]!',
    '[&_.ant-select-arrow]:text-[#8796ae]!',
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

const toolbarClassName =
    'min-h-15.25! w-full! items-center! gap-2! rounded-t-[14px]! border-b! border-[#eef1f7]! px-4! py-3!';

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

const ExpertDiseaseCaseList = () => {
    const navigate = useNavigate();
    const { message } = App.useApp();

    const [loading, setLoading] = useState(true);
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
        let isMounted = true;
        const fetchFarms = async () => {
            try {
                const res = await expertSeasonAPI.getAssignedSeasons({ limit: 10 });
                if (isMounted && res.data?.meta?.farms) {
                    setFarms(res.data.meta.farms);
                }
            } catch (err) {
                if (isMounted) {
                    console.error('Lỗi lấy danh sách trang trại:', err);
                }
            }
        };
        fetchFarms();
        return () => {
            isMounted = false;
        };
    }, []);

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
            page: filters.page,
            limit: filters.limit,
            ...(filters.status ? { status: filters.status } : {}),
            ...(filters.severity?.length > 0 ? { severity: filters.severity.join(',') } : {}),
            ...(filters.farmId ? { farmId: filters.farmId } : {}),
            ...(filters.search ? { search: filters.search } : {}),
        };

        expertDiseaseCaseAPI
            .list(params, controller.signal)
            .then((response) => {
                if (controller.signal.aborted) return;
                if (response.data?.success) {
                    setCases(response.data.data || []);
                    setTotal(response.data.meta?.total || 0);
                }
            })
            .catch((error) => {
                if (controller.signal.aborted) return;
                console.error('Lỗi lấy danh sách ca bệnh:', error);
                message.error(error.response?.data?.message || 'Không thể tải danh sách ca bệnh');
            })
            .finally(() => {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            });

        return () => controller.abort();
    }, [filters, message]);

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
                render: (title, record) => {
                    const code = `DC-${record.id.slice(0, 4).toUpperCase()}`;
                    const doc = record.caseSnapshot?.doc;
                    const ai = record.caseSnapshot?.aiDiagnosis;

                    return (
                        <Flex vertical gap={0} className="min-w-0">
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
                            <Text className={`${secondaryTextClassName} ${monoClassName}`} ellipsis>
                                {code}
                                {doc != null && ` · DOC ${doc}`}
                                {ai && ` · AI: ${ai.disease || ai.label} ${Math.round(ai.confidence <= 1 ? ai.confidence * 100 : ai.confidence)}%`}
                            </Text>
                        </Flex>
                    );
                },
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
            rawColumns.map((column, _index, allColumns) => ({
                ...column,
                // Preserve proportions at every available width
                width: `${(column.width / allColumns.reduce((total, item) => total + item.width, 0)) * 100}%`,
                onHeaderCell: () => ({ className: tableHeaderClassName }),
                onCell: () => ({ className: tableCellClassName }),
            })),
        [rawColumns],
    );

    return (
        <ConfigProvider theme={caseTheme}>
            <Flex vertical gap={0} className="w-full! min-w-0!">
                {/* Header matching Figma Frame 13:2 & ExpertSeasonList */}
                <Flex vertical gap={0} className="w-full! min-w-0!">
                    <Title
                        level={1}
                        className="m-0! font-['Sora','Plus_Jakarta_Sans',sans-serif]! text-[22px]! leading-6.875! font-bold! text-[#0f1c2e]!"
                    >
                        Ca bệnh được giao
                    </Title>
                    <Paragraph className="mb-0! mt-1! text-[13px]! leading-5.25! text-[#6a7994]!">
                        Ưu tiên theo mức độ nghiêm trọng. “Cần phản hồi” là các ca mà tin nhắn cuối đến từ KTV hoặc chưa có đánh giá của bạn.
                    </Paragraph>
                </Flex>

                <Card
                    className="@container mt-5! w-full! min-w-0! rounded-[14px]! border-[#e5e8f0]! bg-white! shadow-[0_1px_1px_rgba(15,28,46,0.04)]! [&>.ant-card-body]:p-0!"
                    aria-label="Danh sách ca bệnh được giao"
                    role="region"
                >
                    {/* Toolbar matching ExpertSeasonList */}
                    <Flex wrap align="center" className={toolbarClassName}>
                        <Input
                            allowClear
                            prefix={<SearchOutlined className="text-[13px] text-[#8796ae]" />}
                            placeholder="Mã ca, tiêu đề, ao, KTV…"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            className="h-full! w-64! min-w-0! max-w-full! shrink-0! rounded-[10px]! border-[#e5e8f0]! px-2.75! py-1.625! text-[13px]! [&_.ant-input]:text-[13px]!"
                        />

                        <Flex
                            wrap
                            gap={8}
                            className="ml-auto! min-w-0! max-w-full! max-[650px]:ml-0! max-[650px]:w-full!"
                        >
                            <Select
                                allowClear
                                value={filters.status}
                                onChange={(val) => {
                                    setLoading(true);
                                    setFilters((prev) => ({ ...prev, status: val || '', page: 1 }));
                                }}
                                className={`${filterClassName} w-44!`}
                                placeholder="Tất cả trạng thái"
                                options={statusOptions}
                            />

                            <Select
                                mode="multiple"
                                allowClear
                                maxTagCount="responsive"
                                placeholder="Mức độ"
                                value={filters.severity}
                                onChange={(val) => {
                                    setLoading(true);
                                    setFilters((prev) => ({ ...prev, severity: val || [], page: 1 }));
                                }}
                                className={`${filterClassName} w-40!`}
                                options={severityOptions}
                            />

                            <Select
                                allowClear
                                placeholder="Trang trại"
                                value={filters.farmId || undefined}
                                onChange={(val) => {
                                    setLoading(true);
                                    setFilters((prev) => ({ ...prev, farmId: val || '', page: 1 }));
                                }}
                                className={`${filterClassName} w-44!`}
                                options={farms.map((f) => ({ value: f.id, label: f.name }))}
                            />
                        </Flex>
                    </Flex>

                    <Table
                        rowKey="id"
                        dataSource={cases}
                        columns={columns}
                        loading={loading}
                        className={tableClassName}
                        onRow={(record) => ({
                            onClick: () => navigate(`/expert/disease-cases/${record.id}`),
                            className: 'cursor-pointer hover:bg-[#fbfdff] transition-colors',
                        })}
                        pagination={{
                            current: filters.page,
                            pageSize: filters.limit,
                            total,
                            showSizeChanger: true,
                            pageSizeOptions: ['10', '20', '50'],
                            onChange: (page, limit) => setFilters((prev) => ({ ...prev, page, limit })),
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
                                    : 'Không có ca phù hợp',
                        }}
                    />
                </Card>
            </Flex>
        </ConfigProvider>
    );
};

export default ExpertDiseaseCaseList;
