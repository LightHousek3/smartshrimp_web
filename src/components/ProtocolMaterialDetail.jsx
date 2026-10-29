import {
    Alert,
    Button,
    Descriptions,
    Flex,
    Modal,
    Tag,
    Typography,
} from 'antd';
import {
    materialCategories,
    materialUnitOptions,
} from '../utils/protocolTemplateUtils';
import ProtocolProductImages from './ProtocolProductImages';

const number = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 4 });
const categoryColors = {
    FEED: 'blue',
    MEDICINE: 'red',
    MINERAL: 'purple',
    CHEMICAL: 'cyan',
    OTHER: 'gold',
};
export const MaterialCategoryTag = ({ category }) => (
    <Tag
        color={categoryColors[category]}
        className="m-0! whitespace-nowrap! rounded-full! text-[11px]!"
    >
        {materialCategories.find(({ value }) => value === category)?.label ??
            'Chưa phân nhóm'}
    </Tag>
);
const regulatoryLabels = {
    unclassified: 'Chưa đủ căn cứ phân loại',
    feed: 'Thức ăn / thức ăn bổ sung',
    environment: 'Xử lý môi trường',
    dual_purpose: 'Hồ sơ cho cả hai mục đích',
    medicine: 'Thuốc thú y thủy sản',
};
const unitLabel = (unit) =>
    materialUnitOptions.find(({ value }) => value === unit)?.label ??
    unit?.toLowerCase();

/** Show the exact selected catalog/proposal snapshot without fetching materials outside the chosen farm. */
const ProtocolMaterialDetail = ({
    product,
    manufacturers = [],
    selectable,
    selectionError,
    onSelect,
    onClose,
}) => {
    const profile = product.productCompliance ?? {};
    const manufacturer =
        product.manufacturer ??
        manufacturers.find(({ id }) => id === product.manufacturerId);
    const information = [
        ['Nhóm', <MaterialCategoryTag category={product.category} />],
        ['Đơn vị', unitLabel(product.unit)],
        [
            'Quy cách',
            product.conversionQuantity != null
                ? `${number.format(product.conversionQuantity)} ${product.conversionUnit?.toLowerCase()} / ${unitLabel(product.unit)}`
                : null,
        ],
        ['Nhà sản xuất', manufacturer?.name],
        ['Địa chỉ', manufacturer?.address],
        [
            'Liên hệ',
            [
                manufacturer?.contactName,
                manufacturer?.phone,
                manufacturer?.email,
            ]
                .filter(Boolean)
                .join(' · '),
        ],
        ['Phân loại pháp lý', regulatoryLabels[profile.regulatoryType]],
        ['Mã tiếp nhận / số ĐKLH', profile.registrationNumber],
        [
            'Kết quả hồ sơ',
            product.id
                ? ({
                      reviewed: 'Đủ dữ liệu hồ sơ',
                      draft: 'Chờ bổ sung hồ sơ',
                      blocked: 'Đang bị chặn',
                  }[profile.complianceStatus] ?? 'Chưa có hồ sơ')
                : 'Hệ thống kiểm tra lại khi lưu phác đồ',
        ],
        ['Thành phần theo nhãn', profile.ingredientsText],
        [
            'Kháng sinh',
            profile.containsAntibiotic === true
                ? 'Có'
                : profile.containsAntibiotic === false
                  ? 'Đã đối chiếu: không có'
                  : 'Chưa xác định',
        ],
        ['Hướng dẫn theo nhãn', profile.usageInstructions],
        [
            'Thời gian ngừng thuốc',
            profile.withdrawalDays != null
                ? `${number.format(profile.withdrawalDays)} ngày`
                : 'Chưa xác định',
        ],
        [
            'Nguồn hồ sơ',
            profile.evidenceUrls?.length ? (
                <Flex vertical>
                    {profile.evidenceUrls.map((url, index) => (
                        <Typography.Link
                            key={url}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Hồ sơ {index + 1}
                        </Typography.Link>
                    ))}
                </Flex>
            ) : null,
        ],
        ['Lý do đề xuất', product.recommendationReason],
        ['Mô tả hiện có', product.description],
        ...(product.id
            ? [
                  [
                      'Tồn kho tham khảo',
                      product.stockQuantity != null
                          ? `${number.format(product.stockQuantity)} ${unitLabel(product.unit)} · ${product.lotCount ?? 0} lô`
                          : null,
                  ],
              ]
            : []),
    ];
    return (
        <Modal
            open
            centered
            title="Chi tiết vật tư"
            width={740}
            onCancel={onClose}
            styles={{
                body: {
                    maxHeight: '68dvh',
                    overflowY: 'auto',
                    overflowX: 'hidden',
                },
            }}
            footer={
                <Flex justify="end" gap={8}>
                    <Button onClick={onClose}>Đóng</Button>
                    <Button
                        type="primary"
                        disabled={!selectable}
                        onClick={onSelect}
                    >
                        Thêm vào phác đồ
                    </Button>
                </Flex>
            }
        >
            <Flex gap={16} align="center" className="mb-4! min-w-0!">
                <ProtocolProductImages product={product} size={88} />
                <Typography.Title
                    level={5}
                    className="m-0! min-w-0! break-words!"
                >
                    {product.name}
                </Typography.Title>
            </Flex>
            <Alert
                showIcon
                className="mb-4!"
                type={selectable ? 'info' : 'warning'}
                message={
                    selectionError ||
                    product.safety?.reason ||
                    (!product.id
                        ? 'Đây là vật tư đề xuất trong phác đồ hiện tại. Hệ thống kiểm tra lại hồ sơ khi anh/chị lưu mẫu; vật tư chưa được tạo vào kho.'
                        : 'Anh/chị đối chiếu hồ sơ và hướng dẫn trên nhãn trước khi chọn liều. Tồn kho chỉ để tham khảo, không được giữ chỗ khi lập mẫu.')
                }
            />
            <Descriptions
                column={1}
                size="small"
                bordered
                items={information.map(([label, value], index) => ({
                    key: index,
                    label,
                    children: (
                        <div className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                            {value ?? 'Chưa cung cấp'}
                        </div>
                    ),
                }))}
            />
        </Modal>
    );
};
export default ProtocolMaterialDetail;
