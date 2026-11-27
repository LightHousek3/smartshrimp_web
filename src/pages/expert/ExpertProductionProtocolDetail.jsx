import { executionTimeRange, mealExecutionWindow } from '../../utils/protocolTiming';
import {
    Alert,
    Badge,
    Button,
    ConfigProvider,
    Drawer,
    Empty,
    Space,
    Tabs,
    Tag,
    Timeline,
    Tooltip,
    Typography,
} from 'antd';
import { EditOutlined, EyeOutlined, SendOutlined } from '@ant-design/icons';
import { useState } from 'react';
import ProtocolMaterialDetail from '../../components/ProtocolMaterialDetail';
import ProtocolProductImages from '../../components/ProtocolProductImages';
import ProtocolMaterialBadges from '../../components/ProtocolMaterialBadges';
import { formatProtocolNumber } from '../../utils/protocolTemplateUtils';
import ProtocolExecutionSchedule from '../../components/ProtocolExecutionSchedule';
import {
    OPERATION_COLORS,
    PROTOCOL_PRIMARY_BUTTON,
    PROTOCOL_STATUS_COLORS,
    PROTOCOL_STATUS_LABELS,
    PROTOCOL_THEME,
} from '../../constants/productionProtocol';
import { expertStyle as styles } from '../../constants/expertStyle';
import Loading from '../../components/Loading';
import ErrorState from '../../components/ErrorState';

const dateText = (value) =>
    value ? new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : '—';
const dayNumber = (offset) => offset == null ? undefined : offset + 1;
const itemMaterial = (item) =>
    item.materialSnapshot ?? item.product ?? item.recommendedProductDetails?.proposed;
/** Use one loaded prescription snapshot for content and execution tabs. */
const ExpertProductionProtocolDetail = ({
    detail,
    loading = false,
    error,
    title = 'Chi tiết phác đồ nuôi',
    onRetry,
    onClose,
    onEdit,
    onSubmit,
    onDelete,
    onStop,
    onRefresh,
    submitBusy = false,
}) => {
    const treatment = detail?.protocolType === 'TREATMENT';
    const [material, setMaterial] = useState(null);
    const [activeTab, setActiveTab] = useState('content');
    const pending = loading || error || !detail;
    const inspect = (item, showProposal = false) => {
        const proposal = item.recommendedProductDetails?.proposed;
        const product = item.materialSnapshot ?? item.product;
        const inspected = proposal && (showProposal || !product)
                ? {
                      ...proposal,
                      category: proposal.category?.toUpperCase(),
                      unit: proposal.unit?.toUpperCase(),
                      conversionUnit: proposal.conversionUnit?.toUpperCase(),
                      manufacturerId: item.recommendedManufacturerId ?? proposal.manufacturerId,
                  }
                : product;
        if (inspected) setMaterial({ product: inspected, instructions: item.instructions });
    };
    return (
        <ConfigProvider theme={PROTOCOL_THEME}>
            <Drawer
                open
                width={activeTab === 'execution' ? 'min(1200px, 100vw)' : 880}
                className={styles.drawer}
                rootClassName="[&_.ant-drawer-content-wrapper]:max-w-full!"
                classNames={{ body: pending ? 'flex! flex-col!' : undefined }}
                closable={!submitBusy}
                maskClosable={!submitBusy}
                keyboard={!submitBusy}
                onClose={onClose}
                title={
                    pending ? (
                        detail?.title || title
                    ) : (
                        <Space wrap>
                            <span className={styles.mono}>v{detail.versionNo}</span>
                            <span>{detail.title}</span>
                            <Tag
                                className={styles.pill}
                                color={PROTOCOL_STATUS_COLORS[detail.status]}
                            >
                                {PROTOCOL_STATUS_LABELS[detail.status]}
                            </Tag>
                        </Space>
                    )
                }
                extra={
                    !pending && (
                        <Space wrap>
                            {detail.availableActions.update && onEdit && (
                                <Button
                                    icon={<EditOutlined />}
                                    onClick={onEdit}
                                    disabled={submitBusy}
                                >
                                    Chỉnh sửa
                                </Button>
                            )}
                            {detail.availableActions.submit && onSubmit && (
                                <Button
                                    type="primary"
                                    className={PROTOCOL_PRIMARY_BUTTON}
                                    icon={<SendOutlined />}
                                    loading={submitBusy}
                                    onClick={onSubmit}
                                >
                                    Gửi duyệt
                                </Button>
                            )}
                            {detail.availableActions.delete && onDelete && (
                                <Button danger onClick={onDelete} disabled={submitBusy}>
                                    Xóa nháp
                                </Button>
                            )}
                            {detail.availableActions.stop && onStop && (
                                <Button danger onClick={onStop} disabled={submitBusy}>
                                    {detail.status === 'APPROVED'
                                        ? 'Hủy kế hoạch điều trị'
                                        : 'Dừng điều trị'}
                                </Button>
                            )}
                            {onRefresh && (
                                <Button onClick={onRefresh} disabled={submitBusy}>
                                    Làm mới
                                </Button>
                            )}
                        </Space>
                    )
                }
            >
                {pending ? (
                    error ? (
                        <ErrorState message={error} onRetry={onRetry} />
                    ) : (
                        <Loading
                            className="min-h-0! w-full! flex-1!"
                            tip="Đang tải chi tiết phác đồ"
                        />
                    )
                ) : (
                    <Tabs
                        activeKey={activeTab}
                        onChange={setActiveTab}
                        items={[
                            {
                                key: 'content',
                                label: 'Nội dung',
                                children: (
                                    <>
                                        {detail.rejectionReason && (
                                            <Alert
                                                type="error"
                                                showIcon
                                                className="mb-4! rounded-[14px]! p-5!"
                                                message="Chủ trại từ chối"
                                                description={detail.rejectionReason}
                                            />
                                        )}
                                        {detail.status === 'ABORTED' && (
                                            <Alert
                                                type="error"
                                                showIcon
                                                className="mb-4! rounded-[14px]! p-4! border-[#fecdd3]! bg-[#fff1f2]! text-[#9f1239]!"
                                                message={
                                                    <span className="font-bold">
                                                        Đã dừng lúc {dateText(detail.abortedAt)}
                                                    </span>
                                                }
                                                description={
                                                    detail.abortReason ||
                                                    'Chuyên gia đã dừng phác đồ.'
                                                }
                                            />
                                        )}
                                        <div className={styles.viewMeta}>
                                            <div>
                                                <span>Loại:</span>
                                                {treatment ? 'Phác đồ điều trị' : 'Phác đồ nuôi'}
                                            </div>
                                            <div>
                                                <span>Ngưỡng sai lệch:</span>
                                                {detail.allowedVariancePct == null
                                                    ? 'Chưa cấu hình (bản cũ)'
                                                    : `±${detail.allowedVariancePct}%`}
                                            </div>
                                            <div>
                                                <span>Sinh lịch trước:</span>
                                                {detail.rollingWindowDays} ngày
                                            </div>
                                            {treatment && (
                                                <div className="whitespace-nowrap">
                                                    <span>Bắt đầu điều trị:</span>
                                                    {dateText(detail.treatmentStartAt)}
                                                </div>
                                            )}
                                            <div className="whitespace-nowrap">
                                                <span>Gửi duyệt:</span>
                                                {dateText(detail.submittedAt)}
                                            </div>
                                            <div className="whitespace-nowrap">
                                                <span>Duyệt:</span>
                                                {dateText(detail.reviewedAt)}
                                            </div>
                                            <div>
                                                <span>Phiên bản:</span>v{detail.versionNo}
                                            </div>
                                            <div>
                                                <span>Nguồn:</span>
                                                {detail.sourceTemplateSnapshot
                                                    ? `${detail.sourceTemplateSnapshot.name} · v${detail.sourceTemplateSnapshot.version}`
                                                    : detail.sourceTemplateId
                                                      ? 'Mẫu cũ · chưa xác định phiên bản nguồn'
                                                      : 'Tạo trực tiếp'}
                                            </div>
                                            <div className="col-span-full">
                                                <span>Ghi chú:</span>
                                                {detail.summary || '—'}
                                            </div>
                                        </div>
                                        {detail.metrics && (
                                            <div className="mb-5 p-3.5 bg-[#f8fafc] border border-[#eef2f6] rounded-xl">
                                                <div className="flex justify-between items-center text-xs mb-1.5">
                                                    <span className="font-bold text-[11px] uppercase tracking-wider text-[#6a7994]">
                                                        Tiến độ lịch đã sinh
                                                    </span>
                                                    <span className="font-mono font-bold text-[#0f1c2e]">
                                                        {detail.metrics.completedCount || 0}/
                                                        {detail.metrics.totalSchedules ||
                                                            detail.metrics.completedCount +
                                                                detail.metrics.plannedCount +
                                                                detail.metrics.cancelledCount ||
                                                            0}{' '}
                                                        lịch
                                                    </span>
                                                </div>
                                                <div className="w-full bg-[#e2e8f0] h-2 rounded-full overflow-hidden">
                                                    <div
                                                        className="bg-[#0284c7] h-full rounded-full transition-all"
                                                        style={{
                                                            width: `${Math.min(100, Math.round(((detail.metrics.completedCount || 0) / (detail.metrics.totalSchedules || detail.metrics.completedCount + detail.metrics.plannedCount + detail.metrics.cancelledCount || 1)) * 100))}%`,
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                        <Typography.Paragraph className="mb-2! text-[11px]! font-semibold! tracking-wider! text-[#6a7994]!">
                                            LỊCH CỮ ĂN & XỬ LÝ
                                        </Typography.Paragraph>
                                        {!detail.stages.length && (
                                            <Empty
                                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                                description="Phác đồ chưa có giai đoạn"
                                            />
                                        )}
                                        {detail.stages.map((stage, stageIndex) => (
                                            <section className={styles.stage} key={stage.id}>
                                                <div className={styles.stageHeading}>
                                                    <strong>Giai đoạn {stageIndex + 1}</strong>
                                                    <span className={styles.mono}>
                                                        {treatment ? 'Ngày điều trị' : 'DOC'}{' '}
                                                        {stage.startDayOffset + 1}–
                                                        {stage.endDayOffset + 1}
                                                    </span>
                                                    <span className="ml-auto text-xs text-[#6a7994]">
                                                        {
                                                            stage.meals.filter(
                                                                (meal) => meal.mealNumber != null,
                                                            ).length
                                                        }{' '}
                                                        cữ/ngày ·{' '}
                                                        {stage.meals
                                                            .filter(
                                                                (meal) => meal.mealNumber == null,
                                                            )
                                                            .reduce(
                                                                (sum, meal) =>
                                                                    sum + meal.items.length,
                                                                0,
                                                            )}{' '}
                                                        xử lý môi trường
                                                    </span>
                                                </div>
                                                {stage.meals.map((meal) => (
                                                    <div
                                                        key={meal.id}
                                                        className={`${styles.viewMeal} ${meal.mealNumber == null ? styles.environment : ''}`}
                                                    >
                                                        <div>
                                                            <Typography.Text
                                                                className={
                                                                    meal.mealNumber == null
                                                                        ? styles.environmentLabel
                                                                        : 'text-xs!'
                                                                }
                                                            >
                                                                {meal.mealNumber == null
                                                                    ? 'Môi trường'
                                                                    : `Cữ ${meal.mealNumber}`}
                                                            </Typography.Text>
                                                            <div className={styles.mono}>
                                                                {meal.mealNumber == null
                                                                    ? meal.plannedTime?.slice(0, 5) || 'Chưa đặt giờ'
                                                                    : executionTimeRange(meal.plannedTime, mealExecutionWindow(meal))}
                                                            </div>
                                                        </div>
                                                        <div className={styles.viewChips}>
                                                            {meal.items.map((item) => (
                                                                <Tooltip
                                                                    key={item.id}
                                                                    trigger={['hover', 'focus']}
                                                                    title={item.instructions?.trim() ? `Hướng dẫn: ${item.instructions.trim()}` : null}
                                                                >
                                                                    <div
                                                                        tabIndex={0}
                                                                        className={`${styles.viewChip} max-w-full flex-wrap`}
                                                                    >
                                                                        <Badge
                                                                            className={styles.dot}
                                                                            color={
                                                                                OPERATION_COLORS[
                                                                                    item
                                                                                        .operationType
                                                                                ]
                                                                            }
                                                                        />
                                                                        <ProtocolProductImages
                                                                            product={itemMaterial(item) ?? { name: 'Vật tư' }}
                                                                        />
                                                                        <span className="min-w-0 break-words">
                                                                            {itemMaterial(item)?.name ?? 'Vật tư không còn dữ liệu'}
                                                                        </span>
                                                                        <ProtocolMaterialBadges
                                                                            item={item}
                                                                            dayLabel={treatment ? 'Ngày điều trị' : 'DOC'}
                                                                            firstDay={dayNumber(item.firstDayOffset)}
                                                                            lastDay={dayNumber(item.lastDayOffset)}
                                                                        />
                                                                        {item.dueAtMinutes != null &&
                                                                            (meal.mealNumber == null ||
                                                                                meal.items.some((entry) => entry.dueAtMinutes !== item.dueAtMinutes)) && (
                                                                            <Tag>
                                                                                Khoảng thực hiện:{' '}
                                                                                {formatProtocolNumber(item.dueAtMinutes)}{' '}
                                                                                phút
                                                                            </Tag>
                                                                        )}
                                                                        {itemMaterial(item) && (
                                                                            <Button
                                                                                type="text"
                                                                                size="small"
                                                                                icon={<EyeOutlined />}
                                                                                aria-label={`Xem chi tiết ${itemMaterial(item).name}`}
                                                                                onClick={() =>
                                                                                    inspect(item)
                                                                                }
                                                                            />
                                                                        )}
                                                                        {item.recommendedProductDetails?.proposed &&
                                                                            (item.materialSnapshot || item.product) && (
                                                                            <Button
                                                                                type="link"
                                                                                size="small"
                                                                                onClick={() =>
                                                                                    inspect(
                                                                                        item,
                                                                                        true,
                                                                                    )
                                                                                }
                                                                            >
                                                                                Đề xuất gốc
                                                                            </Button>
                                                                        )}
                                                                    </div>
                                                                </Tooltip>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </section>
                                        ))}
                                        {detail.statusHistory.length > 0 && (
                                            <>
                                                <Typography.Title
                                                    level={5}
                                                    className="mt-6! text-sm!"
                                                >
                                                    Lịch sử phác đồ
                                                </Typography.Title>
                                                <Timeline
                                                    items={detail.statusHistory.map((entry) => ({
                                                        key: entry.id,
                                                        children: (
                                                            <>
                                                                <Typography.Text>
                                                                    {entry.fromStatus === entry.toStatus
                                                                        ? entry.eventLabel || 'Sự kiện phác đồ'
                                                                        : PROTOCOL_STATUS_LABELS[entry.toStatus] ||
                                                                          'Không xác định'}
                                                                </Typography.Text>
                                                                <Typography.Paragraph
                                                                    className="mb-0! text-xs!"
                                                                    type="secondary"
                                                                >
                                                                    {dateText(entry.changedAt)} ·{' '}
                                                                    {entry.changedByName ||
                                                                        'Hệ thống'}
                                                                </Typography.Paragraph>
                                                                {entry.reason && (
                                                                    <Typography.Paragraph>
                                                                        {entry.reason}
                                                                    </Typography.Paragraph>
                                                                )}
                                                            </>
                                                        ),
                                                    }))}
                                                />
                                            </>
                                        )}
                                    </>
                                ),
                            },
                            {
                                key: 'execution',
                                label: 'Thực hiện',
                                children: (
                                    <ProtocolExecutionSchedule key={detail.id} detail={detail} />
                                ),
                            },
                        ]}
                    />
                )}
            </Drawer>
            {material && (
                <ProtocolMaterialDetail
                    product={material.product}
                    instructions={material.instructions}
                    onClose={() => setMaterial(null)}
                />
            )}
        </ConfigProvider>
    );
};

export default ExpertProductionProtocolDetail;
