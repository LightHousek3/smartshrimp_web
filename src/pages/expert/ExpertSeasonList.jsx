import { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Badge,
    Button,
    Card,
    ConfigProvider,
    Empty,
    Flex,
    Input,
    Select,
    Table,
    Tag,
    Typography,
} from 'antd';
import { EyeOutlined, SearchOutlined } from '@ant-design/icons';
import { expertSeasonAPI } from '../../apis';
import Loading from '../../components/Loading';

const { Paragraph, Text, Title } = Typography;

const statusOptions = [
    { value: 'ACTIVE', label: 'Đang nuôi' },
    { value: 'PLANNING', label: 'Chuẩn bị' },
    { value: 'COMPLETED', label: 'Hoàn tất' },
    { value: 'CANCELLED', label: 'Đã hủy' },
];
const shrimpOptions = [
    { value: 'WHITELEG', label: 'Tôm thẻ chân trắng' },
    { value: 'BLACK_TIGER', label: 'Tôm sú' },
];
const protocolLabels = {
    DRAFT: 'Bản nháp',
    PENDING_APPROVAL: 'Chờ duyệt',
    APPROVED: 'Đang áp dụng',
    REJECTED: 'Bị từ chối',
    SUPERSEDED: 'Đã thay thế',
    CANCELLED: 'Đã hủy',
    ABORTED: 'Đã dừng',
};
const statusTone = {
    ACTIVE: 'bg-[#eaf4ff]! text-[#0f62b4]! [&_.ant-badge-status-dot]:bg-[#1d7ad6]!',
    PLANNING: 'bg-[#efeafc]! text-[#5b3fb8]! [&_.ant-badge-status-dot]:bg-[#7b5bd6]!',
    COMPLETED: 'bg-[#e2f6f3]! text-[#0b7a70]! [&_.ant-badge-status-dot]:bg-[#0f9b8e]!',
    CANCELLED: 'bg-[#eef1f6]! text-[#475569]! [&_.ant-badge-status-dot]:bg-[#94a3b8]!',
};
const protocolTone = {
    DRAFT: 'bg-[#eef1f6]! text-[#475569]! [&_.ant-badge-status-dot]:bg-[#94a3b8]!',
    PENDING_APPROVAL: 'bg-[#fbf0dc]! text-[#a1600c]! [&_.ant-badge-status-dot]:bg-[#d98314]!',
    APPROVED: 'bg-[#e2f6f3]! text-[#0b7a70]! [&_.ant-badge-status-dot]:bg-[#0f9b8e]!',
    REJECTED: 'bg-[#fce9ed]! text-[#bb334f]! [&_.ant-badge-status-dot]:bg-[#d43b57]!',
    SUPERSEDED: 'bg-[#eef1f6]! text-[#475569]! [&_.ant-badge-status-dot]:bg-[#94a3b8]!',
    CANCELLED: 'bg-[#eef1f6]! text-[#475569]! [&_.ant-badge-status-dot]:bg-[#94a3b8]!',
    ABORTED: 'bg-[#eef1f6]! text-[#475569]! [&_.ant-badge-status-dot]:bg-[#94a3b8]!',
};
// Trailing ! is Tailwind v4's important modifier; Ant Design resets must not erase layout.
const tableHeaderClassName =
    'h-11.5! border-b! border-[#e5e8f0]! bg-[#f8fafc]! px-4! py-3! text-[13px]! font-semibold! leading-5.25! text-[#6a7994]! @max-[1100px]:px-2! @max-[1100px]:text-xs!';
const tableCellClassName =
    'h-16.75! border-b! border-[#e5e8f0]! px-4! py-3! align-middle! text-[13px]! leading-5.25! @max-[1100px]:px-2!';
const primaryTextClassName = 'block! w-full! text-[13px]! leading-5.25! text-[#0f1c2e]!';
const secondaryTextClassName = 'block! w-full! text-[11.5px]! leading-4.75! text-[#6a7994]!';
const dateTextClassName = 'block! w-full! text-[11px]! leading-4.5! text-[#6a7994]!';
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
// Scope the screenshot's control sizes and colors to this page.
const seasonTheme = {
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
const dateLabel = (value) => (value ? value.split('-').reverse().join('/') : '—');
const initialFilters = { search: '', status: undefined, farmId: undefined, shrimpType: undefined };

const SeasonPill = ({ tone, children, dot = true }) => (
    <Tag className={`${pillClassName} ${tone || ''}`}>
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

const ExpertSeasonList = () => {
    const [filters, setFilters] = useState(initialFilters);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [revision, setRevision] = useState(0);
    const [state, setState] = useState({ loading: true, rows: [], meta: null, error: null });

    useEffect(() => {
        const normalizedSearch = search.trim();
        if (normalizedSearch === filters.search) return;

        const timer = setTimeout(() => {
            setFilters((current) => ({ ...current, search: normalizedSearch }));
            setPage(1);
            setState((current) => ({ ...current, loading: true, error: null }));
        }, 300);
        return () => clearTimeout(timer);
    }, [search, filters.search]);

    useEffect(() => {
        const controller = new AbortController();
        const params = { ...filters, page, limit };
        expertSeasonAPI
            .getAssignedSeasons(params, controller.signal)
            .then(({ data }) => {
                if (controller.signal.aborted) return;
                if (
                    !Array.isArray(data?.data) ||
                    !Number.isInteger(data?.meta?.totalResults) ||
                    !Array.isArray(data?.meta?.farms)
                )
                    throw new Error('Dữ liệu vụ nuôi không hợp lệ.');
                setState({ loading: false, rows: data.data, meta: data.meta, error: null });
            })
            .catch((error) => {
                if (controller.signal.aborted) return;
                setState((current) => ({
                    ...current,
                    loading: false,
                    error:
                        error.response?.data?.message ||
                        (error.message === 'Dữ liệu vụ nuôi không hợp lệ.'
                            ? error.message
                            : 'Không thể tải danh sách vụ nuôi.'),
                }));
            });
        return () => controller.abort();
    }, [filters, page, limit, revision]);

    const changeFilter = (key, value) => {
        setFilters((current) => ({ ...current, [key]: value }));
        setPage(1);
        setState((current) => ({ ...current, loading: true, error: null }));
    };
    const handleTableChange = (pagination, _filters, _sorter, { action }) => {
        // Ant Design sorts the loaded rows locally; only pagination changes request another page.
        if (action !== 'paginate') return;
        if (pagination.current === page && pagination.pageSize === limit) return;

        setPage(pagination.pageSize === limit ? pagination.current : 1);
        setLimit(pagination.pageSize);
        setState((current) => ({ ...current, loading: true, error: null }));
    };

    const columns = useMemo(
        () =>
            [
                {
                    title: 'Vụ nuôi',
                    key: 'name',
                    dataIndex: 'name',
                    width: 261,
                    sorter: (first, second) =>
                        first.name.localeCompare(second.name, 'vi', {
                            numeric: true,
                            sensitivity: 'base',
                        }),
                    render: (name) => (
                        <Text
                            className={`${primaryTextClassName} font-semibold!`}
                            ellipsis={{ tooltip: name }}
                        >
                            {name}
                        </Text>
                    ),
                },
                {
                    title: 'Trang trại · Ao',
                    key: 'farmPond',
                    width: 268,
                    render: (_, season) => (
                        <Flex vertical gap={0} className="min-w-0">
                            <Text
                                className={primaryTextClassName}
                                ellipsis={{ tooltip: season.pondName }}
                            >
                                {season.pondName}
                            </Text>
                            <Text
                                className={secondaryTextClassName}
                                ellipsis={{
                                    tooltip: `${season.farm.name}${season.farm.address ? ` — ${season.farm.address}` : ''}`,
                                }}
                            >
                                {season.farm.name}
                                {season.farm.address ? ` — ${season.farm.address}` : ''}
                            </Text>
                        </Flex>
                    ),
                },
                {
                    title: 'Loài',
                    key: 'shrimpType',
                    dataIndex: 'shrimpType',
                    width: 140,
                    render: (shrimpType) => (
                        <Text className={primaryTextClassName}>
                            {shrimpOptions.find(({ value }) => value === shrimpType)?.label || '—'}
                        </Text>
                    ),
                },
                {
                    title: 'DOC',
                    key: 'doc',
                    dataIndex: 'dayOfCulture',
                    width: 120,
                    sorter: (first, second, order) => {
                        // Keep missing DOC last in either direction after Ant Design reverses descending results.
                        if (first.dayOfCulture == null) {
                            return second.dayOfCulture == null ? 0 : order === 'descend' ? -1 : 1;
                        }
                        if (second.dayOfCulture == null) return order === 'descend' ? 1 : -1;
                        return first.dayOfCulture - second.dayOfCulture;
                    },
                    render: (doc, season) => (
                        <Flex vertical gap={0}>
                            <Text
                                className={`${primaryTextClassName} ${monoClassName} font-semibold!`}
                            >
                                {doc ?? '—'}
                            </Text>
                            <Text className={dateTextClassName} ellipsis>
                                {season.stockingDate ? `từ ${dateLabel(season.stockingDate)}` : '—'}
                            </Text>
                        </Flex>
                    ),
                },
                {
                    title: 'Trạng thái',
                    key: 'status',
                    dataIndex: 'status',
                    width: 120,
                    render: (status) => (
                        <SeasonPill tone={statusTone[status]}>
                            {statusOptions.find(({ value }) => value === status)?.label || '—'}
                        </SeasonPill>
                    ),
                },
                {
                    title: 'Phác đồ nuôi',
                    key: 'protocol',
                    width: 150,
                    render: (_, season) => {
                        const protocol = season.productionProtocol;
                        return protocol ? (
                            <SeasonPill tone={protocolTone[protocol.status]}>
                                {protocolLabels[protocol.status] || '—'} v{protocol.versionNo}
                            </SeasonPill>
                        ) : (
                            <Text className="text-[#6a7994]!">—</Text>
                        );
                    },
                },
                {
                    title: 'Ca bệnh mở',
                    key: 'openCases',
                    dataIndex: 'openCaseCount',
                    width: 110,
                    align: 'center',
                    render: (count, season) => {
                        const color =
                            count > 0
                                ? ['HIGH', 'CRITICAL'].includes(season.highestOpenSeverity)
                                    ? '#d43b57'
                                    : '#d97706'
                                : '#0f62b4';
                        return (
                            <Badge
                                count={count}
                                showZero
                                color={color}
                                overflowCount={99}
                                className="[&_.ant-badge-count]:h-4.75! [&_.ant-badge-count]:min-w-4.75! [&_.ant-badge-count]:px-1! [&_.ant-badge-count]:text-[10px]! [&_.ant-badge-count]:leading-4.75! [&_.ant-badge-count]:shadow-[0_0_0_1px_#fff]!"
                            />
                        );
                    },
                },
                {
                    title: 'Hành động',
                    key: 'actions',
                    width: 100,
                    align: 'center',
                    render: (_, season) => (
                        <Button
                            type="text"
                            disabled
                            className="size-6.75! min-w-6.75! rounded-full! p-0! text-[#8796ae]! opacity-100!"
                            icon={<EyeOutlined className="text-[13px]" />}
                            aria-label={`Xem ${season.name}`}
                        />
                    ),
                },
            ].map((column, _index, allColumns) => ({
                ...column,
                // Preserve the design's nine-column proportions at every available width.
                width: `${(column.width / allColumns.reduce((total, item) => total + item.width, 0)) * 100}%`,
                onHeaderCell: () => ({ className: tableHeaderClassName }),
                onCell: () => ({ className: tableCellClassName }),
            })),
        [],
    );

    return (
        <ConfigProvider theme={seasonTheme}>
            <Flex vertical gap={0} className="w-full! min-w-0!">
                <Flex vertical gap={0} className="w-full! min-w-0!">
                    <Title level={1} className="m-0! font-['Sora','Plus_Jakarta_Sans',sans-serif]! text-[22px]! leading-6.875! font-bold! text-[#0f1c2e]!">
                        Vụ nuôi được phân công
                    </Title>
                    <Paragraph className="mb-0! mt-1! text-[13px]! leading-5.25! text-[#6a7994]!">
                        Quản lý phác đồ nuôi và theo dõi chuyên môn các vụ được giao.
                    </Paragraph>
                </Flex>
                <Card
                    className="@container mt-5! w-full! min-w-0! rounded-[14px]! border-[#e5e8f0]! bg-white! shadow-[0_1px_1px_rgba(15,28,46,0.04)]! [&>.ant-card-body]:p-0!"
                    aria-label="Danh sách vụ nuôi được phân công"
                    role="region"
                >
                    <Flex wrap align="center" className={toolbarClassName}>
                        <Input
                            className="h-full! w-60! min-w-0! max-w-full! shrink-0! rounded-[10px]! border-[#e5e8f0]! px-2.75! py-1.625! text-[13px]! [&_.ant-input]:text-[13px]!"
                            prefix={<SearchOutlined className="text-[13px] text-[#8796ae]" />}
                            placeholder="Tên vụ, ao, trang trại…"
                            aria-label="Tìm theo tên vụ, ao hoặc trang trại"
                            value={search}
                            onChange={(event) => setSearch(event.target.value.slice(0, 255))}
                            allowClear
                        />
                        <Flex
                            wrap
                            gap={8}
                            className="ml-auto! min-w-0! max-w-full! max-[650px]:ml-0! max-[650px]:w-full!"
                        >
                            <Select
                                className={`${filterClassName} w-52!`}
                                aria-label="Lọc trạng thái"
                                placeholder="Tất cả trạng thái"
                                value={filters.status}
                                options={statusOptions}
                                allowClear
                                onChange={(value) => changeFilter('status', value)}
                            />
                            <Select
                                className={`${filterClassName} w-52!`}
                                aria-label="Lọc trang trại"
                                placeholder="Trang trại"
                                value={filters.farmId}
                                options={
                                    state.meta?.farms.map((farm) => ({
                                        value: farm.id,
                                        label: farm.name,
                                    })) || []
                                }
                                allowClear
                                onChange={(value) => changeFilter('farmId', value)}
                            />
                            <Select
                                className={`${filterClassName} w-40!`}
                                aria-label="Lọc loài tôm"
                                placeholder="Loài tôm"
                                value={filters.shrimpType}
                                options={shrimpOptions}
                                allowClear
                                onChange={(value) => changeFilter('shrimpType', value)}
                            />
                        </Flex>
                    </Flex>
                    {state.error && (
                        <Alert
                            className="m-4!"
                            type="error"
                            showIcon
                            message={state.error}
                            action={
                                <Button
                                    size="small"
                                    onClick={() => {
                                        setState((current) => ({
                                            ...current,
                                            loading: true,
                                            error: null,
                                        }));
                                        setRevision((value) => value + 1);
                                    }}
                                >
                                    Thử lại
                                </Button>
                            }
                        />
                    )}
                    {state.loading ? (
                        <Loading className="min-h-90! w-full!" tip="Đang tải danh sách vụ nuôi" />
                    ) : (
                        !state.error &&
                        (state.rows.length ? (
                            <Table
                                className={tableClassName}
                                dataSource={state.rows}
                                columns={columns}
                                rowKey="id"
                                tableLayout="fixed"
                                showSorterTooltip={false}
                                pagination={{
                                    current: page,
                                    pageSize: limit,
                                    total: state.meta.totalResults,
                                    showSizeChanger: true,
                                    pageSizeOptions: [10, 20, 50],
                                    showLessItems: true,
                                    locale: { items_per_page: '/ page' },
                                    showTotal: (total, range) =>
                                        `${range[0]}–${range[1]} / ${total} vụ`,
                                }}
                                onChange={handleTableChange}
                            />
                        ) : (
                            <Flex justify="center" className="py-12!">
                                <Empty description="Không có vụ nuôi phù hợp" />
                            </Flex>
                        ))
                    )}
                </Card>
            </Flex>
        </ConfigProvider>
    );
};

export default ExpertSeasonList;
