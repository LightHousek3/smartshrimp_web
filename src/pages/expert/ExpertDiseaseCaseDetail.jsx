import { useEffect, useState, useRef, useCallback } from 'react';
import {
    Alert,
    App,
    Avatar,
    Button,
    Checkbox,
    ConfigProvider,
    Empty,
    Image,
    Input,
    Modal,
    Progress,
    Segmented,
    Tabs,
    Timeline,
    Tooltip,
} from 'antd';
import {
    ArrowLeftOutlined,
    PaperClipOutlined,
    ArrowRightOutlined,
    CheckCircleFilled,
    CheckCircleOutlined,
    ClockCircleOutlined,
    ExclamationCircleFilled,
    LoadingOutlined,
    PlusOutlined,
    RobotOutlined,
    SendOutlined,
    StopOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { expertDiseaseCaseAPI } from '../../apis';
import Loading from '../../components/Loading';
import { PROTOCOL_THEME } from '../../constants/productionProtocol';
import { NOTIFICATION_CHANGED_EVENT } from '../../utils/notificationUtils';
import {
    CaseTag,
    HealthTag,
    Label,
    PageHeader,
    Panel,
    ProtocolTag,
    SeverityTag,
} from './expertUI';

const responseTypeLabels = {
    REQUEST_INFO: 'Yêu cầu bổ sung',
    request_info: 'Yêu cầu bổ sung',
    PROVIDE_INFO: 'Bổ sung thông tin',
    provide_info: 'Bổ sung thông tin',
    MONITORING_RESULT: 'Kết quả theo dõi',
    monitoring_result: 'Kết quả theo dõi',
    TREATMENT_RESULT: 'Kết quả điều trị',
    treatment_result: 'Kết quả điều trị',
    EMERGENCY_ALERT: 'Cảnh báo khẩn',
    emergency_alert: 'Cảnh báo khẩn',
    EXPERT_ASSESSMENT: 'Đánh giá chuyên môn',
    expert_assessment: 'Đánh giá chuyên môn',
    EXPERT_INSTRUCTION: 'Chỉ dẫn xử lý',
    expert_instruction: 'Chỉ dẫn xử lý',
    RESOLUTION: 'Kết luận giải quyết',
    resolution: 'Kết luận giải quyết',
};

const fmtDateTime = (isoString) => {
    if (!isoString) return '—';
    const d = new Date(isoString);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${mins} ${day}-${month}`;
};

const fmtDate = (isoString) => {
    if (!isoString) return '—';
    const d = new Date(isoString);
    return d.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
};

const ExpertDiseaseCaseDetail = () => {
    const { caseId } = useParams();
    const navigate = useNavigate();
    const { message } = App.useApp();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [resolving, setResolving] = useState(false);
    const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);

    const [caseData, setCaseData] = useState(null);
    const [fetchError, setFetchError] = useState(null);
    const [activeTab, setActiveTab] = useState('thread');

    // Response form state
    const [responseType, setResponseType] = useState('EXPERT_ASSESSMENT');
    const [responseMessage, setResponseMessage] = useState('');
    const [switchToMonitoring, setSwitchToMonitoring] = useState(false);

    // Resolve form state
    const [resolutionSummary, setResolutionSummary] = useState('');

    // Chat auto-scroll reference
    const chatContainerRef = useRef(null);
    const chatBottomRef = useRef(null);

    const scrollToBottom = useCallback((smooth = true) => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTo({
                top: chatContainerRef.current.scrollHeight,
                behavior: smooth ? 'smooth' : 'auto',
            });
        } else {
            chatBottomRef.current?.scrollIntoView({
                behavior: smooth ? 'smooth' : 'auto',
                block: 'nearest',
            });
        }
    }, []);

    // Silent background fetch helper (no full-screen spinner!)
    const fetchDetail = useCallback(
        async (isSilent = false, signal) => {
            try {
                const res = await expertDiseaseCaseAPI.detail(caseId, signal);
                if (res.data?.success) {
                    const serverData = res.data.data;
                    setCaseData((prev) => {
                        if (!prev) return serverData;
                        const serverResponses = serverData.responses || [];
                        // Keep only in-flight optimistic messages that have NOT yet landed on the server
                        const pendingOptimistic = (prev.responses || []).filter((r) => {
                            if (!r.isOptimistic) return false;
                            const alreadyInServer = serverResponses.some(
                                (sr) =>
                                    sr.id === r.id ||
                                    (sr.message === r.message && sr.responseType === r.responseType)
                            );
                            return !alreadyInServer;
                        });

                        return {
                            ...serverData,
                            responses: [...serverResponses, ...pendingOptimistic],
                        };
                    });
                }
            } catch (error) {
                if (signal?.aborted) return;
                if (!isSilent) {
                    console.error('Lỗi lấy chi tiết ca bệnh:', error);
                    message.error(error.response?.data?.message || 'Không thể tải chi tiết ca bệnh');
                }
            } finally {
                if (!isSilent) {
                    setLoading(false);
                }
            }
        },
        [caseId, message]
    );

    // Initial load + Real-time socket & polling setup
    useEffect(() => {
        let isMounted = true;
        const controller = new AbortController();

        expertDiseaseCaseAPI
            .detail(caseId, controller.signal)
            .then((res) => {
                if (!isMounted || controller.signal.aborted) return;
                if (res.data?.success) {
                    setCaseData(res.data.data);
                    setFetchError(null);
                }
            })
            .catch((error) => {
                if (!isMounted || controller.signal.aborted) return;
                console.error('Lỗi lấy chi tiết ca bệnh:', error);
                const errMsg = error.response?.data?.message || 'Không thể tải chi tiết ca bệnh';
                setFetchError(errMsg);
                message.error(errMsg);
            })
            .finally(() => {
                if (isMounted && !controller.signal.aborted) {
                    setLoading(false);
                }
            });

        // Silent background polling every 4 seconds for real-time sync with KTV
        const timer = setInterval(() => {
            if (!document.hidden && isMounted) {
                fetchDetail(true, controller.signal);
            }
        }, 4000);

        // Instant wakeup via socket notification event
        const handleNotificationEvent = () => {
            if (isMounted) {
                fetchDetail(true, controller.signal);
            }
        };
        window.addEventListener(NOTIFICATION_CHANGED_EVENT, handleNotificationEvent);

        return () => {
            isMounted = false;
            controller.abort();
            clearInterval(timer);
            window.removeEventListener(NOTIFICATION_CHANGED_EVENT, handleNotificationEvent);
        };
    }, [caseId, message, fetchDetail]);

    // Scroll to bottom when tab is switched to thread
    useEffect(() => {
        if (activeTab === 'thread') {
            setTimeout(() => scrollToBottom(false), 80);
        }
    }, [activeTab, scrollToBottom]);

    // Optimistic, instantaneous chat message send (feels like Telegram/Messenger!)
    const handleSendResponse = async () => {
        const text = responseMessage.trim();
        if (!text || submitting) return;

        const tempId = `temp-${Date.now()}`;
        const optimisticMsg = {
            id: tempId,
            author: {
                id: caseData?.expert?.id || 'expert',
                fullName: caseData?.expert?.fullName || 'TS. Nguyễn Thị Mai Anh',
                role: 'EXPERT',
            },
            responseType,
            message: text,
            createdAt: new Date().toISOString(),
            isOptimistic: true,
        };

        // 1. Immediately append message to UI (zero wait!)
        setCaseData((prev) => {
            if (!prev) return prev;
            let nextStatus = prev.status;
            if (responseType === 'REQUEST_INFO' && prev.status !== 'IN_TREATMENT') {
                nextStatus = 'WAITING_FOR_INFO';
            } else if (responseType === 'EXPERT_INSTRUCTION' && switchToMonitoring && prev.status !== 'IN_TREATMENT') {
                nextStatus = 'MONITORING';
            }
            return {
                ...prev,
                status: nextStatus,
                responses: [...(prev.responses || []), optimisticMsg],
            };
        });

        // 2. Immediately clear input field so user can keep typing smoothly
        setResponseMessage('');
        const currentSwitch = switchToMonitoring;
        setSwitchToMonitoring(false);

        // 3. Smooth scroll down to newest message once
        requestAnimationFrame(() => scrollToBottom(true));

        // 4. Send API call in background
        try {
            setSubmitting(true);
            const payload = {
                responseType,
                message: text,
                switchToMonitoring: responseType === 'EXPERT_INSTRUCTION' ? currentSwitch : false,
                attachments: [],
            };

            const res = await expertDiseaseCaseAPI.respond(caseId, payload);
            if (res.data?.success) {
                const savedResponse = res.data.data;
                // Seamlessly replace the temporary optimistic message in-place
                // Zero jumping, zero duplication, transition "Đang gửi..." -> timestamp
                setCaseData((prev) => {
                    if (!prev) return prev;
                    const exists = (prev.responses || []).some((r) => r.id === savedResponse.id);
                    return {
                        ...prev,
                        responses: (prev.responses || [])
                            .map((r) => (r.id === tempId ? (exists ? null : { ...savedResponse, isOptimistic: false }) : r))
                            .filter(Boolean),
                    };
                });
            }
        } catch (error) {
            console.error('Lỗi gửi phản hồi:', error);
            message.error(error.response?.data?.message || 'Không thể gửi phản hồi. Vui lòng thử lại.');
            // Revert optimistic message and restore user text if network failed
            setCaseData((prev) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    responses: (prev.responses || []).filter((r) => r.id !== tempId),
                };
            });
            setResponseMessage(text);
        } finally {
            setSubmitting(false);
        }
    };

    const handleKeyDown = (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            handleSendResponse();
        }
    };

    const handleConfirmResolve = async () => {
        if (!resolutionSummary.trim() || resolutionSummary.trim().length < 5) {
            message.warning('Vui lòng nhập kết luận & kết quả xử lý (tối thiểu 5 ký tự)');
            return;
        }

        try {
            setResolving(true);
            const res = await expertDiseaseCaseAPI.resolve(caseId, {
                resolutionSummary: resolutionSummary.trim(),
            });

            if (res.data?.success) {
                message.success('Đã đóng ca bệnh thành công');
                setIsResolveModalOpen(false);
                await fetchDetail(true);
            }
        } catch (error) {
            console.error('Lỗi giải quyết ca bệnh:', error);
            message.error(error.response?.data?.message || 'Không thể đánh dấu giải quyết');
        } finally {
            setResolving(false);
        }
    };

    if (loading || (caseData && caseData.id !== caseId)) {
        return (
            <div className="py-20 flex justify-center">
                <Loading tip="Đang tải chi tiết ca bệnh" />
            </div>
        );
    }

    if (!caseData) {
        return (
            <div className="py-16 text-center">
                <Empty description={fetchError || 'Không tìm thấy thông tin ca bệnh'} />
                <div className="mt-4 flex justify-center gap-3">
                    {fetchError && (
                        <Button type="default" onClick={() => fetchDetail(false)}>
                            Thử lại
                        </Button>
                    )}
                    <Button type="primary" onClick={() => navigate('/expert/disease-cases')}>
                        Về danh sách
                    </Button>
                </div>
            </div>
        );
    }

    const isResolved = caseData.status === 'RESOLVED';
    const snapshot = caseData.caseSnapshot || {};
    const responses = caseData.responses || [];
    const protocols = caseData.protocols || [];
    const statusHistory = caseData.statusHistory || [];
    const attachments = caseData.attachments || [];

    // Protocol checks for resolve block matching Figma logic
    const runningTreatment = protocols.find(
        (p) => p.status === 'APPROVED' && (!p.metrics || p.metrics.completedCount < p.metrics.totalSchedules)
    );
    const pendingTreatment = protocols.find(
        (p) => p.status === 'PENDING_APPROVAL' || p.status === 'DRAFT'
    );
    const resolveBlock = runningTreatment
        ? 'Phác đồ điều trị đang chạy — chờ hoàn tất hoặc dừng khẩn cấp trước khi đóng ca.'
        : pendingTreatment
          ? (pendingTreatment.status === 'DRAFT'
                ? 'Còn phác đồ điều trị đang soạn thảo.'
                : 'Còn phác đồ điều trị đang chờ chủ trại duyệt.')
          : null;

    const approvedProtocol = protocols.find((p) => p.status === 'APPROVED');
    const symptoms = snapshot.observedSigns || snapshot.symptoms || [];

    const tabItems = [
        {
            key: 'thread',
            label: `Trao đổi · ${responses.length}`,
            children: (
                <div className="p-4 sm:p-5">
                    {/* Mô tả của KTV */}
                    <div className="rounded-xl bg-[#f6f9fc] p-3.5 mb-4 border border-[#eef1f7]">
                        <Label>Mô tả của KTV</Label>
                        <p className="m-0 text-[13px] text-[#0f1c2e] leading-relaxed">
                            {caseData.description}
                        </p>
                        {Array.isArray(symptoms) && symptoms.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                                {symptoms.map((s, idx) => (
                                    <span
                                        key={idx}
                                        className="text-[11.5px] rounded-full bg-white border border-[#e5e8f0] px-2.5 py-0.5 text-[#3a4a63]"
                                    >
                                        {s}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Timeline trao đổi with smooth scroll container */}
                    <div
                        ref={chatContainerRef}
                        className="flex flex-col gap-2.5 max-h-[500px] overflow-y-auto scroll-smooth pr-1 scrollbar-thin"
                    >
                        {responses.map((r) => {
                            const isExpert = r.author?.role === 'EXPERT' || r.author_role === 'expert';
                            const isUrgent = r.responseType === 'EMERGENCY_ALERT' || r.response_type === 'emergency_alert';
                            const authorName = r.author?.fullName || r.author_name || 'Người dùng';
                            const initials = authorName.split(' ').filter(Boolean).slice(-1)[0]?.[0]?.toUpperCase() || (isExpert ? 'A' : 'T');

                            return (
                                <div
                                    key={r.id}
                                    className={`flex gap-2.5 ${isExpert ? 'flex-row-reverse' : ''}`}
                                >
                                    <Avatar
                                        size={32}
                                        className={
                                            isExpert
                                                ? '!bg-[#e2f6f3] !text-[#0f9b8e]'
                                                : '!bg-[#eaf4ff] !text-[#1d7ad6]'
                                        }
                                    >
                                        {initials}
                                    </Avatar>
                                    <div
                                        className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 shadow-xs ${
                                            isUrgent
                                                ? 'bg-[#fbe6ea] border border-[#d43b57]/30'
                                                : isExpert
                                                  ? 'bg-[#e2f6f3]'
                                                  : 'bg-white border border-[#e5e8f0]'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 text-[11px] mb-0.5">
                                            <span className="font-semibold text-[#0f1c2e]">
                                                {authorName}
                                            </span>
                                            <span
                                                className={`font-semibold ${
                                                    isUrgent ? 'text-[#d43b57]' : 'text-[#6a7994]'
                                                }`}
                                            >
                                                {responseTypeLabels[r.responseType || r.response_type] || r.responseType}
                                            </span>
                                            {r.isOptimistic ? (
                                                <span className="text-[#0f9b8e] flex items-center gap-1 font-normal text-[10.5px]">
                                                    <LoadingOutlined className="text-[10px]" /> Đang gửi…
                                                </span>
                                            ) : (
                                                <span className="text-[#6a7994]">
                                                    {fmtDateTime(r.createdAt || r.created_at)}
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-[13px] text-[#0f1c2e] leading-relaxed whitespace-pre-wrap">
                                            {r.message}
                                        </div>
                                        {Array.isArray(r.attachments) && r.attachments.length > 0 && (
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                {r.attachments.map((att, aIdx) => {
                                                    const url = typeof att === 'string' ? att : att.url || att.filePath || att.link;
                                                    const name = typeof att === 'string' ? `Đính kèm ${aIdx + 1}` : att.fileName || att.name || `Đính kèm ${aIdx + 1}`;
                                                    const isImg = url && (/\.(jpg|jpeg|png|webp|gif)$/i.test(url) || att.fileType?.startsWith('image/'));
                                                    if (isImg) {
                                                        return (
                                                            <Image
                                                                key={aIdx}
                                                                src={url}
                                                                alt={name}
                                                                width={60}
                                                                height={60}
                                                                className="rounded-lg object-cover border border-[#e5e8f0]"
                                                            />
                                                        );
                                                    }
                                                    return (
                                                        <a
                                                            key={aIdx}
                                                            href={url}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#f1f5f9] text-[11px] text-[#1d7ad6] hover:underline"
                                                        >
                                                            <PaperClipOutlined className="text-[12px]" />
                                                            <span className="truncate max-w-[150px]">{name}</span>
                                                        </a>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={chatBottomRef} />
                    </div>

                    {/* Form gửi phản hồi của Chuyên gia */}
                    {!isResolved && (
                        <div className="mt-4 rounded-xl border border-[#e5e8f0] p-3 bg-white shadow-xs">
                            <div className="flex items-center gap-2 mb-2">
                                <Segmented
                                    size="small"
                                    value={responseType}
                                    onChange={(v) => {
                                        setResponseType(v);
                                        if (v === 'EXPERT_INSTRUCTION') {
                                            setSwitchToMonitoring(true);
                                        }
                                    }}
                                    options={[
                                        { value: 'EXPERT_ASSESSMENT', label: 'Đánh giá chuyên môn' },
                                        { value: 'EXPERT_INSTRUCTION', label: 'Chỉ dẫn xử lý' },
                                        { value: 'REQUEST_INFO', label: 'Yêu cầu bổ sung' },
                                    ]}
                                />
                                {responseType === 'REQUEST_INFO' && caseData.status !== 'IN_TREATMENT' && (
                                    <span className="text-[11.5px] text-[#d98314]">
                                        Ca sẽ chuyển sang “Chờ bổ sung”
                                    </span>
                                )}
                            </div>

                            <Input.TextArea
                                rows={3}
                                value={responseMessage}
                                onChange={(e) => setResponseMessage(e.target.value)}
                                onKeyDown={handleKeyDown}
                                maxLength={500}
                                placeholder={
                                    responseType === 'REQUEST_INFO'
                                        ? 'Nêu rõ thông tin cần KTV bổ sung: ảnh cận, chỉ số nước theo giờ, số tôm chết… (Nhấn Ctrl + Enter để gửi)'
                                        : responseType === 'EXPERT_INSTRUCTION'
                                          ? 'Chỉ dẫn xử lý cụ thể cho KTV… (Nhấn Ctrl + Enter để gửi)'
                                          : 'Nhận định nguyên nhân, mức độ, hướng xử lý… (Nhấn Ctrl + Enter để gửi)'
                                }
                            />

                            <div className="flex items-center justify-between mt-2.5">
                                {responseType === 'EXPERT_INSTRUCTION' && caseData.status !== 'IN_TREATMENT' ? (
                                    <Checkbox
                                        checked={switchToMonitoring}
                                        onChange={(e) => setSwitchToMonitoring(e.target.checked)}
                                    >
                                        <span className="text-[12px]">
                                            Chuyển ca sang “Theo dõi” (không cần thuốc)
                                        </span>
                                    </Checkbox>
                                ) : (
                                    <span className="text-[11px] text-[#8796ae]">
                                        Nhấn <kbd className="px-1.5 py-0.5 rounded bg-[#f1f5f9] border border-[#e2e8f0] font-mono text-[10px]">Ctrl + Enter</kbd> để gửi
                                    </span>
                                )}
                                <div className="flex items-center gap-3">
                                    <span className={`text-[11.5px] font-mono ${responseMessage.length >= 500 ? 'text-[#d43b57] font-semibold' : 'text-[#8796ae]'}`}>
                                        {responseMessage.length}/500
                                    </span>
                                    <Button
                                        type="primary"
                                        icon={<SendOutlined />}
                                        disabled={!responseMessage.trim()}
                                        loading={submitting}
                                        onClick={handleSendResponse}
                                        className={
                                            !responseMessage.trim()
                                                ? 'h-9! rounded-xl! px-4!'
                                                : 'h-9! rounded-xl! border-0! bg-linear-to-r! from-[#77a1d3]! to-[#79cbca]! px-4! text-white! shadow-none! hover:opacity-90! transition-opacity'
                                        }
                                    >
                                        Gửi
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ),
        },
        {
            key: 'treatment',
            label: `Phác đồ điều trị · ${protocols.length}`,
            children: (
                <div className="p-4 sm:p-5">
                    <div className="flex items-center justify-between mb-3">
                        <div className="text-[12px] text-[#6a7994]">
                            {approvedProtocol ? (
                                <>
                                    Đang áp dụng <b className="text-[#0f1c2e]">v{approvedProtocol.versionNo}</b> · duyệt {fmtDate(approvedProtocol.approvedAt || approvedProtocol.updatedAt)}
                                </>
                            ) : (
                                'Chưa có phác đồ điều trị được duyệt'
                            )}
                        </div>
                        {!isResolved && (
                            pendingTreatment ? (
                                <Tooltip
                                    title={
                                        pendingTreatment.status === 'DRAFT'
                                            ? 'Ca bệnh đang có phác đồ đang soạn thảo'
                                            : 'Ca bệnh đang có phác đồ chờ duyệt'
                                    }
                                >
                                    <span>
                                        <Button
                                            type="primary"
                                            icon={<PlusOutlined />}
                                            disabled
                                            className="h-9! rounded-xl! px-4! text-[13px]! font-medium!"
                                        >
                                            Tạo phác đồ điều trị
                                        </Button>
                                    </span>
                                </Tooltip>
                            ) : (
                                <Button
                                    type="primary"
                                    icon={<PlusOutlined />}
                                    onClick={() => message.info('Chức năng tạo phác đồ điều trị thuộc phân hệ Phác đồ điều trị')}
                                    className="h-9! rounded-xl! border-0! bg-linear-to-r! from-[#77a1d3]! to-[#79cbca]! px-4! text-[13px]! font-medium! text-white! shadow-none! hover:opacity-90! transition-opacity"
                                >
                                    Tạo phác đồ điều trị
                                </Button>
                            )
                        )}
                    </div>

                    {!protocols.length ? (
                        <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description="Chưa có phác đồ điều trị"
                        />
                    ) : (
                        <div className="flex flex-col gap-2">
                            {protocols.map((p) => {
                                const isApproved = p.status === 'APPROVED';
                                const completed = p.metrics?.completedCount ?? 0;
                                const total = p.metrics?.totalSchedules ?? 0;

                                return (
                                    <div
                                        key={p.id}
                                        className={`grid grid-cols-[48px_1fr] gap-3 items-center rounded-xl border px-3.5 py-3 ${
                                            isApproved
                                                ? 'border-[#0f9b8e]/40 bg-[#e2f6f3]/40'
                                                : 'border-[#e5e8f0] bg-white'
                                        }`}
                                    >
                                        <div className="font-mono text-[13px] font-semibold text-[#3a4a63] text-center">
                                            v{p.versionNo}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-semibold text-[13px] text-[#0f1c2e] truncate">
                                                    {p.title}
                                                </span>
                                                <ProtocolTag s={p.status} />
                                            </div>
                                            <div className="text-[11.5px] text-[#6a7994] mt-0.5">
                                                {p.stages?.length || 1} giai đoạn · {p.items?.length || 0} hạng mục ·{' '}
                                                {p.submittedAt
                                                    ? `gửi ${fmtDateTime(p.submittedAt)}`
                                                    : `sửa ${fmtDateTime(p.updatedAt || p.createdAt)}`}
                                                {p.status === 'REJECTED' && p.rejectionReason && (
                                                    <span className="text-[#d43b57]"> · {p.rejectionReason}</span>
                                                )}
                                            </div>

                                            {isApproved && total > 0 && (
                                                <Progress
                                                    percent={Math.round((completed / total) * 100)}
                                                    size="small"
                                                    className="!m-0 !mt-1 max-w-80"
                                                    format={() => `${completed}/${total} lịch`}
                                                />
                                            )}

                                            {p.status === 'ABORTED' && p.abortReason && (
                                                <div className="mt-1 text-[11px] text-[#d43b57]">
                                                    <StopOutlined /> Dừng khẩn cấp: {p.abortReason}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            ),
        },
        {
            key: 'history',
            label: 'Lịch sử trạng thái',
            children: (
                <div className="p-4 sm:p-5">
                    {statusHistory.length === 0 ? (
                        <div className="py-8 text-center text-xs text-[#6a7994]">
                            Chưa có bản ghi thay đổi trạng thái nào
                        </div>
                    ) : (
                        <Timeline
                            items={[...statusHistory].map((h) => ({
                                color:
                                    h.toStatus === 'RESOLVED' || h.to === 'resolved'
                                        ? 'green'
                                        : h.toStatus === 'IN_TREATMENT' || h.to === 'in_treatment'
                                          ? 'red'
                                          : 'blue',
                                children: (
                                    <div className="text-[12.5px]">
                                        <div className="flex items-center gap-1.5">
                                            {h.fromStatus && <CaseTag s={h.fromStatus} />}
                                            {h.fromStatus && (
                                                <ArrowRightOutlined className="text-[#6a7994] text-[10px]" />
                                            )}
                                            <CaseTag s={h.toStatus || h.to} />
                                        </div>
                                        <div className="text-[#6a7994] mt-0.5">
                                            {h.changer?.fullName || h.by || 'Người dùng'} · {fmtDateTime(h.changedAt || h.at)}
                                            {h.reason && ` · ${h.reason}`}
                                        </div>
                                    </div>
                                ),
                            }))}
                        />
                    )}
                </div>
            ),
        },
    ];

    return (
        <ConfigProvider theme={PROTOCOL_THEME}>
            <div className="w-full min-w-0">
                {/* Back button matching team layout */}
                <Button
                    type="text"
                    icon={<ArrowLeftOutlined />}
                    onClick={() => navigate('/expert/disease-cases')}
                    className="!mb-1.5 !px-0 !text-[#6a7994] hover:!text-[#1d7ad6]"
                >
                    Ca bệnh được giao
                </Button>

                <PageHeader
                    title={
                        <span className="flex items-center gap-2 flex-wrap">
                            {caseData.title} <SeverityTag s={caseData.severity} /> <CaseTag s={caseData.status} />
                        </span>
                    }
                    description={`${caseData.season?.name || 'Vụ nuôi'} — ${caseData.season?.pond?.name || 'Ao'} · DOC ${snapshot.doc || '—'} khi báo · KTV ${caseData.reporter?.fullName || '—'} · tạo ${fmtDateTime(caseData.createdAt)}`}
                    extra={
                        !isResolved && (
                            <Tooltip title={resolveBlock}>
                                <Button
                                    type="primary"
                                    icon={<CheckCircleOutlined />}
                                    disabled={Boolean(resolveBlock)}
                                    onClick={() => setIsResolveModalOpen(true)}
                                    className={
                                        resolveBlock
                                            ? 'h-9! rounded-xl! px-4! text-[13px]! font-medium!'
                                            : 'h-9! rounded-xl! border-0! bg-linear-to-r! from-[#77a1d3]! to-[#79cbca]! px-4! text-[13px]! font-medium! text-white! shadow-none! hover:opacity-90! transition-opacity'
                                    }
                                >
                                    Đánh dấu đã giải quyết
                                </Button>
                            </Tooltip>
                        )
                    }
                />

                {isResolved && (
                    <Alert
                        showIcon
                        icon={<CheckCircleFilled className="!text-[#0f9b8e] !text-base" />}
                        className="!mb-3.5 !rounded-xl !border-[#bbf0e8] !bg-[#e2f6f3] !text-[#0b7a70] [&_.ant-alert-message]:!font-semibold [&_.ant-alert-message]:!text-[#0b7a70] [&_.ant-alert-description]:!text-[#0b7a70] [&_.ant-alert-description]:!opacity-90 [&_.ant-alert-icon]:!text-[#0f9b8e]"
                        message={`Đã giải quyết · ${fmtDateTime(caseData.resolvedAt || caseData.updatedAt)}`}
                        description={caseData.resolutionSummary || 'Đã kết thúc xử lý.'}
                    />
                )}

                {/* 2-Column Layout */}
                <div className="grid grid-cols-[1fr_360px] gap-3.5 max-[1100px]:grid-cols-1 items-start">
                    {/* Left Column: Tabs Panel */}
                    <Panel pad={false}>
                        <Tabs
                            activeKey={activeTab}
                            onChange={setActiveTab}
                            className="[&_.ant-tabs-nav]:!px-4 [&_.ant-tabs-nav]:!mb-0"
                            items={tabItems}
                        />
                    </Panel>

                    {/* Right Column (360px): Sidebar Panels */}
                    <div className="flex flex-col gap-3.5">
                        {/* Panel 1: Gợi ý AI khi tạo ca */}
                        {snapshot.aiDiagnosis && (
                            <Panel
                                title={
                                    <span>
                                        <RobotOutlined className="mr-1.5 text-[#7b5bd6]" />
                                        Gợi ý AI khi tạo ca
                                    </span>
                                }
                            >
                                <div className="font-semibold text-[#0f1c2e] mb-1 text-[13px]">
                                    {snapshot.aiDiagnosis.disease || snapshot.aiDiagnosis.label}
                                </div>
                                <Progress
                                    percent={Math.round(
                                        snapshot.aiDiagnosis.confidence <= 1
                                            ? snapshot.aiDiagnosis.confidence * 100
                                            : snapshot.aiDiagnosis.confidence
                                    )}
                                    strokeColor="#7b5bd6"
                                    size="small"
                                />
                                <div className="text-[11px] text-[#6a7994] mt-1.5 leading-normal">
                                    Chỉ mang tính tham khảo — kết luận thuộc về chuyên gia.
                                </div>
                            </Panel>
                        )}

                        {/* Panel 2: SnapshotPanel */}
                        <SnapshotPanel
                            c={caseData}
                            current={caseData.latestMetrics?.water || caseData.latestWaterLog}
                        />

                        {/* Panel 3: Ảnh đính kèm */}
                        {attachments.length > 0 && (
                            <Panel title={`Ảnh đính kèm · ${attachments.length}`}>
                                <Image.PreviewGroup>
                                    <div className="grid grid-cols-2 gap-2">
                                        {attachments.map((a, idx) => (
                                            <div key={a.id || idx}>
                                                <Image
                                                    src={a.fileUrl || a.url}
                                                    alt={a.caption}
                                                    className="!rounded-lg bg-[#eaf4ff] object-cover aspect-[4/3]"
                                                />
                                                <div className="text-[11px] text-[#6a7994] mt-1 truncate">
                                                    {a.caption}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </Image.PreviewGroup>
                            </Panel>
                        )}
                    </div>
                </div>

                {/* Modal Đánh dấu ca đã giải quyết */}
                <ResolveModal
                    open={isResolveModalOpen}
                    resolving={resolving}
                    onClose={() => setIsResolveModalOpen(false)}
                    onConfirm={handleConfirmResolve}
                    summary={resolutionSummary}
                    setSummary={setResolutionSummary}
                />
            </div>
        </ConfigProvider>
    );
};

/** Snapshot lúc báo ca so với đo mới nhất matching Figma */
function SnapshotPanel({ c, current }) {
    const s = c.caseSnapshot || {};
    const health = s.shrimpHealth || s.health || {};
    const water = s.waterIndicators || s.water || {};

    const rows = [
        {
            k: 'dissolvedOxygenMgL',
            fallbackK: 'dissolved_oxygen_mg_l',
            label: 'DO',
            unit: 'mg/L',
            bad: (v) => v < 4,
        },
        {
            k: 'ph',
            fallbackK: 'ph',
            label: 'pH',
            unit: '',
            bad: (v) => v < 7.5 || v > 8.5,
        },
        {
            k: 'temperatureC',
            fallbackK: 'temperature_c',
            label: 'Nhiệt độ',
            unit: '°C',
            bad: (v) => v < 28 || v > 32,
        },
        {
            k: 'nh3MgL',
            fallbackK: 'nh3_mg_l',
            label: 'NH₃',
            unit: 'mg/L',
            bad: (v) => v > 0.1,
        },
        {
            k: 'no2MgL',
            fallbackK: 'no2_mg_l',
            label: 'NO₂',
            unit: 'mg/L',
            bad: (v) => v > 1,
        },
        {
            k: 'alkalinityMgLCaCO3',
            fallbackK: 'alkalinity_mg_l',
            label: 'Kiềm',
            unit: 'mg/L',
            bad: (v) => v < 100,
        },
        {
            k: 'salinityPpt',
            fallbackK: 'salinity_ppt',
            label: 'Độ mặn',
            unit: '‰',
            bad: (v) => v < 10,
        },
    ];

    const healthStatus = health.healthStatus || health.health_status || null;
    const avgWeight = health.avgWeightG ?? health.avg_weight_g ?? null;
    const biomass = health.estimatedBiomassKg ?? health.estimated_biomass_kg ?? null;
    const mortality = health.mortality7d ?? health.mortality_7d ?? null;

    const healthMetricsParts = [
        avgWeight != null ? `${avgWeight} g` : null,
        biomass != null ? `${biomass} kg` : null,
        mortality != null ? `chết 7d ${mortality}` : null,
    ].filter(Boolean);

    return (
        <Panel title="Ảnh chụp dữ liệu khi báo ca">
            <div className="flex items-center justify-between mb-2.5">
                {healthStatus ? (
                    <HealthTag s={healthStatus} />
                ) : (
                    <span className="text-[12px] text-[#8796ae]">Chưa có đánh giá sức khỏe</span>
                )}
                <span className="text-[12px] text-[#6a7994] font-mono">
                    {healthMetricsParts.length > 0 ? healthMetricsParts.join(' · ') : 'Chưa có số liệu tôm'}
                </span>
            </div>
            <table className="w-full text-[12px]">
                <thead>
                    <tr className="text-[#6a7994] text-left">
                        <th className="font-medium pb-1.5">Chỉ số</th>
                        <th className="font-medium pb-1.5 text-right">Khi báo</th>
                        {current && <th className="font-medium pb-1.5 text-right">Hiện tại</th>}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r) => {
                        const aVal = water[r.k] ?? water[r.fallbackK];
                        const hasA = aVal != null && aVal !== '';
                        const aBad = hasA && r.bad(Number(aVal));

                        const bVal = current ? (current[r.k] ?? current[r.fallbackK]) : undefined;
                        const hasB = bVal != null && bVal !== '';
                        const bBad = hasB && r.bad(Number(bVal));

                        return (
                            <tr key={r.label} className="border-t border-[#eef1f7]">
                                <td className="py-1.5 text-[#3a4a63]">{r.label}</td>
                                <td className={`py-1.5 text-right font-mono ${aBad ? 'text-[#d43b57] font-semibold' : ''}`}>
                                    {aBad && <ExclamationCircleFilled className="mr-1 text-[10px]" />}
                                    {hasA ? `${aVal} ${r.unit}`.trim() : '—'}
                                </td>
                                {current && (
                                    <td className={`py-1.5 text-right font-mono ${hasB ? (bBad ? 'text-[#d43b57] font-semibold' : 'text-[#0f9b8e]') : ''}`}>
                                        {hasB ? bVal : '—'}
                                    </td>
                                )}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            {current && (
                <div className="text-[11px] text-[#6a7994] mt-2">
                    <ClockCircleOutlined /> Hiện tại: đo {fmtDateTime(current.recordedAt || current.recorded_at || new Date().toISOString())}
                </div>
            )}
        </Panel>
    );
}

function ResolveModal({
    open,
    resolving,
    onClose,
    onConfirm,
    summary,
    setSummary,
}) {
    return (
        <Modal
            open={open}
            onCancel={onClose}
            title="Đánh dấu ca đã giải quyết"
            okText="Đóng ca"
            cancelText="Hủy"
            confirmLoading={resolving}
            okButtonProps={{
                disabled: !summary.trim(),
                className: !summary.trim()
                    ? 'rounded-xl! h-9! px-4!'
                    : 'rounded-xl! h-9! px-4! border-0! bg-linear-to-r! from-[#77a1d3]! to-[#79cbca]! text-white! shadow-none! hover:opacity-90!',
            }}
            cancelButtonProps={{
                className: 'rounded-xl! h-9! px-4!',
            }}
            onOk={onConfirm}
        >
            <p className="text-[13px] text-[#6a7994] mt-0 mb-3">
                Ca đã đóng không thể mở lại; nếu tái phát KTV tạo ca mới liên kết ca này.
            </p>
            <div className="flex items-center justify-between mb-1">
                <Label>Kết luận & kết quả xử lý (bắt buộc)</Label>
                <span className={`text-[11.5px] font-mono ${summary.length >= 500 ? 'text-[#d43b57] font-semibold' : 'text-[#8796ae]'}`}>
                    {summary.length}/500
                </span>
            </div>
            <Input.TextArea
                rows={4}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                maxLength={500}
                placeholder="Nguyên nhân, biện pháp đã áp dụng, kết quả, khuyến nghị phòng ngừa…"
            />
        </Modal>
    );
}

export default ExpertDiseaseCaseDetail;
