import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import viVN from 'antd/locale/vi_VN';
import { templateValidateMessages } from '../../utils/protocolTemplateUtils';
import {
    Alert,
    App,
    Button,
    Card,
    ConfigProvider,
    Empty,
    Flex,
    Input,
    Popconfirm,
    Select,
    Table,
    Tag,
    Tooltip,
    Typography,
} from 'antd';
import {
    CopyOutlined,
    DeleteOutlined,
    EyeOutlined,
    PlusOutlined,
    SearchOutlined,
    EditOutlined,
    SwapOutlined,
} from '@ant-design/icons';
import { expertProtocolTemplateAPI } from '../../apis';
import Loading from '../../components/Loading';
import ExpertProtocolTemplateEditor from '../../components/ExpertProtocolTemplateEditor';
import ExpertProtocolTemplateDetail, {
    ProtocolTemplateMetricTag,
} from '../../components/ExpertProtocolTemplateDetail';

const { Paragraph, Text, Title } = Typography;
const shrimpOptions = [
    { value: 'WHITELEG', label: 'Tôm thẻ chân trắng' },
    { value: 'BLACK_TIGER', label: 'Tôm sú' },
];
const templateTheme = {
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
    },
};
const filterClassName =
    'h-9! max-w-full! [&_.ant-select-selector]:rounded-[10px]! [&_.ant-select-selector]:border-[#e5e8f0]! [&_.ant-select-arrow]:text-[10px]!';
const tableClassName = [
    'w-full! min-w-0! pb-4!',
    '[&_.ant-table-content>table]:w-full! [&_.ant-table-content>table]:table-fixed!',
    '[&_.ant-table-thead>tr>th:first-child]:rounded-tl-[14px]! [&_.ant-table-thead>tr>th:last-child]:rounded-tr-[14px]!',
    '[&_.ant-table-column-sorters]:gap-1! [&_.ant-table-column-sorter]:ms-0! [&_.ant-table-column-sorter]:shrink-0!',
    '[&_.ant-table-pagination]:m-0! [&_.ant-table-pagination]:min-h-13! [&_.ant-table-pagination]:gap-y-2! [&_.ant-table-pagination]:px-4! [&_.ant-table-pagination]:pt-4!',
    '[&_.ant-pagination-total-text]:mr-2! [&_.ant-pagination-total-text]:h-9! [&_.ant-pagination-total-text]:leading-8.5!',
    '[&_.ant-pagination-item]:h-9! [&_.ant-pagination-item]:min-w-9! [&_.ant-pagination-item]:rounded-[10px]! [&_.ant-pagination-item]:leading-8.5!',
    '[&_.ant-pagination-prev]:h-9! [&_.ant-pagination-prev]:min-w-9! [&_.ant-pagination-next]:h-9! [&_.ant-pagination-next]:min-w-9!',
    '[&_.ant-pagination-options]:ml-4! [&_.ant-pagination-options-size-changer]:h-9! [&_.ant-pagination-options-size-changer]:w-24.5!',
].join(' ');
const textClassName = 'text-[13px]! leading-5.25! text-[#475569]!';
const unavailableMessage = 'Chức năng này chưa được triển khai.';
const actions = [
    { key: 'view', label: 'Xem', icon: <EyeOutlined /> },
    { key: 'edit', label: 'Sửa', icon: <EditOutlined /> },
    { key: 'copy', label: 'Sao chép', icon: <CopyOutlined /> },
    {
        key: 'delete',
        label: 'Xóa',
        icon: <DeleteOutlined />,
        danger: true,
    },
];
const getColumns = (
    onView,
    onEdit,
    onDelete,
    deletingId,
    onStatusChange,
    changingStatusId
) =>
    [
        {
            title: 'Phác đồ mẫu',
            dataIndex: 'title',
            key: 'title',
            width: 302.4,
            render: (title, row) => (
                <Flex vertical gap={0} className="min-w-0!">
                    <Paragraph
                        className="m-0! text-[13px]! font-semibold! leading-5.25! text-[#0f1c2e]!"
                        ellipsis={{ rows: 2, tooltip: title }}
                    >
                        {title}
                    </Paragraph>
                    {row.description && (
                        <Text
                            className="text-xs! leading-4.75! text-[#6a7994]!"
                            ellipsis={{ tooltip: row.description }}
                        >
                            {row.description}
                        </Text>
                    )}
                </Flex>
            ),
        },
        {
            title: 'Trang trại',
            key: 'farm',
            width: 200,
            render: (_, row) => (
                <Text
                    className={textClassName}
                    ellipsis={{ tooltip: row.farm.name }}
                >
                    {row.farm.name}
                </Text>
            ),
        },
        {
            title: 'Loài',
            dataIndex: 'shrimpType',
            key: 'shrimpType',
            width: 140,
            render: (value) => (
                <Text className={textClassName}>
                    {shrimpOptions.find((item) => item.value === value)
                        ?.label ?? 'Tất cả loài tôm'}
                </Text>
            ),
        },
        {
            title: 'Sai lệch',
            dataIndex: 'allowedVariancePct',
            key: 'variance',
            width: 150,
            align: 'center',
            sorter: (first, second) =>
                first.allowedVariancePct - second.allowedVariancePct,
            render: (value) => (
                <ProtocolTemplateMetricTag metric="variance" value={value}>
                    ±{value}%
                </ProtocolTemplateMetricTag>
            ),
        },
        {
            title: 'Đã dùng',
            dataIndex: 'usedSeasonCount',
            key: 'uses',
            width: 110,
            align: 'center',
            sorter: (first, second) =>
                first.usedSeasonCount - second.usedSeasonCount,
            render: (value) => (
                <ProtocolTemplateMetricTag metric="uses" value={value}>
                    {value} {'vụ'}
                </ProtocolTemplateMetricTag>
            ),
        },
        {
            title: 'Phiên bản',
            dataIndex: 'versionNo',
            key: 'version',
            width: 115,
            align: 'center',
            sorter: (first, second) => first.versionNo - second.versionNo,
            render: (value) => (
                <ProtocolTemplateMetricTag metric="version" value={value}>
                    v{value}
                </ProtocolTemplateMetricTag>
            ),
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            width: 140,
            render: (status) => (
                <Tag color={status === 'active' ? 'green' : 'default'}>
                    {status === 'active' ? 'Đang sử dụng' : 'Ngừng sử dụng'}
                </Tag>
            ),
        },
        {
            title: 'Hành động',
            key: 'actions',
            width: 155,
            render: (_, row) => (
                <Flex gap={2} wrap className="min-w-0!">
                    {actions
                        .filter(
                            (action) => action.key !== 'delete' || row.canDelete
                        )
                        .map((action) => (
                            <Tooltip
                                key={action.key}
                                title={
                                    action.key === 'view'
                                        ? 'Xem chi tiết'
                                        : action.key === 'edit'
                                          ? 'Chỉnh sửa phác đồ mẫu'
                                          : action.key === 'delete'
                                            ? 'Xóa phác đồ mẫu'
                                            : unavailableMessage
                                }
                            >
                                {action.key === 'delete' ? (
                                    <Popconfirm
                                        title="Xóa phác đồ mẫu?"
                                        description="Chỉ xóa mẫu chưa có phác đồ nào tham chiếu. Thao tác xóa không thể hoàn tác."
                                        okText="Xóa"
                                        cancelText="Hủy"
                                        placement="topRight"
                                        onConfirm={() => onDelete(row)}
                                        okButtonProps={{
                                            className:
                                                'border-0! bg-linear-to-r! from-[#77a1d3]! to-[#79cbca]!',
                                        }}
                                    >
                                        <Button
                                            type="text"
                                            loading={deletingId === row.id}
                                            disabled={Boolean(deletingId)}
                                            icon={<DeleteOutlined />}
                                            aria-label={`Xóa ${row.title}`}
                                            className="size-6.75! min-w-6.75! p-0! text-[#ef4767]!"
                                        />
                                    </Popconfirm>
                                ) : (
                                    <Button
                                        type="text"
                                        disabled={
                                            !['view', 'edit'].includes(
                                                action.key
                                            )
                                        }
                                        icon={action.icon}
                                        onClick={
                                            action.key === 'view'
                                                ? () => onView(row.id)
                                                : action.key === 'edit'
                                                  ? () => onEdit(row.id)
                                                  : undefined
                                        }
                                        aria-label={`${action.label} ${row.title}`}
                                        className={`size-6.75! min-w-6.75! p-0! text-[13px]! opacity-100! ${action.danger ? 'text-[#ef4767]!' : 'text-[#8796ae]!'}`}
                                    />
                                )}
                            </Tooltip>
                        ))}
                    {!row.canDelete && (
                        <Tooltip
                            title={
                                row.status === 'active'
                                    ? 'Ngừng sử dụng'
                                    : 'Sử dụng lại'
                            }
                        >
                            <Popconfirm
                                title={
                                    row.status === 'active'
                                        ? 'Ngừng sử dụng phác đồ mẫu?'
                                        : 'Sử dụng lại phác đồ mẫu?'
                                }
                                description="Trạng thái này chỉ áp dụng cho mẫu; phác đồ đã lập cho vụ nuôi được giữ nguyên."
                                okText="Xác nhận"
                                cancelText="Hủy"
                                onConfirm={() => onStatusChange(row)}
                            >
                                <Button
                                    type="text"
                                    icon={<SwapOutlined />}
                                    aria-label={`Đổi trạng thái ${row.title}`}
                                    loading={changingStatusId === row.id}
                                    disabled={Boolean(
                                        changingStatusId || deletingId
                                    )}
                                    className="size-6.75! min-w-6.75! p-0! text-[#1d7ad6]!"
                                />
                            </Popconfirm>
                        </Tooltip>
                    )}
                </Flex>
            ),
        },
    ].map((column, _, allColumns) => ({
        ...column,
        width: `${(column.width / allColumns.reduce((sum, item) => sum + item.width, 0)) * 100}%`,
        onHeaderCell: () => ({
            className:
                'h-11.5! border-b! border-[#e5e8f0]! px-4! py-3! text-[13px]! font-semibold! leading-5.25! @max-[1000px]:px-2! @max-[1000px]:text-xs!',
        }),
        onCell: () => ({
            className:
                'h-16! border-b! border-[#e5e8f0]! px-4! py-3! align-middle! text-[13px]! leading-5.25! @max-[1000px]:px-2!',
        }),
    }));

const ExpertProtocolTemplateList = () => {
    const { message } = App.useApp();
    const [deletingId, setDeletingId] = useState(null);
    const navigate = useNavigate();
    const { templateId } = useParams();
    const [search, setSearch] = useState('');
    const [filters, setFilters] = useState({
        search: '',
        farmId: undefined,
        shrimpType: undefined,
        status: undefined,
    });
    const [pagination, setPagination] = useState({ page: 1, limit: 10 });
    const [revision, setRevision] = useState(0);
    const [creating, setCreating] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [changingStatusId, setChangingStatusId] = useState(null);
    const [state, setState] = useState({
        loading: true,
        rows: [],
        meta: null,
        error: null,
    });

    useEffect(() => {
        const normalizedSearch = search.trim();
        if (normalizedSearch === filters.search) return;
        const timer = setTimeout(() => {
            setFilters((current) => ({ ...current, search: normalizedSearch }));
            setPagination((current) => ({ ...current, page: 1 }));
            setState((current) => ({ ...current, loading: true, error: null }));
        }, 300);
        return () => clearTimeout(timer);
    }, [search, filters.search]);

    useEffect(() => {
        const controller = new AbortController();
        expertProtocolTemplateAPI
            .getTemplates({ ...filters, ...pagination }, controller.signal)
            .then((result) => {
                if (controller.signal.aborted) return;
                const lastPage = Math.max(
                    1,
                    Math.ceil(result.meta.totalResults / pagination.limit)
                );
                if (pagination.page > lastPage) {
                    setPagination((current) => ({
                        ...current,
                        page: lastPage,
                    }));
                    return;
                }
                setState({ ...result, loading: false, error: null });
            })
            .catch((error) => {
                if (controller.signal.aborted) return;
                setState((current) => ({
                    ...current,
                    loading: false,
                    error:
                        error.response?.data?.message ||
                        (error.message === 'Dữ liệu phác đồ mẫu không hợp lệ.'
                            ? error.message
                            : 'Không thể tải danh sách phác đồ mẫu.'),
                }));
            });
        return () => controller.abort();
    }, [filters, pagination, revision]);

    const changeFilter = (key, value) => {
        setFilters((current) => ({ ...current, [key]: value }));
        setPagination((current) => ({ ...current, page: 1 }));
        setState((current) => ({ ...current, loading: true, error: null }));
    };
    const handleTableChange = (next, _filters, _sorter, { action }) => {
        // Sorters operate only on the loaded rows; sorting never sends an API request.
        if (action !== 'paginate') return;
        const page = next.pageSize === pagination.limit ? next.current : 1;
        if (page === pagination.page && next.pageSize === pagination.limit)
            return;
        setPagination({ page, limit: next.pageSize });
        setState((current) => ({ ...current, loading: true, error: null }));
    };
    const retry = () => {
        setState((current) => ({ ...current, loading: true, error: null }));
        setRevision((current) => current + 1);
    };
    const deleteTemplate = async (row) => {
        if (deletingId) return;
        setDeletingId(row.id);
        try {
            await expertProtocolTemplateAPI.deleteTemplate(
                row.id,
                row.versionNo
            );
            message.success('Xóa phác đồ mẫu thành công.');
            if (templateId === row.id)
                navigate('/expert/protocols', { replace: true });
            if (state.rows.length === 1 && pagination.page > 1)
                setPagination((current) => ({
                    ...current,
                    page: current.page - 1,
                }));
            retry();
        } catch (error) {
            message.error(
                error.response?.data?.message ||
                    'Chưa nhận được xác nhận xóa. Hãy tải lại danh sách.'
            );
            retry();
        } finally {
            setDeletingId(null);
        }
    };
    const changeStatus = async (row) => {
        if (changingStatusId || deletingId) return;
        setChangingStatusId(row.id);
        try {
            await expertProtocolTemplateAPI.updateStatus(
                row.id,
                row.status === 'active' ? 'inactive' : 'active',
                row.versionNo
            );
            message.success('Đổi trạng thái phác đồ mẫu thành công.');
        } catch (error) {
            message.error(
                error.response?.data?.message ||
                    'Không thể xác nhận đổi trạng thái. Vui lòng tải lại danh sách.'
            );
        } finally {
            setChangingStatusId(null);
            retry();
        }
    };
    const columns = getColumns(
        (id) => navigate(`/expert/protocols/${encodeURIComponent(id)}`),
        setEditingId,
        deleteTemplate,
        deletingId,
        changeStatus,
        changingStatusId
    );

    return (
        <ConfigProvider
            theme={templateTheme}
            locale={viVN}
            form={{ validateMessages: templateValidateMessages }}
        >
            <Flex vertical className="w-full! min-w-0!">
                <Flex justify="space-between" align="end" wrap gap={12}>
                    <Flex vertical gap={0}>
                        <Title
                            level={1}
                            className="m-0! font-['Sora','Plus_Jakarta_Sans',sans-serif]! text-[22px]! font-bold! leading-6.875! text-[#0f1c2e]!"
                        >
                            {'Phác đồ nuôi mẫu'}
                        </Title>
                        <Paragraph className="mb-0! mt-1! text-[13px]! leading-5.25! text-[#6a7994]!">
                            {
                                'Mẫu tái sử dụng để soạn nhanh phác đồ nuôi cho vụ mới.'
                            }
                        </Paragraph>
                    </Flex>
                    <Button
                        onClick={() => setCreating(true)}
                        icon={<PlusOutlined />}
                        className="h-9! rounded-[10px]! border-transparent! bg-linear-to-r! from-[#77a1d3]! to-[#79cbca]! px-4! text-[13px]! font-normal! text-white! opacity-100!"
                    >
                        {'Tạo phác đồ mẫu'}
                    </Button>
                </Flex>
                <Card
                    role="region"
                    aria-label="Danh sách phác đồ nuôi mẫu"
                    className="@container mt-5! w-full! min-w-0! rounded-[14px]! border-[#e5e8f0]! bg-white! shadow-[0_1px_1px_rgba(15,28,46,0.04)]! [&>.ant-card-body]:p-0!"
                >
                    <Flex
                        wrap
                        align="center"
                        gap={8}
                        className="min-h-15.25! rounded-t-[14px]! border-b! border-[#eef1f7]! px-4! py-3!"
                    >
                        <Input
                            className="h-9! w-64! max-w-full! rounded-[10px]! border-[#e5e8f0]! text-[13px]!"
                            prefix={
                                <SearchOutlined className="text-[#475569]" />
                            }
                            placeholder="Tìm theo tên, mô tả…"
                            aria-label="Tìm theo tên hoặc mô tả phác đồ mẫu"
                            value={search}
                            maxLength={500}
                            allowClear
                            onChange={(event) => setSearch(event.target.value)}
                        />
                        <Select
                            className={`${filterClassName} w-56!`}
                            placeholder="Trang trại"
                            aria-label="Lọc trang trại"
                            value={filters.farmId}
                            allowClear
                            options={
                                state.meta?.farms.map((farm) => ({
                                    value: farm.id,
                                    label: farm.name,
                                })) ?? []
                            }
                            onChange={(value) => changeFilter('farmId', value)}
                        />
                        <Select
                            className={`${filterClassName} w-44!`}
                            placeholder="Loài tôm"
                            aria-label="Lọc loài tôm"
                            value={filters.shrimpType}
                            allowClear
                            options={shrimpOptions}
                            onChange={(value) =>
                                changeFilter('shrimpType', value)
                            }
                        />
                        <Select
                            className={`${filterClassName} w-44!`}
                            placeholder="Trạng thái"
                            aria-label="Lọc trạng thái"
                            value={filters.status}
                            allowClear
                            options={[
                                {
                                    value: 'active',
                                    label: 'Đang sử dụng',
                                },
                                {
                                    value: 'inactive',
                                    label: 'Ngừng sử dụng',
                                },
                            ]}
                            onChange={(value) => changeFilter('status', value)}
                        />
                    </Flex>
                    {state.error ? (
                        <Alert
                            type="error"
                            showIcon
                            message={state.error}
                            className="m-4!"
                            action={
                                <Button size="small" onClick={retry}>
                                    {'Thử lại'}
                                </Button>
                            }
                        />
                    ) : state.loading && !state.meta ? (
                        <Loading
                            className="min-h-80! w-full!"
                            tip="Đang tải danh sách phác đồ mẫu"
                        />
                    ) : (
                        <Table
                            className={tableClassName}
                            rowKey="id"
                            columns={columns}
                            dataSource={state.rows}
                            tableLayout="fixed"
                            showSorterTooltip={false}
                            loading={state.loading}
                            locale={{
                                emptyText: (
                                    <Empty description="Không có phác đồ mẫu phù hợp" />
                                ),
                            }}
                            pagination={{
                                current: pagination.page,
                                pageSize: pagination.limit,
                                total: state.meta?.totalResults ?? 0,
                                showSizeChanger: true,
                                pageSizeOptions: [10, 20, 50],
                                showLessItems: true,
                                locale: { items_per_page: '/ trang' },
                                showTotal: (total) => `${total} mẫu`,
                            }}
                            onChange={handleTableChange}
                        />
                    )}
                </Card>
                <ExpertProtocolTemplateDetail
                    key={`${templateId ?? ''}/${revision}`}
                    onEdit={() => setEditingId(templateId)}
                    templateId={templateId}
                    title={
                        state.rows.find((row) => row.id === templateId)?.title
                    }
                    onClose={() =>
                        navigate('/expert/protocols', { replace: true })
                    }
                />
                {(creating || editingId) && (
                    <ExpertProtocolTemplateEditor
                        key={editingId || 'create'}
                        templateId={editingId}
                        onClose={() => {
                            setCreating(false);
                            setEditingId(null);
                        }}
                        onSaved={(template) => {
                            setCreating(false);
                            setEditingId(null);
                            setPagination((current) => ({
                                ...current,
                                page: 1,
                            }));
                            retry();
                            navigate(
                                `/expert/protocols/${encodeURIComponent(template.id)}`
                            );
                        }}
                    />
                )}
            </Flex>
        </ConfigProvider>
    );
};

export default ExpertProtocolTemplateList;
