import { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Badge,
    Button,
    Card,
    Drawer,
    Empty,
    Flex,
    Tag,
    Tooltip,
    Typography,
} from 'antd';
import {
    ClockCircleOutlined,
    CloseOutlined,
    EditOutlined,
    HomeOutlined,
    SyncOutlined,
} from '@ant-design/icons';
import { expertProtocolTemplateAPI } from '../apis';
import Loading from './Loading';
import {
    formatTemplateDose,
    formatTemplateDuration,
    getTemplatePhases,
    templateMetricTone,
} from '../utils/protocolTemplateUtils';
import ProtocolProductImages from './ProtocolProductImages';

const { Paragraph, Text } = Typography;
const monoClassName = "font-['JetBrains_Mono',monospace]!";
const mutedClassName = 'text-[#6a7994]!';
const cardClassName = 'overflow-hidden! rounded-xl! [&>.ant-card-body]:p-0!';
const labelClassName =
    'text-[11px]! font-medium! uppercase! leading-4.125! tracking-[0.275px]! text-[#6a7994]!';
const updateDate = new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
});
const updatedLabel = (value) => {
    const parts = Object.fromEntries(
        updateDate
            .formatToParts(new Date(value))
            .map((part) => [part.type, part.value])
    );
    return `${parts.hour}:${parts.minute} ${parts.day}-${parts.month}`;
};
const operationTone = {
    FEEDING: { border: 'border-[#1d7ad6]/20!', dot: '#1d7ad6' },
    MEDICINE: { border: 'border-[#d43b57]/20!', dot: '#d43b57' },
    MINERAL: { border: 'border-[#0f9b8e]/20!', dot: '#0f9b8e' },
    CHEMICAL: { border: 'border-[#0f9b8e]/20!', dot: '#0f9b8e' },
    OTHER: { border: 'border-[#8796ae]/20!', dot: '#8796ae' },
};

export const ProtocolTemplateMetricTag = ({
    metric,
    value,
    children,
    compact = false,
}) => (
    <Tag
        className={`m-0! inline-flex! min-w-12! items-center! justify-center! rounded-md! border-0! px-2! text-xs! font-semibold! leading-4.5! ${compact ? 'h-5.5!' : 'h-6!'} ${monoClassName} ${templateMetricTone(metric, value)}`}
    >
        {children}
    </Tag>
);

const ProductChip = ({ item }) => (
    <Tooltip
        title={[
            item.instructions,
            item.product.recommendationReason,
            item.product.isRecommendation
                ? 'Vật tư đề xuất: Owner cần tạo sản phẩm và nhập kho trước khi duyệt phác đồ áp dụng.'
                : null,
        ]
            .filter(Boolean)
            .join('\n')}
    >
        <Flex
            align="center"
            gap={8}
            tabIndex={item.instructions ? 0 : undefined}
            className={`min-h-10.5! w-fit! max-w-full! rounded-lg! border! bg-white! px-2.5! py-1! ${operationTone[item.operationType].border}`}
        >
            <Badge
                color={operationTone[item.operationType].dot}
                className="shrink-0! [&_.ant-badge-status-dot]:size-1.5!"
            />
            <ProtocolProductImages product={item.product} />
            <Text className="min-w-0! text-xs! font-medium! leading-4.5! text-[#0f1c2e]!">
                {item.product.name}
            </Text>
            <Text
                className={`text-xs! leading-4.5! ${monoClassName} ${mutedClassName}`}
            >
                {formatTemplateDose({
                    ...item,
                    doseValue: item.displayDoseValue ?? item.doseValue,
                })}
                {(item.dailyDoseIncrement ?? 0) > 0 && (
                    <Text className="whitespace-nowrap! text-xs! text-[#6a7994]!">
                        (+
                        {new Intl.NumberFormat('vi-VN', {
                            maximumFractionDigits: 4,
                        }).format(item.dailyDoseIncrement)}{' '}
                        {item.doseUnit.toLowerCase()}
                        {'/cữ/ngày)'}
                    </Text>
                )}
            </Text>
            {item.displayApplicationDays && (
                <Text
                    className="block! max-w-64! text-[11px]! text-[#6a7994]!"
                    title={`Ngày áp dụng: DOC ${item.displayApplicationDays.join(', ')}`}
                >
                    {item.repeatIntervalDays === 1
                        ? `DOC ${item.displayStartDay}–${item.displayEndDay}`
                        : `DOC ${item.displayApplicationDays.slice(0, 8).join(', ')}${item.displayApplicationDays.length > 8 ? '…' : ''}`}
                </Text>
            )}
            {item.mealNumber === null && (
                <Text className="text-[11px]! text-[#6a7994]!">
                    DOC {item.displayStartDay}–{item.displayEndDay}
                </Text>
            )}
        </Flex>
    </Tooltip>
);

const SummaryMetric = ({ label, children }) => (
    <Flex
        vertical
        gap={6}
        className="min-h-22.25! min-w-0! border-r! border-[#eef1f7]! px-4! py-3! last:border-r-0! max-[600px]:border-b!"
    >
        <Text className={labelClassName}>{label}</Text>
        {children}
    </Flex>
);

const TemplateSummary = ({ template }) => (
    <Card className={`${cardClassName} border-[#eef1f7]!`}>
        <Flex
            align="center"
            wrap
            gap={10}
            className="min-h-11! border-b! border-[#eef1f7]! bg-[#eef1f6]/70! px-4! py-3!"
        >
            <Text className="text-[12.5px]! font-semibold! leading-4.75! text-[#0f1c2e]!">
                <HomeOutlined className="mr-1.5" />
                {template.farm.name}
            </Text>
            <Text className="text-[12.5px]! font-semibold! leading-4.75! text-[#0f1c2e]!">
                -
            </Text>
            <Text className="text-[12.5px]! leading-4.75! text-[#3a4a63]!">
                {template.shrimpType === 'WHITELEG'
                    ? 'Tôm thẻ chân trắng'
                    : template.shrimpType === 'BLACK_TIGER'
                      ? 'Tôm sú'
                      : 'Tất cả loài tôm'}
            </Text>
            <Text
                className={`ml-auto! text-[12.5px]! leading-4.75! ${mutedClassName}`}
            >
                <ClockCircleOutlined className="mr-1.5" />
                {'Cập nhật'} {updatedLabel(template.updatedAt)}
            </Text>
        </Flex>
        <Flex className="grid! grid-cols-4! max-[600px]:grid-cols-2!">
            <SummaryMetric label="Thời lượng">
                <Text className="text-[15px]! font-semibold! leading-5.625! text-[#0f1c2e]!">
                    {formatTemplateDuration(template.duration)}
                </Text>
                {template.duration && (
                    <Text
                        className={`-mt-1! text-[11px]! leading-4.125! ${mutedClassName}`}
                    >
                        {template.duration.endDay -
                            template.duration.startDay +
                            1}{' '}
                        {'ngày'}
                    </Text>
                )}
            </SummaryMetric>
            <SummaryMetric label="Sai lệch cho phép">
                <Flex className="pt-0.5!">
                    <ProtocolTemplateMetricTag
                        compact
                        metric="variance"
                        value={template.allowedVariancePct}
                    >
                        ±{template.allowedVariancePct}%
                    </ProtocolTemplateMetricTag>
                </Flex>
            </SummaryMetric>
            <SummaryMetric label="Đã dùng">
                <Flex className="pt-0.5!">
                    <ProtocolTemplateMetricTag
                        compact
                        metric="uses"
                        value={template.usedSeasonCount}
                    >
                        {template.usedSeasonCount} {'vụ'}
                    </ProtocolTemplateMetricTag>
                </Flex>
            </SummaryMetric>
            <SummaryMetric label="Phiên bản">
                <Flex className="pt-0.5!">
                    <ProtocolTemplateMetricTag
                        compact
                        metric="version"
                        value={template.versionNo}
                    >
                        v{template.versionNo}
                    </ProtocolTemplateMetricTag>
                </Flex>
                <Text
                    className={`-mt-1! text-[11px]! leading-4.125! ${mutedClassName}`}
                >
                    {template.versionNo - 1} {'lần chỉnh sửa'}
                </Text>
            </SummaryMetric>
        </Flex>
        <Paragraph className="m-0! border-t! border-[#eef1f7]! px-4! py-3! text-[12.5px]! leading-5! text-[#3a4a63]!">
            <Text className="mr-1! text-[12.5px]! font-semibold! text-[#0f1c2e]!">
                {'Mô tả:'}
            </Text>
            {template.description || 'Chưa có mô tả.'}
        </Paragraph>
    </Card>
);

const PhaseCard = ({ phase, index }) => (
    <Card className={`${cardClassName} border-[#e5e8f0]!`}>
        <Flex
            justify="space-between"
            align="center"
            wrap
            gap={8}
            className="min-h-10! border-b! border-[#eef1f7]! bg-[#f6f9fc]! px-4! py-2.5!"
        >
            <Flex align="center" gap={10}>
                <Text className="font-['Sora',sans-serif]! text-[13px]! font-semibold! leading-4.875! text-[#0f1c2e]!">
                    {'Giai đoạn'} {index + 1}
                </Text>
                <Text className={`text-xs! text-[#3a4a63]! ${monoClassName}`}>
                    DOC {phase.startDay}–{phase.endDay}
                </Text>
            </Flex>
            <Text className={`text-xs! leading-4.5! ${mutedClassName}`}>
                {phase.mealCount} {'cữ'}
                {phase.dailyMeals ? '/ngày' : ' ăn'} · {phase.environmentCount}{' '}
                {'xử lý môi trường'}
            </Text>
        </Flex>
        {phase.rows.map((row) => (
            <Flex
                key={row.key}
                align="start"
                gap={12}
                className={`min-h-15.5! border-b! border-[#eef1f7]! px-4! py-2.5! last:border-b-0! max-[500px]:flex-col! ${row.isEnvironment ? 'bg-[#f3fafa]!' : ''}`}
            >
                <Flex vertical gap={0} className="w-22! shrink-0!">
                    <Text
                        className={`text-xs! font-semibold! leading-4.5! ${row.isEnvironment ? 'text-[#0f9b8e]!' : 'text-[#0f1c2e]!'}`}
                    >
                        {row.isEnvironment
                            ? 'Môi trường'
                            : row.mealNumber
                              ? `Cữ ${row.mealNumber}`
                              : row.operationType === 'MEDICINE'
                                ? 'Thuốc'
                                : 'Hoạt động'}
                    </Text>
                    <Text
                        className={`text-xs! leading-4.5! ${monoClassName} ${mutedClassName}`}
                    >
                        {row.plannedTime ?? '—'}
                    </Text>
                </Flex>
                <Flex wrap align="center" gap={6} className="min-w-0! flex-1!">
                    {row.items.map((item) => (
                        <ProductChip key={item.id} item={item} />
                    ))}
                    {row.isEnvironment && row.repeatIntervalDays > 1 && (
                        <Tag
                            icon={<SyncOutlined />}
                            className="m-0! rounded-md! border-0! bg-[#cbfbf1]/70! px-2! py-0.5! text-[11.5px]! font-medium! leading-4.25! text-[#00786f]!"
                        >
                            {'Lặp mỗi'} {row.repeatIntervalDays} {'ngày'}
                        </Tag>
                    )}
                    {row.isEnvironment &&
                        row.items.every(
                            (item) => item.startDay === item.endDay
                        ) && (
                            <Tag className="m-0! border-0! bg-[#cbfbf1]/70! text-[#00786f]!">
                                {'Một lần · DOC'} {row.items[0].startDay}
                            </Tag>
                        )}
                </Flex>
            </Flex>
        ))}
    </Card>
);

const ExpertProtocolTemplateDetail = ({
    templateId,
    title,
    onClose,
    onEdit,
}) => {
    const [revision, setRevision] = useState(0);
    const [state, setState] = useState({
        id: null,
        template: null,
        error: null,
        loading: false,
    });
    const loading =
        Boolean(templateId) && (state.id !== templateId || state.loading);

    useEffect(() => {
        if (!templateId) return;
        const controller = new AbortController();
        expertProtocolTemplateAPI
            .getTemplate(templateId, controller.signal)
            .then((template) => {
                if (!controller.signal.aborted)
                    setState({
                        id: templateId,
                        template,
                        error: null,
                        loading: false,
                    });
            })
            .catch((error) => {
                if (controller.signal.aborted) return;
                setState({
                    id: templateId,
                    template: null,
                    loading: false,
                    error:
                        error.response?.data?.message ||
                        (error.message ===
                        'Dữ liệu chi tiết phác đồ mẫu không hợp lệ.'
                            ? error.message
                            : 'Không thể tải chi tiết phác đồ mẫu.'),
                });
            });
        return () => controller.abort();
    }, [templateId, revision]);

    const template = state.id === templateId ? state.template : null;
    const phases = useMemo(
        () => (template ? getTemplatePhases(template.items) : []),
        [template]
    );
    return (
        <Drawer
            open={Boolean(templateId)}
            onClose={onClose}
            placement="right"
            width={860}
            destroyOnHidden
            rootClassName="[&_.ant-drawer-content-wrapper]:max-w-full!"
            closeIcon={<CloseOutlined className="text-[15px] text-[#6a7994]" />}
            title={
                <Text
                    ellipsis={{ tooltip: template?.title || title }}
                    className="font-['Sora',sans-serif]! text-[15px]! font-semibold! leading-6! text-[#0f1c2e]!"
                >
                    {template?.title || title || 'Chi tiết phác đồ mẫu'}
                </Text>
            }
            extra={
                <Tooltip title="Chỉnh sửa phác đồ mẫu">
                    <Button
                        onClick={onEdit}
                        disabled={!template || loading}
                        type="text"
                        icon={<EditOutlined />}
                        aria-label="Sửa phác đồ mẫu"
                        className="size-6.75! min-w-6.75! rounded-full! p-0! text-[13px]! text-[#8796ae]! opacity-100!"
                    />
                </Tooltip>
            }
            classNames={{
                header: 'min-h-15! border-[#0c378d]/7! px-6! py-4! [&_.ant-drawer-close]:mr-2! [&_.ant-drawer-close]:size-5.75! [&_.ant-drawer-close]:p-1!',
                body: 'flex! min-h-0! min-w-0! flex-col! overflow-y-auto! p-6! max-[600px]:p-4!',
            }}
        >
            {loading ? (
                <Loading
                    className="min-h-0! w-full! flex-1!"
                    tip="Đang tải chi tiết phác đồ mẫu"
                />
            ) : state.error ? (
                <Alert
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
                                setRevision((current) => current + 1);
                            }}
                        >
                            {'Thử lại'}
                        </Button>
                    }
                />
            ) : (
                template && (
                    <Flex vertical gap={0}>
                        <TemplateSummary template={template} />
                        <Text className="mb-1.5! mt-5! text-[11px]! font-medium! uppercase! leading-4.25! tracking-[0.4px]! text-[#6a7994]!">
                            {'Lịch cữ ăn & xử lý theo DOC'}
                        </Text>
                        <Flex vertical gap={16}>
                            {phases.length ? (
                                phases.map((phase, index) => (
                                    <PhaseCard
                                        key={phase.startDay}
                                        phase={phase}
                                        index={index}
                                    />
                                ))
                            ) : (
                                <Empty description="Phác đồ mẫu chưa có hoạt động" />
                            )}
                        </Flex>
                    </Flex>
                )
            )}
        </Drawer>
    );
};

export default ExpertProtocolTemplateDetail;
