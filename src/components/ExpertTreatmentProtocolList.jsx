import { Button, Empty, Flex, Space, Tag, Tooltip, Typography } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import { PROTOCOL_STATUS_COLORS, PROTOCOL_STATUS_LABELS } from '../constants/productionProtocol';
import { expertStyle as styles } from '../constants/expertStyle';

const dateText = value => value ? new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : 'Chưa đặt';

/** Share cards while keeping treatment actions in their disease-case context. */
const ExpertTreatmentProtocolList = ({ rows, onView, disabled = false }) => !rows.length
    ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có phác đồ điều trị" />
    : <Flex vertical gap={10}>{rows.map(row => <div key={row.id} className={styles.version}>
        <div className={styles.versionNumber}>v{row.versionNo}</div>
        <div className="min-w-0 flex-1">
            <Space wrap><Typography.Text strong className="text-[13px]!">{row.title}</Typography.Text>
                <Tag className={styles.pill} color={PROTOCOL_STATUS_COLORS[row.status]}>{PROTOCOL_STATUS_LABELS[row.status] || 'Không xác định'}</Tag>
            </Space>
            {row.diseaseCase && <Typography.Paragraph type="secondary" className="mb-0! mt-0.5! text-xs!">
                Ca bệnh: {row.diseaseCase.title}
            </Typography.Paragraph>}
            <Typography.Paragraph type="secondary" className="mb-0! mt-0.5! text-[11.5px]!">
                Bắt đầu điều trị: {dateText(row.treatmentStartAt)}
                {row.metrics && ` · ${row.metrics.completedCount ?? 0}/${row.metrics.totalSchedules ?? 0} lịch đã thực hiện`}
                {row.rejectionReason && ` · ${row.rejectionReason}`}
            </Typography.Paragraph>
        </div>
        <Space size={2} className={styles.actions}><Tooltip title="Xem phác đồ điều trị">
            <Button type="text" shape="circle" icon={<EyeOutlined />} disabled={disabled}
                aria-label={`Xem phác đồ điều trị ${row.title}, phiên bản ${row.versionNo}`} onClick={() => onView(row)} />
        </Tooltip></Space>
    </div>)}</Flex>;

export default ExpertTreatmentProtocolList;
