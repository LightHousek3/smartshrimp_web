import { useEffect, useRef, useState } from 'react';
import {
    Alert,
    App,
    Button,
    Empty,
    Flex,
    Form,
    Image,
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
    CloseOutlined,
    EditOutlined,
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
    proposalMissingFields,
    proposedManufacturerNameError,
    supplierNameKey,
    supplierPhoneError,
    supplierPhoneInputLimit,
    uniqueTemplateProposals,
    materialCategoryFits as categoryFits,
    templateMaterialSelectionError,
} from '../utils/materialCompliance';
import InputNumber from './ProtocolNumberInput';
import ProtocolMaterialDetail, { MaterialCategoryTag } from './ProtocolMaterialDetail';
import { getErrorMessage } from '../utils/errorMessage.js';
import ErrorState from './ErrorState';

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

/** Collect proposal evidence without creating a catalog product or manufacturer. */
const MaterialRecommendation = ({
    farmId,
    environment,
    feedOnly,
    production,
    initialValues,
    manufacturers,
    reservedSupplierNames,
    onSelect,
    validateSelection,
    uploading,
    setUploading,
    onBack,
}) => {
    const [form] = Form.useForm();
    const { message } = App.useApp();
    const [previewUrl, setPreviewUrl] = useState(null);
    const [files, setFiles] = useState(
        (initialValues?.imageUrls ?? []).map((url, index) => ({
            uid: `existing-${index}`,
            name: `Ảnh ${index + 1}`,
            status: 'done',
            url,
        })),
    );
    const uploaded = useRef(new Map());
    const submitting = useRef(false);
    const mounted = useRef(true);
    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
        };
    }, []);
    useEffect(
        () => () => {
            if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
        },
        [previewUrl],
    );
    const manufacturerMode = Form.useWatch('manufacturerMode', form);
    const category = Form.useWatch('category', form);
    const allowsAntibiotic = (value) => ['MEDICINE', 'OTHER'].includes(value);
    const unit = Form.useWatch('unit', form);
    const packaged = ['PACK', 'BOTTLE'].includes(unit);
    const previewImage = (file) => {
        const localFile = file.originFileObj ?? file;
        if (file.url || localFile instanceof Blob) {
            setPreviewUrl(file.url || URL.createObjectURL(localFile));
        }
    };
    const submit = async ({ manufacturerMode: mode, manufacturer, manufacturerId, ...values }) => {
        if (submitting.current) return;
        const proposal = {
            ...values,
            ...(mode === 'existing' ? { manufacturerId } : { manufacturer }),
            productCompliance: editableCompliance({
                ...values.productCompliance,
                ...(!allowsAntibiotic(values.category) && { containsAntibiotic: false }),
            }),
            conversionQuantity: packaged ? values.conversionQuantity : null,
            conversionUnit: packaged ? values.conversionUnit : null,
        };
        const missing = proposalMissingFields(proposal, { requireUploadedImages: false });
        if (!files.length) missing.push('ít nhất một ảnh nhãn');
        if (missing.length) { message.error(`Hồ sơ đề xuất cần bổ sung: ${missing.join(', ')}.`); return; }
        const selectionError =
            templateMaterialSelectionError(proposal, { environment, feedOnly, production }) ||
            validateSelection?.(proposal);
        if (selectionError) {
            message.error(selectionError);
            return;
        }
        submitting.current = true;
        setUploading(true);
        try {
            const existingUrls = files.flatMap((file) => {
                const url = file.url || uploaded.current.get(file.uid);
                return url ? [url] : [];
            });
            try {
                await expertProtocolTemplateAPI.validateMaterialProposal({
                    farmId,
                    proposal: { ...proposal, imageUrls: existingUrls },
                    pendingImageCount: files.length - existingUrls.length,
                    environment,
                    production,
                });
            } catch (error) {
                if (mounted.current) message.error(getErrorMessage(error, 'Chưa thể kiểm tra đề xuất vật tư.'));
                return;
            }
            if (!mounted.current) return;
            const imageUrls = [];
            for (const file of files) {
                let url = file.url || uploaded.current.get(file.uid);
                if (!url) {
                    const response = await cloudinaryAPI.uploadImage(
                        file.originFileObj ?? file,
                        'smartshrimp/protocol-materials',
                    );
                    if (!mounted.current) return;
                    url = response.data.secure_url;
                    if (!url?.startsWith('https://')) throw new Error('Invalid image URL');
                    uploaded.current.set(file.uid, url);
                }
                imageUrls.push(url);
            }
            onSelect({ ...proposal, imageUrls });
        } catch {
            if (mounted.current) message.error('Không tải được ảnh nhãn. Vui lòng thử lại.');
        } finally {
            submitting.current = false;
            if (mounted.current) setUploading(false);
        }
    };
    return (
        <Form
            form={form}
            layout="vertical"
            onFinish={submit}
            disabled={uploading}
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
                        onChange={(value) => {
                            if (allowsAntibiotic(value) !== allowsAntibiotic(category))
                                form.setFieldValue(['productCompliance', 'containsAntibiotic'], undefined);
                        }}
                        options={materialCategories.filter(({ value }) =>
                            categoryFits(value, environment, feedOnly),
                        )}
                    />
                </Form.Item>
                <Form.Item name="unit" label="Đơn vị nhập kho" rules={[{ required: true }]}>
                    <Select options={materialUnitOptions} />
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
                        rules={[
                            { required: true, whitespace: true, max: 255 },
                            {
                                validator: async (_, value) => {
                                    const error = proposedManufacturerNameError(
                                        value, reservedSupplierNames, manufacturers,
                                    );
                                    if (error) throw new Error(error);
                                },
                            },
                        ]}
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
                    <Form.Item
                        name={['manufacturer', 'phone']}
                        label="Số điện thoại"
                        rules={[{
                            required: true,
                            validator: async (_, value) => {
                                const error = supplierPhoneError(value);
                                if (error) throw new Error(error);
                            },
                        }]}
                    >
                        <Input
                            type="tel"
                            maxLength={supplierPhoneInputLimit}
                            placeholder="090 123 4567 hoặc +1 202 555 0123"
                        />
                    </Form.Item>
                    <Form.Item
                        name={['manufacturer', 'address']}
                        label="Địa chỉ"
                        rules={[{ required: true, whitespace: true, max: 1000 }]}
                    >
                        <Input maxLength={1000} />
                    </Form.Item>
                    {[
                        ['contactName', 'Người liên hệ', 255],
                        ['email', 'Email', 320],
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
                                              transform: (value) => value?.trim(),
                                              message: 'Email không hợp lệ.',
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
            <ProductComplianceFields requiredComplete showAntibioticField={allowsAntibiotic(category)} />
            <Form.Item label="Ảnh nhãn vật tư" required>
                <Upload
                    listType="picture-card"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    maxCount={3}
                    fileList={files}
                    onChange={({ fileList }) => setFiles(fileList)}
                    itemRender={(_, file, __, { remove }) => (
                        <div className="relative h-full w-full">
                            <button
                                type="button"
                                className="h-full w-full cursor-zoom-in overflow-hidden rounded-lg border border-[#dce4ee]"
                                aria-label={`Xem ${file.name}`}
                                disabled={uploading}
                                onClick={() => previewImage(file)}
                            >
                                {(file.url || file.thumbUrl) && (
                                    <img
                                        src={file.url || file.thumbUrl}
                                        alt={file.name}
                                        className="h-full w-full object-contain"
                                    />
                                )}
                            </button>
                            <Button
                                type="text"
                                size="small"
                                className="absolute! right-1! top-1! bg-white! shadow-sm"
                                aria-label={`Gỡ ${file.name}`}
                                icon={<CloseOutlined />}
                                onClick={remove}
                            />
                        </div>
                    )}
                    beforeUpload={(file, selection) => {
                        if (files.length + selection.length > 3) {
                            if (file.uid === selection[0].uid) message.error('Chỉ được chọn tối đa 3 ảnh nhãn.');
                            return Upload.LIST_IGNORE;
                        }
                        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
                            file.size > 5 * 1024 * 1024) {
                            message.error(
                                'Tối đa 3 ảnh JPG, PNG hoặc WebP; mỗi ảnh không quá 5 MB.',
                            );
                            return Upload.LIST_IGNORE;
                        }
                        return false;
                    }}
                >
                    {files.length < 3 && (
                        <Flex vertical gap={4}>
                            <PlusOutlined />
                            <Text>{'Thêm ảnh'}</Text>
                        </Flex>
                    )}
                </Upload>
                {previewUrl && (
                    <Image
                        src={previewUrl}
                        alt="Ảnh nhãn vật tư"
                        style={{ display: 'none' }}
                        preview={{
                            visible: true,
                            zIndex: 2000,
                            onVisibleChange: (open) => {
                                if (!open) setPreviewUrl(null);
                            },
                        }}
                    />
                )}
                <Text className="text-xs! text-[#8796ae]!">
                    {
                        'Chọn 1–3 ảnh nhãn JPG, PNG hoặc WebP, mỗi ảnh tối đa 5 MB. Ảnh chỉ tải lên khi xác nhận đề xuất.'
                    }
                </Text>
            </Form.Item>
            <Form.Item name="description" label="Mô tả" rules={[{ max: 500 }]}>
                <Input.TextArea maxLength={500} rows={2} />
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
                    placeholder="Lý do lựa chọn vật tư, điều kiện sử dụng và lưu ý cần Chủ trại kiểm tra…"
                />
            </Form.Item>
            <Flex justify="end" gap={8}>
                <Button onClick={onBack}>{'Quay lại danh sách'}</Button>
                <Button
                    htmlType="submit"
                    loading={uploading}
                    icon={<SendOutlined />}
                    className={primaryButton}
                >
                    {initialValues ? 'Cập nhật đề xuất' : 'Thêm vào phác đồ'}
                </Button>
            </Flex>
        </Form>
    );
};

/** One farm-scoped selection per popup; all inventory values are read from the API. */
const ExpertProtocolMaterialPicker = ({
    production = true,
    farm,
    manufacturers = [],
    reservedSupplierNames = manufacturers.map(({ name }) => supplierNameKey(name)),
    environment = false,
    proposedMaterials = [],
    feedOnly = false,
    onSelect,
    validateSelection,
    onUpdateProposal,
    proposalEditOptions,
    onClose,
}) => {
    const { message } = App.useApp();
    const [tab, setTab] = useState('warehouse');
    const [search, setSearch] = useState('');
    const [query, setQuery] = useState({
        search: '',
        group: feedOnly ? 'FEED' : 'ALL',
        page: 1,
        limit: 5,
    });
    const [revision, setRevision] = useState(0);
    const [detail, setDetail] = useState(null);
    const [editableProposal, setEditableProposal] = useState(null);
    const [uploading, setUploading] = useState(false);
    const proposals = uniqueTemplateProposals(proposedMaterials);
    const proposed = tab === 'proposed';
    const visibleProposals = proposals
        .filter(
            (product) =>
                (query.group === 'ALL' || product.category === query.group) &&
                (!feedOnly || product.category === 'FEED') &&
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
        templateMaterialSelectionError(product, { environment, feedOnly, production });
    const canSelect = (product) => !selectionError(product);
    const editOptions = editableProposal && proposalEditOptions?.(editableProposal);
    const selectProduct = (product) => {
        const { _proposalKey, ...content } = product;
        void _proposalKey;
        const error = validateSelection?.(content);
        if (error) {
            message.info(error);
            return;
        }
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
                            getErrorMessage(error, 'Không thể tải vật tư. Vui lòng thử lại.'),
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
            key: 'edit-proposal',
            width: 40,
            render: (_, product) => onUpdateProposal && (!proposalEditOptions || proposalEditOptions(product)) && (
                <Tooltip title="Sửa đề xuất">
                    <Button
                        type="text"
                        icon={<EditOutlined />}
                        aria-label={`Sửa đề xuất ${product.name}`}
                        onClick={() => {
                            setEditableProposal(product);
                            setTab('recommendation');
                        }}
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
            onCancel={() => {
                if (!uploading) onClose();
            }}
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
                    if (uploading) return;
                    setEditableProposal(null);
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
                        label: editableProposal ? 'Chỉnh sửa đề xuất' : 'Đề xuất vật tư mới',
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
                            farmId={farm.id}
                            production={production}
                            feedOnly={feedOnly}
                            environment={editOptions?.environment ?? environment}
                            initialValues={editableProposal}
                            manufacturers={manufacturers}
                            reservedSupplierNames={reservedSupplierNames}
                            onSelect={editableProposal && onUpdateProposal ? (product) => {
                                onUpdateProposal(editableProposal, product);
                                setEditableProposal(null);
                                setTab('proposed');
                            } : onSelect}
                            validateSelection={editableProposal && onUpdateProposal
                                ? editOptions?.validate
                                : validateSelection}
                            uploading={uploading}
                            setUploading={setUploading}
                            onBack={() => {
                                setTab(editableProposal ? 'proposed' : 'warehouse');
                                setEditableProposal(null);
                            }}
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
                            <ErrorState message={state.error} onRetry={() => {
                                setRevision((current) => current + 1);
                                setState((current) => ({ ...current, loading: true, error: null }));
                            }} />
                        ) : (
                            <Table
                                rowKey={(product) => product.id || product._proposalKey}
                                columns={
                                    proposed
                                        ? columns.filter((column) => column.key !== 'stock')
                                        : columns.filter((column) => column.key !== 'edit-proposal')
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
