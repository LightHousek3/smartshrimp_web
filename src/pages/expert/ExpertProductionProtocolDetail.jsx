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
import { EditOutlined, ExperimentOutlined, SendOutlined } from '@ant-design/icons';
import { useState } from 'react';
import ProtocolMaterialDetail from '../../components/ProtocolMaterialDetail';
import ProtocolExecutionTable from '../../components/ProtocolExecutionTable';
import {
    DOSE_LABELS,
    OPERATION_COLORS,
    OPERATION_LABELS,
    PROTOCOL_PRIMARY_BUTTON,
    PROTOCOL_STATUS_COLORS,
    PROTOCOL_STATUS_LABELS,
    PROTOCOL_THEME,
    UNIT_LABELS,
} from '../../constants/productionProtocol';
import { expertStyle as styles } from '../../constants/expertStyle';
import Loading from '../../components/Loading';
import ErrorState from '../../components/ErrorState';

const dateText = (value) =>
    value ? new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : '—';
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
    const pending = loading || error || !detail;
    const inspect = (item, showProposal = false) => {
        const proposal = item.recommendedProductDetails?.proposed;
        const product = item.materialSnapshot ?? item.product;
        setMaterial(
            proposal && (showProposal || !product)
                ? {
                      ...proposal,
                      category: proposal.category?.toUpperCase(),
                      unit: proposal.unit?.toUpperCase(),
                      conversionUnit: proposal.conversionUnit?.toUpperCase(),
                      manufacturerId: item.recommendedManufacturerId ?? proposal.manufacturerId,
                  }
                : product
                  ? {
                        ...product,
                        productCompliance: product.compliance ?? product.productCompliance,
                    }
                  : null,
        );
    };
    return (
        <ConfigProvider theme={PROTOCOL_THEME}>
            <Drawer
                open
                width={880}
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
                        <Space>
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
                                                                {meal.plannedTime?.slice(0, 5) ||
                                                                    'Chưa đặt giờ'}
                                                            </div>
                                                        </div>
                                                        <div className={styles.viewChips}>
                                                            {meal.items.map((item) => (
                                                                <Tooltip
                                                                    key={item.id}
                                                                    title={
                                                                        <>
                                                                            {
                                                                                OPERATION_LABELS[
                                                                                    item
                                                                                        .operationType
                                                                                ]
                                                                            }{' '}
                                                                            · Mỗi{' '}
                                                                            {
                                                                                item.repeatIntervalDays
                                                                            }{' '}
                                                                            ngày
                                                                            {item.instructions &&
                                                                                ` · ${item.instructions}`}
                                                                        </>
                                                                    }
                                                                >
                                                                    <div
                                                                        className={styles.viewChip}
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
                                                                        <span
                                                                            className={`${styles.productAvatar} size-7! basis-7!`}
                                                                        >
                                                                            <ExperimentOutlined />
                                                                        </span>
                                                                        <span>
                                                                            {item.materialSnapshot
                                                                                ?.name ||
                                                                                item.product
                                                                                    ?.name ||
                                                                                item
                                                                                    .recommendedProductDetails
                                                                                    ?.proposed
                                                                                    ?.name}
                                                                        </span>
                                                                        <span
                                                                            className={styles.mono}
                                                                        >
                                                                            {item.doseValue}{' '}
                                                                            {
                                                                                UNIT_LABELS[
                                                                                    item.doseUnit
                                                                                ]
                                                                            }
                                                                            {item.doseBasis !==
                                                                                'FIXED_QUANTITY' &&
                                                                                ` ${DOSE_LABELS[item.doseBasis]}`}
                                                                        </span>
                                                                        {item.repeatIntervalDays >
                                                                            1 && (
                                                                            <Tag
                                                                                color="cyan"
                                                                                className="m-0! rounded-md! border-0! text-[10px]!"
                                                                            >
                                                                                Lặp mỗi{' '}
                                                                                {
                                                                                    item.repeatIntervalDays
                                                                                }{' '}
                                                                                ngày
                                                                            </Tag>
                                                                        )}
                                                                        {item.firstDayOffset !=
                                                                            null && (
                                                                            <Tag>
                                                                                {treatment
                                                                                    ? 'Ngày điều trị'
                                                                                    : 'DOC'}{' '}
                                                                                {item.firstDayOffset +
                                                                                    1}
                                                                                –
                                                                                {item.lastDayOffset +
                                                                                    1}{' '}
                                                                                · mốc lặp{' '}
                                                                                {item.recurrenceAnchorOffset +
                                                                                    1}
                                                                            </Tag>
                                                                        )}
                                                                        {Number(
                                                                            item.dailyDoseIncrement,
                                                                        ) > 0 && (
                                                                            <Tag color="blue">
                                                                                +
                                                                                {
                                                                                    item.dailyDoseIncrement
                                                                                }{' '}
                                                                                {
                                                                                    UNIT_LABELS[
                                                                                        item
                                                                                            .doseUnit
                                                                                    ]
                                                                                }
                                                                                /ngày từ{' '}
                                                                                {treatment
                                                                                    ? 'ngày điều trị'
                                                                                    : 'DOC'}{' '}
                                                                                {item.doseAnchorOffset +
                                                                                    1}
                                                                            </Tag>
                                                                        )}
                                                                        {item.dueAtMinutes !=
                                                                            null && (
                                                                            <Tag>
                                                                                Khoảng thực hiện:{' '}
                                                                                {item.dueAtMinutes}{' '}
                                                                                phút
                                                                            </Tag>
                                                                        )}
                                                                        {(item.materialSnapshot ||
                                                                            item.product) && (
                                                                            <Button
                                                                                type="link"
                                                                                size="small"
                                                                                onClick={() =>
                                                                                    inspect(item)
                                                                                }
                                                                            >
                                                                                Hồ sơ vật tư
                                                                            </Button>
                                                                        )}
                                                                        {item.recommendedProductDetails && (
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
                                                    Lịch sử trạng thái
                                                </Typography.Title>
                                                <Timeline
                                                    items={detail.statusHistory.map((entry) => ({
                                                        key: entry.id,
                                                        children: (
                                                            <>
                                                                <Typography.Text>
                                                                    {PROTOCOL_STATUS_LABELS[
                                                                        entry.toStatus
                                                                    ] || entry.toStatus}
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
                            ...(treatment
                                ? [
                                      {
                                          key: 'execution',
                                          label: 'Thực hiện',
                                          children: (
                                              <ProtocolExecutionTable
                                                  key={detail.id}
                                                  rows={detail.executionRows}
                                                  coverage={detail.coverage}
                                                  asOf={detail.asOf}
                                                  treatmentStartAt={detail.treatmentStartAt}
                                              />
                                          ),
                                      },
                                  ]
                                : []),
                        ]}
                    />
                )}
            </Drawer>
            {material && (
                <ProtocolMaterialDetail product={material} onClose={() => setMaterial(null)} />
            )}
        </ConfigProvider>
    );
};

export default ExpertProductionProtocolDetail;
