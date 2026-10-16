import { Alert, Badge, Button, ConfigProvider, Drawer, Empty, Space, Tag, Timeline, Tooltip, Typography } from 'antd';
import { EditOutlined, ExperimentOutlined, SendOutlined } from '@ant-design/icons';
import { DOSE_LABELS, OPERATION_COLORS, OPERATION_LABELS, PROTOCOL_PRIMARY_BUTTON, PROTOCOL_STATUS_COLORS, PROTOCOL_STATUS_LABELS, PROTOCOL_THEME, UNIT_LABELS } from '../../constants/productionProtocol';
import { expertStyle as styles } from './expertStyle';

const dateText = (value) => value ? new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : '—';
const ExpertProductionProtocolDetail = ({ detail, onClose, onEdit, onSubmit, submitBusy = false }) => <ConfigProvider theme={PROTOCOL_THEME}>
    <Drawer open width={880} className={styles.drawer} onClose={onClose} title={<Space wrap>
        <span className={styles.mono}>v{detail.versionNo}</span><span>{detail.title}</span>
        <Tag className={styles.pill} color={PROTOCOL_STATUS_COLORS[detail.status]}>{PROTOCOL_STATUS_LABELS[detail.status]}</Tag>
    </Space>} extra={<Space>
        {detail.availableActions.update && <Button icon={<EditOutlined />} onClick={onEdit}>Chỉnh sửa</Button>}
        {detail.availableActions.submit && <Button type="primary" className={PROTOCOL_PRIMARY_BUTTON} icon={<SendOutlined />} loading={submitBusy} onClick={onSubmit}>Gửi duyệt</Button>}
    </Space>}>
        {detail.rejectionReason && <Alert type="error" showIcon className="mb-4! rounded-[14px]! p-5!" message="Chủ trại từ chối" description={detail.rejectionReason} />}
        <div className={styles.viewMeta}>
            <div><span>Loại:</span>Phác đồ nuôi</div><div><span>Sai lệch cho phép:</span>±{detail.allowedVariancePct}%</div><div><span>Sinh lịch trước:</span>{detail.rollingWindowDays} ngày</div>
            <div><span>Gửi duyệt:</span>{dateText(detail.submittedAt)}</div><div><span>Duyệt:</span>{dateText(detail.reviewedAt)}</div>
            <div><span>Phiên bản:</span>v{detail.versionNo}</div>
            <div className="col-span-full"><span>Ghi chú:</span>{detail.summary || '—'}</div>
        </div>
        <Typography.Paragraph className="mb-2! text-[11px]! font-semibold! tracking-wider! text-[#6a7994]!">LỊCH CỮ ĂN & XỬ LÝ</Typography.Paragraph>
        {!detail.stages.length && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Phác đồ chưa có giai đoạn" />}
        {detail.stages.map((stage, stageIndex) => <section className={styles.stage} key={stage.id}>
            <div className={styles.stageHeading}><strong>Giai đoạn {stageIndex + 1}</strong><span className={styles.mono}>DOC {stage.startDayOffset + 1}–{stage.endDayOffset + 1}</span>
                <span className="ml-auto text-xs text-[#6a7994]">{stage.meals.filter((meal) => meal.mealNumber != null).length} cữ/ngày · {stage.meals.filter((meal) => meal.mealNumber == null).reduce((sum, meal) => sum + meal.items.length, 0)} xử lý môi trường</span></div>
            {stage.meals.map((meal) => <div key={meal.id} className={`${styles.viewMeal} ${meal.mealNumber == null ? styles.environment : ''}`}>
                <div><Typography.Text className={meal.mealNumber == null ? styles.environmentLabel : 'text-xs!'}>{meal.mealNumber == null ? 'Môi trường' : `Cữ ${meal.mealNumber}`}</Typography.Text>
                    <div className={styles.mono}>{meal.plannedTime?.slice(0, 5) || 'Chưa đặt giờ'}</div></div>
                <div className={styles.viewChips}>{meal.items.map((item) => <Tooltip key={item.id} title={<>{OPERATION_LABELS[item.operationType]} · Mỗi {item.repeatIntervalDays} ngày{item.instructions && ` · ${item.instructions}`}</>}>
                    <div className={styles.viewChip}><Badge className={styles.dot} color={OPERATION_COLORS[item.operationType]} />
                        <span className={`${styles.productAvatar} size-7! basis-7!`}><ExperimentOutlined /></span>
                        <span>{item.product?.name || item.recommendedProductName}</span>
                        <span className={styles.mono}>{item.doseValue} {UNIT_LABELS[item.doseUnit]}{item.doseBasis !== 'FIXED_QUANTITY' && ` ${DOSE_LABELS[item.doseBasis]}`}</span>
                        {item.repeatIntervalDays > 1 && <Tag color="cyan" className="m-0! rounded-md! border-0! text-[10px]!">Lặp mỗi {item.repeatIntervalDays} ngày</Tag>}
                    </div>
                </Tooltip>)}</div>
            </div>)}
        </section>)}
        {detail.statusHistory.length > 0 && <><Typography.Title level={5} className="mt-6! text-sm!">Lịch sử trạng thái</Typography.Title>
            <Timeline items={detail.statusHistory.map((entry) => ({ key: entry.id, children: <>
                <Typography.Text>{PROTOCOL_STATUS_LABELS[entry.toStatus] || entry.toStatus}</Typography.Text>
                <Typography.Paragraph className="mb-0! text-xs!" type="secondary">{dateText(entry.changedAt)}</Typography.Paragraph>
                {entry.reason && <Typography.Paragraph>{entry.reason}</Typography.Paragraph>}
            </> }))} /></>}
    </Drawer>
</ConfigProvider>;

export default ExpertProductionProtocolDetail;
