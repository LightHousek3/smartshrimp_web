import { useState, useEffect } from 'react';
import {
    Card,
    Row,
    Col,
    Statistic,
    Button,
    Modal,
    Form,
        DatePicker,
    Radio,
    Typography,
    Flex,
    Divider,
    message,
    Spin,
} from 'antd';
import {
    TeamOutlined,
    ClockCircleOutlined,
    HomeOutlined,
    RiseOutlined,
    RobotOutlined,
    MessageOutlined,
    CheckCircleOutlined,
    DownloadOutlined,
} from '@ant-design/icons';
import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import dayjs from 'dayjs';
import { adminStyles } from './adminStyles';
import { adminDashboardAPI } from '../../apis/index.js';
import { exportDashboardToExcel } from '../../utils/dashboardExport.js';

const { Text } = Typography;

// ── Custom recharts tooltip ───────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div
            style={{
                background: '#fff',
                border: '1px solid #e5e8f0',
                borderRadius: 10,
                padding: '8px 12px',
                fontSize: 12,
                boxShadow: '0 4px 20px rgba(15,28,46,0.12)',
            }}
        >
            <div style={{ fontWeight: 600, color: '#0f1c2e', marginBottom: 6 }}>
                {label}
            </div>
            {payload.map((p) => (
                <Flex key={p.name} align="center" gap={6} style={{ marginBottom: 2 }}>
                    <span
                        style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: p.color,
                            flexShrink: 0,
                        }}
                    />
                    <span style={{ color: '#6a7994' }}>{p.name}:</span>
                    <span style={{ fontWeight: 600, color: '#0f1c2e' }}>
                        {p.value}
                    </span>
                </Flex>
            ))}
        </div>
    );
}

// ── Export Modal ──────────────────────────────────────────────────────────────
function ExportModal({ open, onClose, dashboardData }) {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [messageApi, contextHolder] = message.useMessage();

    const handleExport = async () => {
        try {
            const values = await form.validateFields();
            setLoading(true);
            const fileName = await exportDashboardToExcel({
                overview: dashboardData?.overview || {},
                kpis: dashboardData?.kpis || [],
                accountBreakdown: dashboardData?.accountBreakdown || [],
                aiDaily: dashboardData?.aiDaily || [],
                ragDaily: dashboardData?.ragDaily || [],
                filters: {
                    from: values.from,
                    to: values.to,
                    type: values.type,
                },
            });
            messageApi.success(`Đã xuất báo cáo Excel thành công: ${fileName}`);
            onClose();
            form.resetFields();
        } catch (err) {
            if (err?.errorFields) return;
            messageApi.error(err?.message || 'Không thể xuất báo cáo');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {contextHolder}
            <Modal
                open={open}
                onCancel={() => {
                    onClose();
                    form.resetFields();
                }}
                title="Xuất báo cáo tổng quan hệ thống"
                width={480}
                centered
                footer={
                    <Flex justify="flex-end" gap={8}>
                        <Button
                            onClick={() => {
                                onClose();
                                form.resetFields();
                            }}
                        >
                            Huỷ
                        </Button>
                        <Button
                            type="primary"
                            loading={loading}
                            icon={<DownloadOutlined />}
                            onClick={handleExport}
                            className={adminStyles.primaryButton}
                        >
                            Xuất báo cáo
                        </Button>
                    </Flex>
                }
            >
                <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
                    <Form.Item label="Loại báo cáo" style={{ marginBottom: 16 }}>
                        <div
                            style={{
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                borderRadius: 8,
                                padding: '8px 14px',
                                fontSize: 14,
                                fontWeight: 600,
                                color: '#0f1c2e',
                            }}
                        >
                            Báo cáo tổng quan hệ thống
                        </div>
                    </Form.Item>

                    <Row gutter={12}>
                        <Col span={12}>
                            <Form.Item
                                name="from"
                                label="Từ ngày"
                                initialValue={dayjs().subtract(6, 'day')}
                                rules={[{ required: true, message: 'Chọn ngày bắt đầu' }]}
                            >
                                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                name="to"
                                label="Đến ngày"
                                initialValue={dayjs()}
                                rules={[{ required: true, message: 'Chọn ngày kết thúc' }]}
                            >
                                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item name="format" label="Định dạng" initialValue="xlsx">
                        <Radio.Group>
                            <Radio.Button value="xlsx">Excel (.xlsx)</Radio.Button>
                        </Radio.Group>
                    </Form.Item>
                </Form>
            </Modal>
        </>
    );
}

// ── KPI Card Component ────────────────────────────────────────────────────────
function KpiCard({ title, value, suffix, prefix, color, bg, sub }) {
    return (
        <Card
            variant="borderless"
            style={{
                boxShadow:
                    '0 1px 3px rgba(15,28,46,0.06), 0 4px 16px rgba(15,28,46,0.04)',
                borderRadius: 14,
                width: '100%',
                height: '100%',
                minHeight: 104,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
            }}
            styles={{
                body: {
                    padding: '16px 20px',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                },
            }}
        >
            <Flex align="center" gap={14} style={{ width: '100%' }}>
                <Flex
                    align="center"
                    justify="center"
                    style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        background: bg,
                        flexShrink: 0,
                    }}
                >
                    <span style={{ color, fontSize: 20 }}>{prefix}</span>
                </Flex>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <Statistic
                        value={value}
                        suffix={suffix}
                        valueStyle={{
                            fontFamily: "'Sora', sans-serif",
                            fontSize: 24,
                            fontWeight: 700,
                            color: '#0f1c2e',
                            lineHeight: 1.1,
                        }}
                    />
                    <Text
                        style={{
                            fontSize: 12,
                            color: '#6a7994',
                            display: 'block',
                            marginTop: 2,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                        }}
                    >
                        {title}
                    </Text>
                    <div style={{ minHeight: 16, marginTop: 2 }}>
                        {sub ? (
                            <Text
                                style={{
                                    fontSize: 11,
                                    color: '#0f9b8e',
                                    display: 'block',
                                    lineHeight: '16px',
                                }}
                            >
                                {sub}
                            </Text>
                        ) : null}
                    </div>
                </div>
            </Flex>
        </Card>
    );
}

// ── Initial State ────────────────────────────────────────────────────────────
const initialSystemOverview = {
    totalAccounts: 0,
    managedAccounts: 0,
    activeAccounts: 0,
    blockedAccounts: 0,
    pendingActivation: 0,
    activeFarms: 0,
    activeSeasons: 0,
    aiRequestsToday: 0,
    ragQuestionsToday: 0,
};

const defaultAccountBreakdown = [
    { label: 'Hoạt động', count: 0, color: '#0f9b8e', bg: '#e2f6f3', icon: <CheckCircleOutlined /> },
    { label: 'Chờ kích hoạt', count: 0, color: '#d98314', bg: '#fbf0dc', icon: <ClockCircleOutlined /> },
    { label: 'Không hoạt động', count: 0, color: '#64748b', bg: '#eef1f6', icon: <TeamOutlined /> },
    { label: 'Đã khóa', count: 0, color: '#d43b57', bg: '#fbe6ea', icon: <TeamOutlined /> },
];

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
    const [exportOpen, setExportOpen] = useState(false);
    const [systemOverview, setSystemOverview] = useState(initialSystemOverview);
    const [aiDailyMetrics, setAiDailyMetrics] = useState([]);
    const [ragDailyMetrics, setRagDailyMetrics] = useState([]);
    const [accountBreakdown, setAccountBreakdown] = useState(defaultAccountBreakdown);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        const controller = new AbortController();

        adminDashboardAPI
            .getOverview(controller.signal)
            .then((res) => {
                if (!isMounted || !res) return;

                if (res.systemOverview) {
                    const ov = res.systemOverview;
                    setSystemOverview({
                        totalAccounts: ov.totalAccounts ?? ov.managedAccounts ?? 0,
                        managedAccounts: ov.totalAccounts ?? ov.managedAccounts ?? 0,
                        activeAccounts: ov.activeAccounts ?? 0,
                        blockedAccounts: ov.blockedAccounts ?? 0,
                        pendingActivation: ov.pendingActivation ?? 0,
                        activeFarms: ov.activeFarms ?? 0,
                        activeSeasons: ov.activeSeasons ?? 0,
                        aiRequestsToday: ov.aiRequestsToday ?? 0,
                        ragQuestionsToday: ov.ragQuestionsToday ?? 0,
                    });
                }

                if (Array.isArray(res.aiDailyMetrics)) {
                    setAiDailyMetrics(res.aiDailyMetrics);
                }

                if (Array.isArray(res.ragDailyMetrics)) {
                    setRagDailyMetrics(res.ragDailyMetrics);
                }

                if (Array.isArray(res.accountStatusBreakdown) && res.accountStatusBreakdown.length > 0) {
                    setAccountBreakdown(
                        res.accountStatusBreakdown.map((b) => ({
                            label: b.label,
                            status: b.status,
                            count: b.count,
                            color: b.color,
                            bg: b.bg,
                            icon:
                                b.status === 'ACTIVE' ? (
                                    <CheckCircleOutlined />
                                ) : b.status === 'PENDING_ACTIVATION' ? (
                                    <ClockCircleOutlined />
                                ) : (
                                    <TeamOutlined />
                                ),
                        }))
                    );
                }
            })
            .catch((err) => {
                console.error('Lỗi khi tải dữ liệu dashboard:', err);
            })
            .finally(() => {
                if (isMounted) setLoading(false);
            });

        return () => {
            isMounted = false;
            controller.abort();
        };
    }, []);

    const ov = systemOverview;

    const aiTotalsTotal = aiDailyMetrics.reduce((s, d) => s + d.total, 0);
    const aiTotalSuccess = aiDailyMetrics.reduce((s, d) => s + (d.success || 0), 0);
    const aiWeightedConfSum = aiDailyMetrics.reduce(
        (s, d) => s + (d.avgConfidence || 0) * (d.success || 0),
        0
    );
    const aiWeightedMsSum = aiDailyMetrics.reduce(
        (s, d) => s + (d.avgProcessingMs || 0) * (d.total || 0),
        0
    );

    const aiTotals = {
        total: aiTotalsTotal,
        success: aiTotalSuccess,
        successRate: aiTotalsTotal > 0 ? ((aiTotalSuccess / aiTotalsTotal) * 100).toFixed(1) : '0.0',
        confidence: aiTotalSuccess > 0 ? ((aiWeightedConfSum / aiTotalSuccess) * 100).toFixed(1) : '0.0',
        ms: aiTotalsTotal > 0 ? Math.round(aiWeightedMsSum / aiTotalsTotal) : 0,
    };

    const ragTotalsTotal = ragDailyMetrics.reduce((s, d) => s + d.total, 0);
    const ragTotalAnswered = ragDailyMetrics.reduce((s, d) => s + d.answered, 0);
    const ragDaysWithRating = ragDailyMetrics.filter((d) => (d.avgRating || 0) > 0).length || 1;
    const ragTotals = {
        total: ragTotalsTotal,
        answered: ragTotalAnswered,
        rating: (
            ragDailyMetrics.reduce((s, d) => s + (d.avgRating ?? 0), 0) / ragDaysWithRating
        ).toFixed(1),
    };

    const kpis = [
        {
            title: 'Tổng tài khoản',
            value: ov.totalAccounts ?? ov.managedAccounts ?? 0,
            prefix: <TeamOutlined />,
            color: '#1d7ad6',
            bg: '#eaf4ff',
            sub: `${ov.activeAccounts ?? 0} đang hoạt động`,
        },
        {
            title: 'Chờ kích hoạt',
            value: ov.pendingActivation ?? 0,
            prefix: <ClockCircleOutlined />,
            color: '#d98314',
            bg: '#fbf0dc',
            sub: `${ov.blockedAccounts ?? 0} đã bị chặn`,
        },
        {
            title: 'Trang trại hoạt động',
            value: ov.activeFarms ?? 0,
            prefix: <HomeOutlined />,
            color: '#0f9b8e',
            bg: '#e2f6f3',
            sub: 'Toàn hệ thống',
        },
        {
            title: 'Vụ nuôi đang chạy',
            value: ov.activeSeasons ?? 0,
            prefix: <RiseOutlined />,
            color: '#7b5bd6',
            bg: '#efeafc',
            sub: 'Đang hoạt động',
        },
        {
            title: 'AI chẩn đoán hôm nay',
            value: ov.aiRequestsToday ?? 0,
            prefix: <RobotOutlined />,
            color: '#1d7ad6',
            bg: '#eaf4ff',
            sub: `7 ngày qua: ${aiTotals.total} lượt`,
        },
        {
            title: 'Câu hỏi RAG hôm nay',
            value: ov.ragQuestionsToday ?? 0,
            prefix: <MessageOutlined />,
            color: '#0f9b8e',
            bg: '#e2f6f3',
            sub: `7 ngày qua: ${ragTotals.total} câu`,
        },
    ];

    const totalAccounts =
        accountBreakdown.reduce((s, d) => s + d.count, 0) ||
        ov.totalAccounts ||
        ov.managedAccounts ||
        0;

    return (
        <Spin spinning={loading}>
            <section className="flex min-w-0 flex-col">
            {/* Header matching AccountList and RagDocuments */}
            <header className="mb-[18px] flex items-start justify-between gap-4 max-[600px]:flex-wrap">
                <div>
                    <h1 className="m-0 font-['Sora',sans-serif] text-[22px] font-semibold leading-7 text-[#0f1c2e] max-[600px]:text-xl">
                        Tổng quan hệ thống
                    </h1>
                    <p className="m-0 mt-1 text-[13px] text-[#6a7994]">
                        Thống kê hoạt động và phân tích dữ liệu
                    </p>
                </div>
                <Button
                    type="primary"
                    className={adminStyles.primaryButton}
                    icon={<DownloadOutlined />}
                    onClick={() => setExportOpen(true)}
                >
                    Xuất báo cáo
                </Button>
            </header>

            {/* KPIs */}
            <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
                {kpis.map((k) => (
                    <Col key={k.title} xs={24} sm={12} xl={8} style={{ display: 'flex' }}>
                        <KpiCard {...k} />
                    </Col>
                ))}
            </Row>

            {/* Charts */}
            <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
                {/* AI Area Chart */}
                <Col xs={24} xl={12}>
                    <Card
                        title={
                            <Flex align="center" justify="space-between">
                                <span
                                    style={{
                                        fontFamily: "'Sora', sans-serif",
                                        fontSize: 14,
                                        fontWeight: 600,
                                        color: '#0f1c2e',
                                    }}
                                >
                                    AI Chẩn đoán — 7 ngày gần nhất
                                </span>
                                <Flex gap={12}>
                                    {[
                                        { color: '#1d7ad6', label: 'Thành công' },
                                        { color: '#d43b57', label: 'Lỗi' },
                                    ].map((l) => (
                                        <Flex key={l.label} align="center" gap={5}>
                                            <span
                                                style={{
                                                    width: 8,
                                                    height: 8,
                                                    borderRadius: '50%',
                                                    background: l.color,
                                                }}
                                            />
                                            <Text style={{ fontSize: 11, color: '#6a7994' }}>
                                                {l.label}
                                            </Text>
                                        </Flex>
                                    ))}
                                </Flex>
                            </Flex>
                        }
                        variant="borderless"
                        style={{
                            boxShadow: '0 1px 3px rgba(15,28,46,0.06)',
                            borderRadius: 14,
                        }}
                        styles={{ body: { paddingTop: 8 } }}
                    >
                        <ResponsiveContainer width="100%" height={200}>
                            <AreaChart
                                data={aiDailyMetrics}
                                margin={{ top: 4, right: 0, left: -20, bottom: 0 }}
                            >
                                <defs>
                                    <linearGradient id="aiGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#1d7ad6" stopOpacity={0.16} />
                                        <stop offset="95%" stopColor="#1d7ad6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e8f0" vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    tick={{ fontSize: 11, fill: '#6a7994' }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis
                                    tick={{ fontSize: 11, fill: '#6a7994' }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip content={<ChartTooltip />} />
                                <Area
                                    type="monotone"
                                    dataKey="success"
                                    name="Thành công"
                                    stroke="#1d7ad6"
                                    strokeWidth={2}
                                    fill="url(#aiGrad)"
                                    dot={{ r: 3, fill: '#1d7ad6' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="errors"
                                    name="Lỗi"
                                    stroke="#d43b57"
                                    strokeWidth={2}
                                    fill="transparent"
                                    dot={{ r: 3, fill: '#d43b57' }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>

                        <Divider style={{ margin: '12px 0 10px' }} />
                        <Row>
                            {[
                                { label: 'Tổng yêu cầu', value: aiTotals.total },
                                { label: 'Độ tin cậy TB', value: `${aiTotals.confidence}%` },
                                { label: 'TG xử lý TB', value: `${aiTotals.ms}ms` },
                            ].map((m) => (
                                <Col key={m.label} span={8} style={{ textAlign: 'center' }}>
                                    <Text
                                        strong
                                        style={{
                                            fontFamily: "'Sora', sans-serif",
                                            fontSize: 18,
                                            color: '#0f1c2e',
                                            display: 'block',
                                        }}
                                    >
                                        {m.value}
                                    </Text>
                                    <Text style={{ fontSize: 11, color: '#6a7994' }}>
                                        {m.label}
                                    </Text>
                                </Col>
                            ))}
                        </Row>
                    </Card>
                </Col>

                {/* RAG Bar Chart */}
                <Col xs={24} xl={12}>
                    <Card
                        title={
                            <Flex align="center" justify="space-between">
                                <span
                                    style={{
                                        fontFamily: "'Sora', sans-serif",
                                        fontSize: 14,
                                        fontWeight: 600,
                                        color: '#0f1c2e',
                                    }}
                                >
                                    RAG Chatbox — 7 ngày gần nhất
                                </span>
                                <Flex gap={12}>
                                    {[
                                        { color: '#0f9b8e', label: 'Có trả lời' },
                                        { color: '#d98314', label: 'Không rõ nguồn' },
                                    ].map((l) => (
                                        <Flex key={l.label} align="center" gap={5}>
                                            <span
                                                style={{
                                                    width: 8,
                                                    height: 8,
                                                    borderRadius: '50%',
                                                    background: l.color,
                                                }}
                                            />
                                            <Text style={{ fontSize: 11, color: '#6a7994' }}>
                                                {l.label}
                                            </Text>
                                        </Flex>
                                    ))}
                                </Flex>
                            </Flex>
                        }
                        variant="borderless"
                        style={{
                            boxShadow: '0 1px 3px rgba(15,28,46,0.06)',
                            borderRadius: 14,
                        }}
                        styles={{ body: { paddingTop: 8 } }}
                    >
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart
                                data={ragDailyMetrics}
                                margin={{ top: 4, right: 0, left: -20, bottom: 0 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e8f0" vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    tick={{ fontSize: 11, fill: '#6a7994' }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis
                                    tick={{ fontSize: 11, fill: '#6a7994' }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip content={<ChartTooltip />} />
                                <Bar dataKey="answered" name="Có trả lời" stackId="a" fill="#0f9b8e" />
                                <Bar dataKey="noSource" name="Không có nguồn" stackId="a" fill="#d98314" />
                                <Bar
                                    dataKey="lowMatch"
                                    name="Độ khớp thấp"
                                    stackId="a"
                                    fill="#e5e8f0"
                                    radius={[4, 4, 0, 0]}
                                />
                            </BarChart>
                        </ResponsiveContainer>

                        <Divider style={{ margin: '12px 0 10px' }} />
                        <Row>
                            {[
                                { label: 'Tổng câu hỏi', value: ragTotals.total },
                                {
                                    label: 'Tỉ lệ trả lời',
                                    value: `${ragTotals.total > 0 ? ((ragTotals.answered / ragTotals.total) * 100).toFixed(1) : 0}%`,
                                },
                                { label: 'Đánh giá TB', value: `${ragTotals.rating} ★` },
                            ].map((m) => (
                                <Col key={m.label} span={8} style={{ textAlign: 'center' }}>
                                    <Text
                                        strong
                                        style={{
                                            fontFamily: "'Sora', sans-serif",
                                            fontSize: 18,
                                            color: '#0f1c2e',
                                            display: 'block',
                                        }}
                                    >
                                        {m.value}
                                    </Text>
                                    <Text style={{ fontSize: 11, color: '#6a7994' }}>
                                        {m.label}
                                    </Text>
                                </Col>
                            ))}
                        </Row>
                    </Card>
                </Col>
            </Row>

            {/* Account Status Breakdown */}
            <Card
                title={
                    <span
                        style={{
                            fontFamily: "'Sora', sans-serif",
                            fontSize: 14,
                            fontWeight: 600,
                            color: '#0f1c2e',
                        }}
                    >
                        Phân bổ trạng thái tài khoản
                    </span>
                }
                variant="borderless"
                style={{
                    boxShadow: '0 1px 3px rgba(15,28,46,0.06)',
                    borderRadius: 14,
                }}
            >
                <Flex gap={12} wrap="wrap" style={{ marginBottom: 14 }}>
                    {accountBreakdown.map((s) => (
                        <Flex
                            key={s.label}
                            align="center"
                            gap={10}
                            style={{
                                background: s.bg,
                                borderRadius: 12,
                                padding: '10px 16px',
                            }}
                        >
                            <span style={{ color: s.color, fontSize: 15 }}>{s.icon}</span>
                            <Text style={{ fontSize: 13, fontWeight: 600, color: s.color }}>
                                {s.label}
                            </Text>
                            <Text
                                strong
                                style={{
                                    fontFamily: "'Sora', sans-serif",
                                    fontSize: 18,
                                    color: '#0f1c2e',
                                }}
                            >
                                {s.count}
                            </Text>
                        </Flex>
                    ))}
                </Flex>

                {/* Ratio Progress Bar */}
                <div
                    style={{
                        height: 10,
                        borderRadius: 999,
                        overflow: 'hidden',
                        display: 'flex',
                        background: '#eef1f6',
                    }}
                >
                    {accountBreakdown.map((s) => (
                        <div
                            key={s.label}
                            style={{
                                width: totalAccounts > 0 ? `${(s.count / totalAccounts) * 100}%` : '0%',
                                background: s.color,
                                transition: 'width 0.3s ease',
                            }}
                        />
                    ))}
                </div>
            </Card>

            {/* Export Modal */}
            <ExportModal
                open={exportOpen}
                onClose={() => setExportOpen(false)}
                dashboardData={{
                    overview: systemOverview,
                    kpis,
                    accountBreakdown,
                    aiDaily: aiDailyMetrics,
                    ragDaily: ragDailyMetrics,
                }}
            />
        </section>
        </Spin>
    );
}
