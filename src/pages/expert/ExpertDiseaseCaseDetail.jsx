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
    Select,
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
    LoadingOutlined,
    RobotOutlined,
    SendOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { expertDiseaseCaseAPI } from '../../apis';
import Loading from '../../components/Loading';
import ExpertCaseSnapshot from '../../components/ExpertCaseSnapshot';
import ExpertTreatmentProtocols from '../../components/ExpertTreatmentProtocols';
import { responseAttachment, caseResolutionBlock } from '../../utils/diseaseCaseUtils';
import { PROTOCOL_THEME } from '../../constants/productionProtocol';
import { NOTIFICATION_CHANGED_EVENT } from '../../utils/notificationUtils';
import {
    CaseTag,
    Label,
    PageHeader,
    Panel,
    SeverityTag,
} from './expertUI';
import { getErrorMessage } from '../../utils/errorMessage.js';
import ErrorState from '../../components/ErrorState';

const responseTypeLabels = {
    NORMAL: 'Trao đổi',
    normal: 'Trao đổi',
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

const AI_LABEL_MAP = {
    Healthy: 'Khỏe mạnh',
    BG: 'Mang đen',
    WSSV: 'Đốm trắng',
    WSSV_BG: 'Đốm trắng và mang đen',
};

const formatAiDiagnosis = (ai) => {
    if (!ai) return null;
    const isUnrecognized = ai.recognitionStatus === 'UNRECOGNIZED';
    const rawLabel = ai.disease || ai.label || ai.predictedLabel || ai.diseaseName;
    const cleanLabel =
        rawLabel && rawLabel !== 'undefined' && rawLabel !== 'null' ? String(rawLabel).trim() : null;
    const displayLabel = cleanLabel ? AI_LABEL_MAP[cleanLabel] || cleanLabel : null;

    const isRecognized = !isUnrecognized && Boolean(displayLabel);
    const label = isRecognized ? displayLabel : 'Chưa nhận diện được bệnh';

    const rawConf = ai.confidence != null ? Number(ai.confidence) : null;
    const confidence =
        rawConf != null && Number.isFinite(rawConf)
            ? Math.round(rawConf <= 1 ? rawConf * 100 : rawConf)
            : null;

    return {
        label,
        isRecognized,
        confidence,
    };
};

const ExpertDiseaseCaseDetail = () => {
    const { caseId } = useParams();
    return <ExpertCaseDetail key={caseId} caseId={caseId} />;
};

/** Coordinate case conversation, care decisions and treatment versions from the scoped detail response. */
const ExpertCaseDetail = ({ caseId }) => {
    const navigate = useNavigate();
    const { message } = App.useApp();
    const activeCaseId = useRef(caseId);

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [resolving, setResolving] = useState(false);
    const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);

    const [caseData, setCaseData] = useState(null);
    const [fetchError, setFetchError] = useState(null);
    const [searchParams, setSearchParams] = useSearchParams();
    const requestedTab = searchParams.get('tab');
    const activeTab = ['thread', 'treatment', 'history'].includes(requestedTab) ? requestedTab : 'thread';
    const changeTab = value => setSearchParams(previous => {
        const next = new URLSearchParams(previous);
        next.set('tab', value);
        return next;
    }, { replace: true });

    // Response form state
    const responseType = 'NORMAL';
    const [responseMessage, setResponseMessage] = useState('');
    const [careAction, setCareAction] = useState(null);
    const [careReason, setCareReason] = useState('');
    const [careBusy, setCareBusy] = useState(false);
    const [careContext, setCareContext] = useState(null);
    const [careConfirm, setCareConfirm] = useState(false);
    const [resolutionContext, setResolutionContext] = useState(null);
    const [resolveConfirmed, setResolveConfirmed] = useState(false);

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

    // Background synchronization helper without blocking the viewport
    const fetchDetail = useCallback(
        async (isSilent = false, signal) => {
            if (!isSilent) setLoading(true);
            try {
                const res = await expertDiseaseCaseAPI.detail(caseId, signal);
                if (signal?.aborted || activeCaseId.current !== caseId) return;
                if (res.data?.success) {
                    const serverData = res.data.data;
                    setFetchError(null);
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
                    setFetchError(getErrorMessage(error, 'Không thể tải chi tiết ca bệnh'));
                }
            } finally {
                if (!isSilent) {
                    setLoading(false);
                }
            }
        },
        [caseId]
    );

    // Initial load + Real-time socket & polling setup
    useEffect(() => {
        let isMounted = true;
        const controller = new AbortController();
        activeCaseId.current = caseId;

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
                const errMsg = getErrorMessage(error, 'Không thể tải chi tiết ca bệnh');
                setFetchError(errMsg);
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
            activeCaseId.current = null;
            controller.abort();
            clearInterval(timer);
            window.removeEventListener(NOTIFICATION_CHANGED_EVENT, handleNotificationEvent);
        };
    }, [caseId, fetchDetail]);

    // Scroll to bottom when tab is switched to thread
    useEffect(() => {
        if (activeTab === 'thread') {
            setTimeout(() => scrollToBottom(false), 80);
        }
    }, [activeTab, scrollToBottom]);

    // Optimistic messages are temporary; only the server determines clinical state.
    const handleSendResponse = async () => {
        const text = responseMessage.trim();
        if (!text || submitting) return;

        const tempId = `temp-${Date.now()}`;
        const optimisticMsg = {
            id: tempId,
            author: {
                id: caseData?.expert?.id || 'expert',
                fullName: caseData?.expert?.fullName || 'Chuyên gia',
                role: 'EXPERT',
                avatarUrl: caseData?.expert?.avatarUrl || null,
            },
            responseType,
            message: text,
            createdAt: new Date().toISOString(),
            isOptimistic: true,
        };

        // Keep the clinical state unchanged until the server accepts the response.
        setCaseData((prev) => {
            if (!prev) return prev;
            return {
                ...prev,
                responses: [...(prev.responses || []), optimisticMsg],
            };
        });

        // Preserve form values for retry if the request fails.
        setResponseMessage('');

        requestAnimationFrame(() => scrollToBottom(true));

        try {
            setSubmitting(true);
            const payload = {
                responseType,
                message: text,
                attachments: [],
            };

            const res = await expertDiseaseCaseAPI.respond(caseId, payload);
            if (activeCaseId.current !== caseId) return;
            if (res.data?.success) {
                const savedResponse = res.data.data;
                // A polling response may already contain the saved message.
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
                await fetchDetail(true);
            }
        } catch (error) {
            if (activeCaseId.current !== caseId) return;
            message.error(getErrorMessage(error, 'Không thể gửi phản hồi. Vui lòng thử lại.'));
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
            if (activeCaseId.current === caseId) setSubmitting(false);
        }
    };

    const handleKeyDown = (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            handleSendResponse();
        }
    };

    /** Freeze the case, suspension IDs and displayed production version for confirmation. */
    const openCare = () => {
        setCareAction(caseData.care.canMonitor ? 'MONITOR' : 'RESUME_PRODUCTION');
        setCareReason('');
        setCareContext({ ...caseData.care, updatedAt: caseData.updatedAt,
            holds: caseData.productionHolds.filter(row => caseData.care.holdIds.includes(row.id)) });
        setCareConfirm(false);
    };
    /** Require a second confirmation before resuming production and discard stale decisions on conflict. */
    const confirmCare = async () => {
        if (careBusy || careReason.trim().length < 5) return;
        if (careAction === 'RESUME_PRODUCTION' && !careConfirm) { setCareConfirm(true); return; }
        setCareBusy(true);
        try {
            const response = await expertDiseaseCaseAPI.care(caseId, { action: careAction,
                reason: careReason.trim(), expectedUpdatedAt: careContext.updatedAt,
                episodeId: careContext.episodeId,
                ...(careAction === 'RESUME_PRODUCTION' && { confirmResume: true,
                    expectedProduction: { id: careContext.production.protocolId, updatedAt: careContext.production.protocolUpdatedAt } }),
                releaseHoldIds: careAction === 'RESUME_PRODUCTION' ? careContext.holdIds : [] });
            if (activeCaseId.current !== caseId) return;
            message.success(response.data.data.productionActive ? 'Đã cho phép phác đồ nuôi chạy tiếp.'
                : 'Đã lưu quyết định tiếp tục theo dõi, tạm hoãn phác đồ nuôi.');
            setCareAction(null);
            await fetchDetail(true);
        } catch (error) {
            if (activeCaseId.current !== caseId) return;
            message.error(getErrorMessage(error, 'Không thể lưu quyết định chăm sóc'));
            if (error.response?.status === 409) {
                setCareAction(null);
                await fetchDetail(true);
            }
        } finally { if (activeCaseId.current === caseId) setCareBusy(false); }
    };

    /** Submit the clinical conclusion with explicit consent when no production plan can continue. */
    const handleConfirmResolve = async () => {
        if (resolving) return;
        if (resolutionContext?.confirmWithoutProduction && !resolveConfirmed) return;
        if (!resolutionSummary.trim() || resolutionSummary.trim().length < 5) {
            message.warning('Vui lòng nhập kết luận & kết quả xử lý (tối thiểu 5 ký tự)');
            return;
        }

        try {
            setResolving(true);
            const res = await expertDiseaseCaseAPI.resolve(caseId, {
                resolutionSummary: resolutionSummary.trim(),
                expectedUpdatedAt: resolutionContext.updatedAt,
                ...(resolutionContext.confirmWithoutProduction && { confirmWithoutProduction: true }),
            });
            if (activeCaseId.current !== caseId) return;

            if (res.data?.success) {
                message.success('Đã đóng ca bệnh thành công');
                setIsResolveModalOpen(false);
                await fetchDetail(true);
            }
        } catch (error) {
            if (activeCaseId.current !== caseId) return;
            message.error(getErrorMessage(error, 'Không thể đánh dấu giải quyết'));
            if (error.response?.status === 409) { setIsResolveModalOpen(false); await fetchDetail(true); }
        } finally {
            if (activeCaseId.current === caseId) setResolving(false);
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
                {fetchError ? <ErrorState message={fetchError} onRetry={() => fetchDetail(false)} />
                    : <Empty description="Không tìm thấy thông tin ca bệnh" />}
                <div className="mt-4 flex justify-center gap-3">
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

    const resolveBlock = caseResolutionBlock(caseData.status, protocols, caseData.productionHolds, caseData.resolution);

    const symptoms = snapshot.observedSigns || snapshot.symptoms || [];

    const tabItems = [
        {
            key: 'thread',
            label: `Trao đổi · ${responses.length}`,
            children: (
                <div className="p-4 sm:p-5">
                    {/* Technician observations */}
                    <div className="rounded-xl bg-[#f6f9fc] p-3.5 mb-4 border border-[#eef1f7]">
                        <div className="flex items-center gap-2 mb-1.5">
                            <Avatar
                                size={22}
                                src={caseData.reporter?.avatarUrl || undefined}
                                className="!bg-[#eaf4ff] !text-[#1d7ad6] shrink-0 border border-white shadow-xs font-semibold"
                            >
                                {caseData.reporter?.fullName?.split(' ').filter(Boolean).slice(-1)[0]?.[0]?.toUpperCase() || 'K'}
                            </Avatar>
                            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6a7994]">
                                Mô tả của Kỹ thuật viên {caseData.reporter?.fullName ? `· ${caseData.reporter.fullName}` : ''}
                            </span>
                        </div>
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

                    {/* Case conversation */}
                    <div
                        ref={chatContainerRef}
                        className="flex flex-col gap-2.5 max-h-[500px] overflow-y-auto scroll-smooth pr-1 scrollbar-thin"
                    >
                        {responses.map((r) => {
                            const isExpert = r.author?.role === 'EXPERT' || r.author_role === 'expert';
                            const isUrgent = r.responseType === 'EMERGENCY_ALERT' || r.response_type === 'emergency_alert';
                            const isCare = Boolean(r.careAction);
                            const authorName = r.author?.fullName || r.author_name || 'Người dùng';
                            const authorAvatar =
                                r.author?.avatarUrl ||
                                r.author_avatar_url ||
                                (isExpert ? caseData?.expert?.avatarUrl : caseData?.reporter?.avatarUrl) ||
                                null;
                            const initials = authorName.split(' ').filter(Boolean).slice(-1)[0]?.[0]?.toUpperCase() || (isExpert ? 'A' : 'T');

                            return (
                                <div
                                    key={r.id} data-care-action={r.careAction || undefined}
                                    className={`flex gap-2.5 ${isExpert ? 'flex-row-reverse' : ''}`}
                                >
                                    <Avatar
                                        size={34}
                                        src={authorAvatar || undefined}
                                        className={`shrink-0 border border-white shadow-xs font-semibold ${
                                            isExpert
                                                ? '!bg-[#e2f6f3] !text-[#0f9b8e]'
                                                : '!bg-[#eaf4ff] !text-[#1d7ad6]'
                                        }`}
                                    >
                                        {initials}
                                    </Avatar>
                                    <div
                                        className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 shadow-xs ${
                                            isCare ? 'bg-[#fff7e6] border border-[#e6ad45]'
                                                : isUrgent
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
                                                {isCare ? 'Quyết định chăm sóc' : responseTypeLabels[r.responseType || r.response_type] || r.responseType}
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
                                                    const attachment = responseAttachment(att);
                                                    if (!attachment) return null;
                                                    const { url, isImage: isImg } = attachment;
                                                    const name = attachment.label;
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

                    {/* Expert conversation input */}
                    {!isResolved && (
                        <div className="mt-4 rounded-xl border border-[#e5e8f0] p-3 bg-white shadow-xs">
                            <Input.TextArea
                                rows={3}
                                disabled={submitting}
                                value={responseMessage}
                                onChange={(e) => setResponseMessage(e.target.value)}
                                onKeyDown={handleKeyDown}
                                maxLength={500}
                                placeholder="Nhập nội dung trao đổi với Kỹ thuật viên… (Ctrl + Enter để gửi)"
                            />

                            <div className="flex items-center justify-between mt-2.5">
                                <span className="text-[11px] text-[#8796ae]">Trao đổi không làm đổi trạng thái ca.</span>
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
            children: <ExpertTreatmentProtocols key={caseId} diseaseCase={caseData} onChanged={() => fetchDetail(true)} />,
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
                                            {h.changer?.fullName || h.by || (h.changedBy ? 'Tài khoản cũ' : 'Hệ thống')} · {fmtDateTime(h.changedAt || h.at)}
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
                    description={`${caseData.season?.name || 'Vụ nuôi'} — ${caseData.season?.pond?.name || 'Ao'} · DOC ${snapshot.doc || '—'} khi báo · Kỹ thuật viên ${caseData.reporter?.fullName || '—'} · tạo ${fmtDateTime(caseData.createdAt)}`}
                    extra={
                        !isResolved && (<>
                            {caseData.care?.available && <Button onClick={openCare}>Quyết định chăm sóc</Button>}
                            <Tooltip title={resolveBlock}>
                                <Button
                                    type="primary"
                                    icon={<CheckCircleOutlined />}
                                    disabled={Boolean(resolveBlock)}
                                    onClick={() => { setResolutionContext({ ...caseData.resolution, updatedAt: caseData.updatedAt });
                                        setResolveConfirmed(false); setIsResolveModalOpen(true); }}
                                    className={
                                        resolveBlock
                                            ? 'h-9! rounded-xl! px-4! text-[13px]! font-medium!'
                                            : 'h-9! rounded-xl! border-0! bg-linear-to-r! from-[#77a1d3]! to-[#79cbca]! px-4! text-[13px]! font-medium! text-white! shadow-none! hover:opacity-90! transition-opacity'
                                    }
                                >
                                    Đánh dấu đã giải quyết
                                </Button>
                            </Tooltip>
                        </>)
                    }
                />
                {caseData.care?.productionPaused && <Alert type="warning" showIcon className="mb-4!" message="Phác đồ nuôi đang tạm hoãn" />}
                {caseData.care?.waitingForTreatmentId && <Alert type="info" showIcon className="mb-4!" message="Đã có phác đồ điều trị tiếp theo được duyệt, đang chờ mốc bắt đầu." />}

                {isResolved && (
                    <Alert
                        showIcon
                        icon={<CheckCircleFilled className="!text-[#0f9b8e] !text-base" />}
                        className="!mb-3.5 !rounded-xl !border-[#bbf0e8] !bg-[#e2f6f3] !text-[#0b7a70] [&_.ant-alert-message]:!font-semibold [&_.ant-alert-message]:!text-[#0b7a70] [&_.ant-alert-description]:!text-[#0b7a70] [&_.ant-alert-description]:!opacity-90 [&_.ant-alert-icon]:!text-[#0f9b8e]"
                        message={`${['SEASON_ENDED', 'SEASON_CANCELLED'].includes(caseData.resolutionReason) ? 'Khép hành chính do đóng vụ' : caseData.resolutionReason === 'EXPERT_CONCLUDED' ? 'Đã khép chuyên môn' : 'Ca đã khép'} · ${fmtDateTime(caseData.resolvedAt || caseData.updatedAt)}`}
                        description={caseData.resolutionSummary || 'Đã kết thúc xử lý.'}
                    />
                )}

                {/* 2-Column Layout */}
                <div className="grid grid-cols-[1fr_360px] gap-3.5 max-[1100px]:grid-cols-1 items-start">
                    {/* Left Column: Tabs Panel */}
                    <Panel pad={false}>
                        <Tabs
                            activeKey={activeTab}
                            onChange={changeTab}
                            className="[&_.ant-tabs-nav]:!px-4 [&_.ant-tabs-nav]:!mb-0"
                            items={tabItems}
                        />
                    </Panel>

                    {/* Right Column (360px): Sidebar Panels */}
                    <div className="flex flex-col gap-3.5">
                        {/* Diagnosis captured when the case was opened */}
                        {(snapshot.aiDiagnosis || caseData.aiDiagnosis) && (() => {
                            const ai = formatAiDiagnosis(snapshot.aiDiagnosis || caseData.aiDiagnosis);
                            if (!ai) return null;
                            return (
                                <Panel
                                    title={
                                        <span>
                                            <RobotOutlined className="mr-1.5 text-[#7b5bd6]" />
                                            Gợi ý AI khi tạo ca
                                        </span>
                                    }
                                >
                                    <div className="flex items-center justify-between mb-1 min-w-0">
                                        <div
                                            className={`font-semibold text-[13px] truncate ${
                                                ai.isRecognized ? 'text-[#0f1c2e]' : 'text-[#64748b]'
                                            }`}
                                        >
                                            {ai.label}
                                        </div>
                                        {!ai.isRecognized && (
                                            <span className="text-[10px] font-medium text-[#d97706] bg-[#fef3c7] px-1.5 py-0.5 rounded shrink-0">
                                                Độ tin cậy thấp
                                            </span>
                                        )}
                                    </div>
                                    {ai.confidence != null && (
                                        <Progress
                                            percent={ai.confidence}
                                            strokeColor={ai.isRecognized ? '#7b5bd6' : '#d97706'}
                                            size="small"
                                        />
                                    )}
                                    <div className="text-[11px] text-[#6a7994] mt-1.5 leading-normal">
                                        {ai.isRecognized
                                            ? 'Chỉ mang tính tham khảo — kết luận thuộc về chuyên gia.'
                                            : 'AI chưa đủ cơ sở nhận diện chắc chắn — kết luận thuộc về chuyên gia.'}
                                    </div>
                                </Panel>
                            );
                        })()}

                        {/* Water and health observations */}
                        <ExpertCaseSnapshot
                            c={caseData}
                            current={caseData.latestMetrics?.water || caseData.latestWaterLog}
                        />

                        {/* Case attachments */}
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

                <Modal open={Boolean(careAction)} title={careConfirm ? 'Xác nhận cho phác đồ nuôi chạy tiếp' : 'Quyết định chăm sóc'}
                    okText={careConfirm ? 'Xác nhận chạy tiếp' : 'Lưu quyết định'} cancelText={careConfirm ? 'Xem lại' : 'Quay lại'}
                    confirmLoading={careBusy} closable={!careBusy} maskClosable={!careBusy} keyboard={!careBusy}
                    cancelButtonProps={{ disabled: careBusy }} okButtonProps={{ disabled: careReason.trim().length < 5
                        || careAction === 'RESUME_PRODUCTION' && !careContext?.production?.canResume }}
                    onCancel={() => careConfirm ? setCareConfirm(false) : setCareAction(null)} onOk={confirmCare}>
                    <label htmlFor="case-care-action" className="block mb-2">Hướng xử lý</label>
                    <Select id="case-care-action" className="w-full mb-3" value={careAction} onChange={value => { setCareAction(value); setCareConfirm(false); }} disabled={careBusy || careConfirm}
                        options={[{ value: 'MONITOR', label: 'Tiếp tục theo dõi, tạm hoãn phác đồ nuôi', disabled: !careContext?.canMonitor },
                            { value: 'RESUME_PRODUCTION', label: 'Cho phép phác đồ nuôi chạy tiếp' }]} />
                    {careAction === 'RESUME_PRODUCTION' && <>
                        <Alert type={careContext?.production?.canResume ? 'info' : 'warning'} showIcon className="mb-3!"
                            message={careContext?.production?.canResume
                                ? `${careContext.production.protocolTitle || 'Phác đồ nuôi'} · v${careContext.production.versionNo || '—'}. Chỉ tiếp tục các cữ tương lai, từ ${fmtDateTime(careContext.production.nextScheduledAt)}. Không làm bù cữ đã hủy.`
                                : careContext?.production?.message || 'Chưa đủ điều kiện chạy tiếp phác đồ nuôi.'}
                            description={careConfirm && <div>Quyết định này kết thúc các tạm hoãn của ca:
                                <ul className="mt-1 mb-0 pl-5 list-disc">{careContext.holds.map(row => <li key={row.id}>{row.reason}</li>)}</ul></div>}
                            action={!careContext?.production?.canResume && <Button disabled={careBusy}
                                onClick={() => navigate(`/expert/seasons/${caseData.season.id}?tab=protocols${['NO_PROTOCOL', 'NO_FUTURE_OCCURRENCE'].includes(careContext?.production?.code) ? '&create=1' : ''}`)}>
                                {['NO_PROTOCOL', 'NO_FUTURE_OCCURRENCE'].includes(careContext?.production?.code) ? 'Tạo phác đồ nuôi' : 'Kiểm tra phác đồ nuôi'}</Button>} />
                    </>}
                    <label htmlFor="case-care-reason" className="block mb-2">Lý do và chỉ dẫn chăm sóc</label>
                    <Input.TextArea id="case-care-reason" value={careReason} disabled={careBusy || careConfirm}
                        onChange={event => setCareReason(event.target.value)} rows={4} maxLength={450} showCount />
                </Modal>
                {/* Clinical resolution confirmation */}
                <ResolveModal
                    open={isResolveModalOpen}
                    resolving={resolving}
                    onClose={() => setIsResolveModalOpen(false)}
                    onConfirm={handleConfirmResolve}
                    summary={resolutionSummary}
                    setSummary={setResolutionSummary}
                    confirmWithoutProduction={resolutionContext?.confirmWithoutProduction}
                    confirmed={resolveConfirmed} onConfirmed={setResolveConfirmed}
                />
            </div>
        </ConfigProvider>
    );
};

/** Require explicit consent when clinical closure also ends a suspension without resuming production. */
function ResolveModal({
    open,
    resolving,
    onClose,
    onConfirm,
    summary,
    setSummary,
    confirmWithoutProduction, confirmed, onConfirmed,
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
                disabled: !summary.trim() || confirmWithoutProduction && !confirmed,
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
                Ca đã đóng không thể mở lại. Nháp cuối chưa gửi sẽ được xóa nếu đủ điều kiện; các kế hoạch chưa áp dụng khác được hủy và giữ lịch sử.
            </p>
            {confirmWithoutProduction && <Alert type="warning" showIcon className="mb-3!"
                message="Không còn lịch nuôi để tiếp tục. Khép ca sẽ kết thúc tạm hoãn của đợt điều trị này, không sinh thêm lịch nuôi."
                description={<Checkbox checked={confirmed} onChange={event => onConfirmed(event.target.checked)}>
                    Tôi xác nhận khép ca và không tiếp tục phác đồ nuôi cũ.</Checkbox>} />}
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
