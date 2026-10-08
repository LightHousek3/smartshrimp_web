import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Empty, Flex, Typography } from 'antd';
import {
    ArrowRightOutlined,
    ClockCircleOutlined,
    EditOutlined,
    ExperimentOutlined,
    MedicineBoxOutlined,
    UnorderedListOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { expertDashboardAPI } from '../../apis';
import Loading from '../../components/Loading';
import { formatDate } from '../../utils/dateUtils';

const { Paragraph, Title } = Typography;

const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });
const panelClassName = 'rounded-[14px] border border-[#e5e8f0] bg-white';
const pillClassName =
    'inline-block w-fit max-w-full overflow-hidden text-ellipsis whitespace-nowrap rounded-[20px] px-2 py-0.5 text-[10px] font-semibold leading-4';
const tableHeaderClassName =
    'h-[38px] bg-[#f8fafc] p-2 text-left text-[13px] font-semibold text-[#6a7994]';
const tableCellClassName = 'h-[54px] border-b border-[#e5e8f0] p-2 align-middle';

const caseTableHeaders = [
    { label: 'Tiêu đề', width: 'w-[31%]' },
    { label: 'Trang trại', width: 'w-[15%]' },
    { label: 'Ao / vụ nuôi', width: 'w-[16%]' },
    { label: 'Mức độ', width: 'w-[10%]' },
    { label: 'Trạng thái', width: 'w-[11%]' },
    { label: 'Báo bởi', width: 'w-[10%]' },
    { label: 'Cập nhật', width: 'w-[7%]' },
];

const statToneStyles = {
    blue: 'bg-[#eaf4ff] text-[#1d7ad6]',
    amber: 'bg-[#fbf0dc] text-[#a1600c]',
    rose: 'bg-[#fce9ed] text-[#bb334f]',
    teal: 'bg-[#e2f6f3] text-[#0f9b8e]',
};

const metricToneStyles = {
    teal: 'text-[#0f9b8e]',
    blue: 'text-[#1d7ad6]',
    slate: 'text-[#3a4a63]',
};

const severityStyles = {
    CRITICAL: 'bg-[#d43b57] text-white',
    HIGH: 'bg-[#fce9ed] text-[#bb334f]',
    MEDIUM: 'bg-[#fbf0dc] text-[#a1600c]',
    LOW: 'bg-[#eef1f6] text-[#475569]',
};

const statusStyles = {
    OPEN: 'bg-[#eaf4ff] text-[#0f62b4]',
    WAITING_FOR_INFO: 'bg-[#fbf0dc] text-[#a1600c]',
    MONITORING: 'bg-[#efeafc] text-[#5b3fb8]',
    IN_TREATMENT: 'bg-[#fce9ed] text-[#bb334f]',
    RESOLVED: 'bg-[#e2f6f3] text-[#0b7a70]',
};

const healthDotStyles = {
    WARNING: 'text-[#d98314]',
    CRITICAL: 'text-[#d43b57]',
};

const severityLabels = {
    CRITICAL: 'Nghiêm trọng',
    HIGH: 'Cao',
    MEDIUM: 'Trung bình',
    LOW: 'Thấp',
};
const statusLabels = {
    OPEN: 'Mới',
    WAITING_FOR_INFO: 'Chờ bổ sung',
    MONITORING: 'Theo dõi',
    IN_TREATMENT: 'Đang điều trị',
    RESOLVED: 'Đã giải quyết',
};
const healthLabels = {
    EXCELLENT: 'Rất tốt',
    GOOD: 'Tốt',
    WARNING: 'Cảnh báo',
    CRITICAL: 'Nguy hiểm',
};

const Metric = ({ label, value, unit, tone }) => (
    <div className="flex min-w-0 flex-col gap-1">
        <span className="text-[10px] leading-4 text-[#6a7994]">{label}</span>
        <strong
            className={`whitespace-nowrap text-lg leading-7.25 font-bold ${metricToneStyles[tone]}`}
        >
            {value == null ? '—' : `${number.format(value)}${unit || ''}`}
        </strong>
    </div>
);

const StatCard = ({ icon, tone, value, label, detail }) => (
    <div className={`${panelClassName} flex min-h-27.5 items-start gap-3.5 p-5`}>
        <span
            className={`grid size-11 shrink-0 place-items-center rounded-xl text-xl ${statToneStyles[tone]}`}
            aria-hidden="true"
        >
            {icon}
        </span>
        <div className="flex min-w-0 flex-col">
            <strong className="font-['Sora','Plus_Jakarta_Sans',sans-serif] text-[30px] leading-[37.5px] font-extrabold text-[#0f1c2e]">
                {value}
            </strong>
            <span className="text-xs leading-4 text-[#6a7994]">{label}</span>
            <small className="text-xs leading-4 text-[#6a7994]">{detail}</small>
        </div>
    </div>
);

const SeasonCard = ({ season }) => (
    <article className={`${panelClassName} min-h-44.25 min-w-0 p-5`}>
        <div className="flex items-start justify-between gap-3">
            <div>
                <h3 className="m-0 text-sm leading-5.75 font-bold text-[#0f1c2e] max-[650px]:text-[13px]">
                    {season.pond.name} — {season.farm.name}
                </h3>
                <p className="m-0 text-xs leading-4.75 text-[#6a7994]">
                    {season.name}
                    {season.dayOfCulture != null ? ` · DOC ${season.dayOfCulture} ngày` : ''}
                </p>
            </div>
            <span className="shrink-0 rounded-[20px] border border-[rgba(15,155,142,0.19)] bg-[rgba(15,155,142,0.09)] px-1.75 text-[11px] leading-4.5 font-semibold text-[#0f9b8e]">
                Đang nuôi
            </span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3">
            <Metric label="Tỷ lệ sống" value={season.survivalRatePct} unit=" %" tone="teal" />
            <Metric label="Trọng lượng TB" value={season.avgWeightG} unit=" g" tone="blue" />
            <Metric label="Sinh khối" value={season.biomassKg} unit=" kg" tone="slate" />
        </div>
        <p className="mt-2 mb-0 text-[11px] leading-4 text-[#6a7994]">
            <span
                className={healthDotStyles[season.healthStatus] || 'text-[#1d7ad6]'}
                aria-hidden="true"
            >
                •
            </span>{' '}
            Sức khỏe: {healthLabels[season.healthStatus] || 'Chưa có dữ liệu'}
        </p>
    </article>
);

const RecentCases = ({ cases }) => (
    <section
        className={`${panelClassName} mt-6 overflow-hidden`}
        aria-labelledby="recent-cases-title"
    >
        <div className="flex min-h-14 items-center justify-between gap-4 border-b border-[#eef1f7] px-5 max-[650px]:px-3">
            <h2
                id="recent-cases-title"
                className="m-0 flex items-center gap-2 text-[13px] font-bold text-[#0f1c2e]"
            >
                <UnorderedListOutlined className="text-[#1d7ad6]" aria-hidden="true" />
                Ca bệnh gần đây
            </h2>
            <Link
                className="flex min-h-9 items-center gap-2 px-4 text-[13px] text-[#1d7ad6] no-underline hover:underline"
                to="/expert/disease-cases"
            >
                Xem tất cả <ArrowRightOutlined aria-hidden="true" />
            </Link>
        </div>
        {cases.length === 0 ? (
            <div className="py-7.5">
                <Empty description="Chưa có ca bệnh nào" />
            </div>
        ) : (
            <div className="overflow-x-auto px-5 pt-3 pb-5 max-[650px]:p-3">
                <table className="w-full min-w-245 table-fixed border-collapse text-xs">
                    <thead>
                        <tr>
                            {caseTableHeaders.map(({ label, width }) => (
                                <th className={`${tableHeaderClassName} ${width}`} key={label}>
                                    {label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {cases.map((item) => (
                            <tr key={item.id}>
                                <td
                                    className={`${tableCellClassName} text-[13px] font-semibold text-[#0f1c2e]`}
                                >
                                    {item.title}
                                </td>
                                <td className={`${tableCellClassName} text-[#3a4a63]`}>
                                    {item.farm.name}
                                </td>
                                <td className={`${tableCellClassName} text-[#3a4a63]`}>
                                    <strong className="block overflow-hidden text-ellipsis whitespace-nowrap font-medium text-[#0f1c2e]">
                                        {item.pond.name}
                                    </strong>
                                    <span className="block overflow-hidden text-ellipsis whitespace-nowrap text-[#6a7994]">
                                        {item.season.name}
                                    </span>
                                </td>
                                <td className={tableCellClassName}>
                                    <span
                                        className={`${pillClassName} ${severityStyles[item.severity] || severityStyles.LOW}`}
                                    >
                                        {severityLabels[item.severity] || item.severity}
                                    </span>
                                </td>
                                <td className={tableCellClassName}>
                                    <span
                                        className={`${pillClassName} ${statusStyles[item.status] || statusStyles.OPEN}`}
                                    >
                                        {statusLabels[item.status] || item.status}
                                    </span>
                                </td>
                                <td className={`${tableCellClassName} text-[#3a4a63]`}>
                                    {item.reporterName || '—'}
                                </td>
                                <td className={`${tableCellClassName} text-[#6a7994]`}>
                                    {formatDate(item.updatedAt)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
    </section>
);

const ExpertDashboard = () => {
    const [revision, setRevision] = useState(0);
    const [state, setState] = useState({ loading: true, data: null, error: null });
    const retry = useCallback(() => {
        setState({ loading: true, data: null, error: null });
        setRevision((value) => value + 1);
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        expertDashboardAPI
            .getDashboard(controller.signal)
            .then((response) => {
                if (controller.signal.aborted) return;
                const data = response.data?.data;
                if (
                    !data?.summary ||
                    !Array.isArray(data.seasons) ||
                    !Array.isArray(data.recentCases)
                ) {
                    throw new Error('Dữ liệu tổng quan không hợp lệ.');
                }
                setState({ loading: false, data, error: null });
            })
            .catch((error) => {
                if (controller.signal.aborted) return;
                setState({
                    loading: false,
                    data: null,
                    error:
                        error.response?.data?.message ||
                        (error.message === 'Dữ liệu tổng quan không hợp lệ.'
                            ? error.message
                            : 'Không thể tải tổng quan.'),
                });
            });
        return () => controller.abort();
    }, [revision]);

    const summary = state.data?.summary;
    return (
        <div className="w-full min-w-0">
            <Flex vertical gap={0} className="w-full! min-w-0!">
                <Title level={1} className="m-0! font-['Sora','Plus_Jakarta_Sans',sans-serif]! text-[22px]! leading-6.875! font-bold! text-[#0f1c2e]!">
                    Tổng quan hoạt động
                </Title>
                <Paragraph className="mb-0! mt-1! text-[13px]! leading-5.25! text-[#6a7994]!">
                    Theo dõi hoạt động chuyên môn của bạn
                </Paragraph>
            </Flex>
            {state.loading ? (
                <Loading className="min-h-90! w-full!" tip="Đang tải tổng quan" />
            ) : state.error ? (
                <Alert
                    className="mt-5"
                    type="error"
                    showIcon
                    message={state.error}
                    action={
                        <Button size="small" onClick={retry}>
                            Thử lại
                        </Button>
                    }
                />
            ) : (
                <>
                    <div className="mt-5 grid grid-cols-4 gap-4 max-[1250px]:grid-cols-2 max-[650px]:grid-cols-1">
                        <StatCard
                            icon={<ExperimentOutlined />}
                            tone="blue"
                            value={summary.activeSeasons}
                            label="Vụ đang phụ trách"
                            detail={`${summary.planningSeasons} vụ đang chuẩn bị`}
                        />
                        <StatCard
                            icon={<MedicineBoxOutlined />}
                            tone="amber"
                            value={summary.openCases}
                            label="Ca bệnh đang mở"
                            detail={`${summary.criticalCases} ca bệnh nghiêm trọng`}
                        />
                        <StatCard
                            icon={<ClockCircleOutlined />}
                            tone="rose"
                            value={summary.pendingProtocols}
                            label="Phác đồ chờ duyệt"
                            detail="Nuôi & điều trị"
                        />
                        <StatCard
                            icon={<EditOutlined />}
                            tone="teal"
                            value={summary.draftProtocols + summary.rejectedProtocols}
                            label="Phác đồ cần hoàn thiện"
                            detail={`${summary.draftProtocols} bản nháp & ${summary.rejectedProtocols} bị từ chối`}
                        />
                    </div>
                    {state.data.seasons.length ? (
                        <div className="mt-6 grid grid-cols-2 gap-4 max-[650px]:grid-cols-1">
                            {state.data.seasons.map((season) => (
                                <SeasonCard key={season.id} season={season} />
                            ))}
                        </div>
                    ) : (
                        <div className={`${panelClassName} mt-6 p-8`}>
                            <Empty description="Chưa có vụ nuôi đang phụ trách" />
                        </div>
                    )}
                    <RecentCases cases={state.data.recentCases} />
                </>
            )}
        </div>
    );
};

export default ExpertDashboard;
