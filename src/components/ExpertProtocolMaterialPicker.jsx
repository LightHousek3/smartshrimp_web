import { useEffect, useRef, useState } from 'react';
import {
    Alert,
    App,
    Button,
    Empty,
    Flex,
    Form,
    Input,
    Modal,
    Segmented,
    Select,
    Table,
    Tabs,
    Tooltip,
    Typography,
    Upload,
} from 'antd';
import {
    ExperimentOutlined,
    EyeOutlined,
    HistoryOutlined,
    InboxOutlined,
    PlusOutlined,
    SearchOutlined,
    SendOutlined,
    WarningOutlined,
} from '@ant-design/icons';
import { cloudinaryAPI, expertProtocolTemplateAPI } from '../apis';
import {
    materialCategories,
    materialUnitOptions,
    templateValidateMessages,
} from '../utils/protocolTemplateUtils';
import ProtocolProductImages from './ProtocolProductImages';
import ProductComplianceFields from './ProductComplianceFields';
import {
    editableCompliance,
    uniqueTemplateProposals,
    materialCategoryFits as categoryFits,
    templateMaterialSelectionError,
} from '../utils/materialCompliance';
import InputNumber from './ProtocolNumberInput';
import ProtocolMaterialDetail, { MaterialCategoryTag } from './ProtocolMaterialDetail';

const { Text, Title, Paragraph } = Typography;
const number = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 4 });
const groups = [
    { value: 'ALL', label: 'Tất cả' },
    { value: 'FEED', label: 'Thức ăn' },
    { value: 'MEDICINE', label: 'Thuốc' },
    { value: 'MINERAL', label: 'Khoáng' },
    { value: 'CHEMICAL', label: 'Hóa chất' },
    { value: 'OTHER', label: 'Khác' },
];
const primaryButton =
    'h-9! border-0! bg-linear-to-r! from-[#77a1d3]! to-[#79cbca]! px-4! text-white!';

const MaterialRecommendation = ({
    environment,
    feedOnly,
    initialValues,
    manufacturers,
    onSelect,
    onBack,
}) => {
    const [form] = Form.useForm();
    const { message, modal } = App.useApp();
    const [files, setFiles] = useState(
        (initialValues?.imageUrls ?? []).map((url, index) => ({
            uid: `existing-${index}`,
            name: `Ảnh ${index + 1}`,
            status: 'done',
            url,
            response: { secure_url: url },
        })),
    );
    const mounted = useRef(true);
    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
        };
    }, []);
    const manufacturerMode = Form.useWatch('manufacturerMode', form);
    const unit = Form.useWatch('unit', form);
    const packaged = ['PACK', 'BOTTLE'].includes(unit);
    const uploading = files.some((file) => file.status !== 'done');
    const uploadImage = async ({ file, onSuccess, onError, onProgress }) => {
        try {
            const response = await cloudinaryAPI.uploadImage(
                file,
                'smartshrimp/protocol-materials',
                (percent) => {
                    if (mounted.current) onProgress({ percent });
                },
            );
            if (mounted.current) onSuccess(response.data);
        } catch (error) {
            if (mounted.current) {
                onError(error);
                message.error('Không tải được ảnh. Kiểm tra cấu hình Cloudinary hoặc thử lại.');
            }
        }
    };
    const submit = (values) => {
        const selectionError = templateMaterialSelectionError(values, {
            environment,
            feedOnly,
        });
        if (selectionError) {
            message.error(selectionError);
            return;
        }
        if (!categoryFits(values.category, environment, feedOnly)) {
            form.setFields([
                {
                    name: 'category',
                    errors: ['Nhóm vật tư không phù hợp hoạt động này.'],
                },
            ]);
            return;
        }
        const imageUrls = files.map((file) => file.response?.secure_url || file.url);
        if (uploading || imageUrls.some((url) => !url?.startsWith('https://'))) {
            message.error('Hãy tải xong ảnh hoặc xóa ảnh bị lỗi trước khi thêm vật tư.');
            return;
        }
        onSelect({
            ...Object.fromEntries(
                Object.entries(values).filter(
                    ([field]) =>
                        !['manufacturerMode', 'manufacturer', 'manufacturerId'].includes(field),
                ),
            ),
            ...(manufacturerMode === 'existing'
                ? { manufacturerId: values.manufacturerId }
                : { manufacturer: values.manufacturer }),
            productCompliance: editableCompliance(values.productCompliance),
            conversionQuantity: packaged ? values.conversionQuantity : null,
            conversionUnit: packaged ? values.conversionUnit : null,
            imageUrls,
        });
    };
    return (
        <Form
            form={form}
            layout="vertical"
            onFinish={submit}
            validateMessages={templateValidateMessages}
            initialValues={
                initialValues
                    ? {
                          ...initialValues,
                          manufacturerMode: initialValues.manufacturerId ? 'existing' : 'new',
                          productCompliance: editableCompliance(initialValues.productCompliance),
                      }
                    : {
                          category: environment ? 'MINERAL' : 'FEED',
                          unit: 'KG',
                          manufacturerMode: 'new',
                          productCompliance: {
                              regulatoryType: 'unclassified',
                              evidenceUrls: [],
                          },
                      }
            }
            className="[&_.ant-form-item-label>label]:text-[13px]! [&_.ant-form-item-label>label]:text-[#3a4a63]!"
        >
            <Alert
                type="info"
                showIcon
                className="mb-5! rounded-xl!"
                message="Anh/chị bổ sung thông tin theo nhãn để Chủ trang trại có cơ sở xem xét vật tư mới."
            />
            <Flex className="grid! grid-cols-2! gap-x-4! max-sm:grid-cols-1!">
                <Form.Item
                    name="name"
                    label="Tên vật tư"
                    rules={[
                        {
                            required: true,
                            whitespace: true,
                            max: 255,
                            message: 'Nhập tên vật tư (tối đa 255 ký tự).',
                        },
                    ]}
                >
                    <Input maxLength={255} placeholder="VD: Men vi sinh đường ruột" />
                </Form.Item>
                <Form.Item name="category" label="Nhóm" rules={[{ required: true }]}>
                    <Select
                        options={materialCategories.filter(({ value }) =>
                            categoryFits(value, environment, feedOnly),
                        )}
                    />
                </Form.Item>
                <Form.Item name="unit" label="Đơn vị nhập kho" rules={[{ required: true }]}>
                    <Select options={materialUnitOptions.filter(({ value }) => value !== 'PCS')} />
                </Form.Item>
                {packaged && (
                    <>
                        <Form.Item
                            name="conversionQuantity"
                            label={`Dung tích / khối lượng mỗi ${
                                unit === 'BOTTLE' ? 'chai' : 'gói'
                            }`}
                            rules={[
                                {
                                    required: true,
                                    type: 'number',
                                    min: 0.0001,
                                    max: 9999999999,
                                },
                            ]}
                        >
                            <InputNumber
                                min={0.0001}
                                max={9999999999}
                                precision={4}
                                className="w-full!"
                            />
                        </Form.Item>
                        <Form.Item
                            name="conversionUnit"
                            label="Đơn vị quy đổi"
                            rules={[{ required: true }]}
                        >
                            <Select
                                options={[
                                    { value: 'MG', label: 'mg' },
                                    ...materialUnitOptions.filter(({ value }) =>
                                        ['G', 'KG', 'ML', 'L'].includes(value),
                                    ),
                                ]}
                            />
                        </Form.Item>
                    </>
                )}
            </Flex>
            <Form.Item name="manufacturerMode" label="Nhà sản xuất">
                <Select
                    options={[
                        {
                            value: 'existing',
                            label: 'Chọn danh bạ sẵn có',
                        },
                        {
                            value: 'new',
                            label: 'Đề xuất nhà sản xuất mới',
                        },
                    ]}
                />
            </Form.Item>
            {manufacturerMode === 'existing' ? (
                <Form.Item
                    name="manufacturerId"
                    label="Nhà sản xuất trong danh bạ"
                    rules={[{ required: true }]}
                >
                    <Select
                        showSearch
                        optionFilterProp="label"
                        options={manufacturers.map((row) => ({
                            value: row.id,
                            label: row.name,
                        }))}
                    />
                </Form.Item>
            ) : (
                <>
                    <Form.Item
                        name={['manufacturer', 'name']}
                        label="Tên nhà sản xuất đề xuất"
                        rules={[{ required: true, whitespace: true, max: 255 }]}
                    >
                        <Input maxLength={255} />
                    </Form.Item>
                    <Form.Item
                        name={['manufacturer', 'supplierType']}
                        label="Vai trò"
                        initialValue="manufacturer"
                    >
                        <Select
                            options={[
                                {
                                    value: 'manufacturer',
                                    label: 'Nhà sản xuất',
                                },
                                {
                                    value: 'both',
                                    label: 'Sản xuất và phân phối',
                                },
                            ]}
                        />
                    </Form.Item>
                    {[
                        ['contactName', 'Người liên hệ', 255],
                        ['phone', 'Điện thoại', 20],
                        ['email', 'Email', 320],
                        ['address', 'Địa chỉ', 1000],
                        ['note', 'Ghi chú', 2000],
                    ].map(([field, label, max]) => (
                        <Form.Item
                            key={field}
                            name={['manufacturer', field]}
                            label={label}
                            rules={[
                                { max },
                                ...(field === 'email'
                                    ? [
                                          {
                                              type: 'email',
                                              message: 'Anh/chị nhập email hợp lệ.',
                                          },
                                      ]
                                    : []),
                            ]}
                        >
                            <Input maxLength={max} />
                        </Form.Item>
                    ))}
                </>
            )}
            <ProductComplianceFields />
            <Form.Item label="Ảnh vật tư tham khảo (Tùy chọn)">
                <Upload
                    listType="picture-card"
                    accept="image/jpeg,image/png,image/webp"
                    maxCount={3}
                    fileList={files}
                    onChange={({ fileList }) => setFiles(fileList)}
                    customRequest={uploadImage}
                    onPreview={(file) => {
                        if (file.url || file.response?.secure_url)
                            modal.info({
                                title: 'Ảnh vật tư',
                                content: (
                                    <ProtocolProductImages
                                        product={{
                                            name: file.name,
                                            imageUrls: [file.url || file.response.secure_url],
                                        }}
                                        size={160}
                                    />
                                ),
                                centered: true,
                            });
                    }}
                    beforeUpload={(file, selection) => {
                        if (
                            !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
                            file.size > 5 * 1024 * 1024 ||
                            files.length + selection.length > 3
                        ) {
                            message.error(
                                'Tối đa 3 ảnh JPG, PNG hoặc WebP; mỗi ảnh không quá 5 MB.',
                            );
                            return Upload.LIST_IGNORE;
                        }
                        return true;
                    }}
                >
                    {files.length < 3 && (
                        <Flex vertical gap={4}>
                            <PlusOutlined />
                            <Text>{'Thêm ảnh'}</Text>
                        </Flex>
                    )}
                </Upload>
                <Text className="text-xs! text-[#8796ae]!">
                    {
                        'Tối đa 3 ảnh JPG, PNG hoặc WebP, mỗi ảnh tối đa 5 MB. Ảnh được lưu cùng đề xuất.'
                    }
                </Text>
            </Form.Item>
            <Form.Item
                name="recommendationReason"
                label="Lý do đề xuất / chỉ định"
                rules={[
                    {
                        required: true,
                        whitespace: true,
                        max: 500,
                        message: 'Nhập lý do đề xuất (tối đa 500 ký tự).',
                    },
                ]}
            >
                <Input.TextArea
                    rows={3}
                    maxLength={500}
                    placeholder="Lý do lựa chọn vật tư, điều kiện sử dụng và lưu ý cần Owner kiểm tra…"
                />
            </Form.Item>
            <Flex justify="end" gap={8}>
                <Button onClick={onBack}>{'Quay lại danh sách'}</Button>
                <Button
                    htmlType="submit"
                    disabled={uploading}
                    icon={<SendOutlined />}
                    className={primaryButton}
                >
                    {'Thêm vào phác đồ'}
                </Button>
            </Flex>
        </Form>
    );
};

/** One farm-scoped selection per popup; all inventory values are read from the API. */
const ExpertProtocolMaterialPicker = ({
    farm,
    manufacturers = [],
    environment = false,
    initialRecommendation,
    proposedMaterials = [],
    feedOnly = false,
    onSelect,
    onClose,
}) => {
    const [tab, setTab] = useState(initialRecommendation ? 'recommendation' : 'warehouse');
    const [search, setSearch] = useState('');
    const [query, setQuery] = useState({
        search: '',
        group: feedOnly ? 'FEED' : 'ALL',
        page: 1,
        limit: 5,
    });
    const [revision, setRevision] = useState(0);
    const [detail, setDetail] = useState(null);
    const proposals = uniqueTemplateProposals(proposedMaterials);
    const proposed = tab === 'proposed';
    const visibleProposals = proposals
        .filter(
            (product) =>
                (query.group === 'ALL' || product.category === query.group) &&
                categoryFits(product.category, environment, feedOnly) &&
                [
                    product.name,
                    product.productCompliance?.ingredientsText,
                    product.recommendationReason,
                ]
                    .filter(Boolean)
                    .join(' ')
                    .toLocaleLowerCase('vi')
                    .includes(query.search.toLocaleLowerCase('vi')),
        )
        .map((product, index) => ({
            ...product,
            _proposalKey: `proposal-${index}`,
        }));
    const selectionError = (product) =>
        templateMaterialSelectionError(product, { environment, feedOnly });
    const canSelect = (product) => !selectionError(product);
    const selectProduct = (product) => {
        const { _proposalKey, ...content } = product;
        void _proposalKey;
        if (canSelect(product)) onSelect(structuredClone(content));
    };
    const [state, setState] = useState({
        rows: [],
        meta: null,
        loading: true,
        error: null,
    });
    useEffect(() => {
        if (query.search === search.trim()) return;
        const timer = setTimeout(() => {
            setQuery((current) => ({
                ...current,
                search: search.trim(),
                page: 1,
            }));
            setState((current) => ({ ...current, loading: true, error: null }));
        }, 300);
        return () => clearTimeout(timer);
    }, [search, query.search]);
    useEffect(() => {
        if (tab !== 'warehouse') return;
        const controller = new AbortController();
        expertProtocolTemplateAPI
            .getMaterials({ farmId: farm.id, ...query }, controller.signal)
            .then((result) => {
                if (!controller.signal.aborted)
                    setState({ ...result, loading: false, error: null });
            })
            .catch((error) => {
                if (!controller.signal.aborted)
                    setState((current) => ({
                        ...current,
                        loading: false,
                        error:
                            error.response?.data?.message ||
                            'Không thể tải vật tư. Vui lòng thử lại.',
                    }));
            });
        return () => controller.abort();
    }, [farm.id, query, revision, tab]);
    const changeQuery = (next) => {
        setQuery((current) => ({ ...current, ...next }));
        setState((current) => ({ ...current, loading: true, error: null }));
    };
    const columns = [
        {
            title: 'Hình ảnh',
            key: 'image',
            width: 80,
            render: (_, product) => <ProtocolProductImages product={product} size={40} />,
        },
        {
            title: 'Vật tư',
            dataIndex: 'name',
            key: 'name',
            render: (name, product) => (
                <Flex vertical gap={2} className="min-w-0!">
                    <Paragraph
                        ellipsis={{ rows: 2, tooltip: name }}
                        className="m-0! wrap-break-word! text-[13px]! font-semibold! text-[#0f1c2e]!"
                    >
                        {name}
                    </Paragraph>
                    <Paragraph
                        ellipsis={{ rows: 1, tooltip: product.description }}
                        className="m-0! wrap-break-word! text-xs! text-[#8796ae]!"
                    >
                        {product.description}
                    </Paragraph>
                    {product.recommendationReason && (
                        <Paragraph
                            ellipsis={{
                                rows: 1,
                                tooltip: product.recommendationReason,
                            }}
                            className="m-0! wrap-break-word! text-xs! text-[#6a7994]!"
                        >
                            {'Lý do đề xuất:'} {product.recommendationReason}
                        </Paragraph>
                    )}
                </Flex>
            ),
        },
        {
            title: 'Nhóm',
            dataIndex: 'category',
            width: 125,
            render: (category) => <MaterialCategoryTag category={category} />,
        },
        {
            title: 'Quy cách',
            key: 'unit',
            width: 110,
            render: (_, product) => (
                <Flex vertical>
                    <Text>
                        {materialUnitOptions.find(({ value }) => value === product.unit)?.label}
                    </Text>
                    {product.conversionQuantity !== null && (
                        <Text className="text-xs! text-[#8796ae]!">
                            {number.format(product.conversionQuantity)}{' '}
                            {product.conversionUnit?.toLowerCase()} /{' '}
                            {product.unit === 'BOTTLE' ? 'chai' : 'gói'}
                        </Text>
                    )}
                </Flex>
            ),
        },
        {
            title: 'Tồn kho',
            dataIndex: 'stockQuantity',
            key: 'stock',
            width: 120,
            align: 'right',
            sorter: (a, b) => a.stockQuantity - b.stockQuantity,
            render: (stock, product) => (
                <Flex vertical gap={2}>
                    <Text
                        className={`font-['JetBrains_Mono',monospace]! text-xs! font-semibold! ${stock <= product.minAlertQuantity ? 'text-[#d97706]!' : ''}`}
                    >
                        {stock <= product.minAlertQuantity && <WarningOutlined className="mr-1" />}
                        {number.format(stock)}{' '}
                        {materialUnitOptions.find(({ value }) => value === product.unit)?.label}
                    </Text>
                    <Text className="text-[11px]! text-[#8796ae]!">
                        {'ngưỡng'} {number.format(product.minAlertQuantity)} · {product.lotCount}{' '}
                        {'lô'}
                    </Text>
                </Flex>
            ),
        },
        {
            title: '',
            key: 'detail',
            width: 36,
            render: (_, product) => (
                <Tooltip title="Xem chi tiết vật tư">
                    <Button
                        type="text"
                        icon={<EyeOutlined />}
                        aria-label={`Xem chi tiết ${product.name}`}
                        onClick={() => setDetail(product)}
                    />
                </Tooltip>
            ),
        },
        {
            title: '',
            key: 'add',
            width: 40,
            render: (_, product) => (
                <Tooltip title={selectionError(product) || 'Thêm vào phác đồ'}>
                    <Button
                        type="text"
                        icon={<PlusOutlined />}
                        disabled={!canSelect(product)}
                        aria-label={`Thêm ${product.name}`}
                        onClick={() => selectProduct(product)}
                        className="size-7! p-0! text-[#8796ae]!"
                    />
                </Tooltip>
            ),
        },
    ];
    return (
        <Modal
            open
            centered
            width={920}
            rootClassName="[&_.ant-modal-wrap]:overflow-hidden!"
            footer={null}
            onCancel={onClose}
            destroyOnHidden
            className="max-w-[calc(100vw-32px)]! [&_.ant-modal-content]:flex! [&_.ant-modal-content]:h-[min(860px,calc(100dvh-24px))]! [&_.ant-modal-content]:flex-col! [&_.ant-modal-content]:overflow-hidden! [&_.ant-modal-content]:rounded-2xl! [&_.ant-modal-content]:px-6! [&_.ant-modal-content]:py-5! [&_.ant-modal-body]:flex! [&_.ant-modal-body]:min-h-0! [&_.ant-modal-body]:flex-1! [&_.ant-modal-body]:flex-col! [&_.ant-modal-body]:overflow-hidden!"
            title={
                <Flex vertical gap={4}>
                    <Title
                        level={3}
                        className="m-0! font-['Sora',sans-serif]! text-base! text-[#0f1c2e]!"
                    >
                        {'Chọn vật tư cho phác đồ'}
                    </Title>
                    <Text className="text-xs! font-normal! text-[#8796ae]!">
                        {'Trang trại:'} {farm.name}
                    </Text>
                </Flex>
            }
        >
            <Tabs
                activeKey={tab}
                onChange={(key) => {
                    setTab(key);
                    setQuery((current) => ({ ...current, page: 1 }));
                    if (key === 'warehouse') setState((current) => ({ ...current, loading: true }));
                }}
                items={[
                    {
                        key: 'warehouse',
                        label: 'Vật tư trong kho',
                        icon: <InboxOutlined />,
                    },
                    {
                        key: 'proposed',
                        label: `Vật tư đã đề xuất (${proposals.length})`,
                        icon: <HistoryOutlined />,
                    },
                    {
                        key: 'recommendation',
                        label: 'Đề xuất vật tư mới',
                        icon: <ExperimentOutlined />,
                    },
                ]}
            />
            <Flex
                vertical
                className={`min-h-0! flex-1! ${tab === 'recommendation' || query.limit === 5 ? 'overflow-y-auto! overflow-x-hidden!' : 'overflow-hidden!'}`}
            >
                {tab === 'recommendation' ? (
                    <>
                        <MaterialRecommendation
                            feedOnly={feedOnly}
                            environment={environment}
                            initialValues={initialRecommendation}
                            manufacturers={manufacturers}
                            onSelect={onSelect}
                            onBack={() => setTab('warehouse')}
                        />
                    </>
                ) : (
                    <>
                        <Flex gap={8} wrap className="mb-3!">
                            <Input
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                maxLength={255}
                                allowClear
                                prefix={<SearchOutlined />}
                                placeholder="Tìm theo tên, hoạt chất, công dụng…"
                                aria-label="Tìm vật tư"
                                className="h-9! w-72! max-w-full!"
                            />
                            <Segmented
                                options={
                                    feedOnly
                                        ? groups.filter(({ value }) => value === 'FEED')
                                        : groups
                                }
                                value={query.group}
                                onChange={(group) => changeQuery({ group, page: 1 })}
                                className="bg-[#eef4fb]!"
                            />
                        </Flex>
                        {!proposed && state.error ? (
                            <Alert
                                type="error"
                                showIcon
                                message={state.error}
                                action={
                                    <Button
                                        size="small"
                                        onClick={() => {
                                            setRevision((current) => current + 1);
                                            setState((current) => ({
                                                ...current,
                                                loading: true,
                                                error: null,
                                            }));
                                        }}
                                    >
                                        {'Thử lại'}
                                    </Button>
                                }
                            />
                        ) : (
                            <Table
                                rowKey={(product) => product.id || product._proposalKey}
                                columns={
                                    proposed
                                        ? columns.filter((column) => column.key !== 'stock')
                                        : columns
                                }
                                dataSource={
                                    proposed
                                        ? visibleProposals.slice(
                                              (query.page - 1) * query.limit,
                                              query.page * query.limit,
                                          )
                                        : state.rows
                                }
                                loading={!proposed && state.loading}
                                size="small"
                                tableLayout="fixed"
                                scroll={
                                    query.limit > 5
                                        ? {
                                              y: 'max(180px, calc(100dvh - 340px))',
                                          }
                                        : undefined
                                }
                                showSorterTooltip={false}
                                className="min-w-0! [&_.ant-table-pagination]:mb-0! [&_.ant-table-thead>tr>th]:bg-[#f8fafc]! [&_.ant-table-thead>tr>th]:text-[#6a7994]! [&_.ant-table-tbody>tr>td]:py-3!"
                                locale={{
                                    emptyText: (
                                        <Empty
                                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                                            description={
                                                proposed
                                                    ? 'Chưa có vật tư đề xuất phù hợp trong phác đồ này'
                                                    : 'Không tìm thấy vật tư phù hợp'
                                            }
                                        >
                                            <Button onClick={() => setTab('recommendation')}>
                                                {'Đề xuất vật tư mới'}
                                            </Button>
                                        </Empty>
                                    ),
                                }}
                                pagination={{
                                    current: query.page,
                                    pageSize: query.limit,
                                    total: proposed
                                        ? visibleProposals.length
                                        : (state.meta?.totalResults ?? 0),
                                    showSizeChanger: true,
                                    pageSizeOptions: [5, 10, 20],
                                    locale: { items_per_page: '/ trang' },
                                    showTotal: (total) => `${total} vật tư`,
                                }}
                                onChange={(next, _filters, _sorter, { action }) => {
                                    if (action === 'paginate')
                                        changeQuery({
                                            page: next.pageSize === query.limit ? next.current : 1,
                                            limit: next.pageSize,
                                        });
                                }}
                            />
                        )}
                    </>
                )}
            </Flex>
            {detail && (
                <ProtocolMaterialDetail
                    product={detail}
                    onClose={() => setDetail(null)}
                    onSelect={() => selectProduct(detail)}
                    selectable={canSelect(detail)}
                    selectionError={selectionError(detail)}
                    manufacturers={manufacturers}
                />
            )}
        </Modal>
    );
};

export default ExpertProtocolMaterialPicker;
