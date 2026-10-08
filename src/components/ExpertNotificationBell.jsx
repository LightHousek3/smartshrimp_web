import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Badge, Button, Empty, Popover, Segmented, Spin } from 'antd';
import {
    ArrowLeftOutlined,
    BellOutlined,
    CalendarOutlined,
    CheckOutlined,
    ClockCircleOutlined,
    ExclamationOutlined,
    ExperimentOutlined,
    MedicineBoxOutlined,
    ProfileOutlined,
    ReloadOutlined,
    SafetyOutlined,
} from '@ant-design/icons';
import { io } from 'socket.io-client';
import { notificationAPI } from '../apis';
import { getAccessToken, SOCKET_BASE_URL } from '../config';
import { useAuth } from '../contexts/useAuth';
import { formatDate } from '../utils/dateUtils';

const FILTERS = [
    { label: 'Tất cả', value: 'all' },
    { label: 'Chưa đọc', value: 'unread' },
    { label: 'Đã đọc', value: 'read' },
];

// The popup is portaled; semantic body classes style it independently of the page layout.
const popoverClassNames = {
    body: [
        'w-[min(400px,calc(100vw-24px))]! max-w-full! p-0! overflow-hidden!',
        'border! border-[#e0eaf3]! rounded-[18px]!',
        'shadow-[0_18px_48px_rgba(15,28,46,0.2)]!',
        '[&_.ant-popover-inner-content]:p-0!',
    ].join(' '),
};
const headingClassName =
    'flex items-center gap-3 px-4.5 pt-4.5 pb-3 [&_span]:text-[12px]! [&_span]:text-[#69809a]!';
const headingTitleClassName =
    "font-['Sora','Plus_Jakarta_Sans',sans-serif] text-[#17243a]";
const scrollClassName = 'max-h-[min(60vh,490px)] overflow-y-auto overscroll-contain';
const loadingClassName = 'grid min-h-42.5 place-items-center';
const iconClassName =
    'grid size-8.5 shrink-0 basis-8.5 place-items-center rounded-[10px] text-[16px]';
const iconTone = {
    blue: 'text-[#247cc3] bg-[#dceefa]',
    rose: 'text-[#bb4c5e] bg-[#fcecef]',
    teal: 'text-[#168677] bg-[#e1f5ef]',
    amber: 'text-[#a66a22] bg-[#fff2d9]',
};
const itemClassName = [
    'mb-1.5 flex min-h-19 w-full cursor-pointer items-start gap-2.5 rounded-xl border p-2.5 text-left',
    'hover:border-[#a9d1ed] hover:bg-[#eaf5ff]',
    'focus-visible:border-[#a9d1ed] focus-visible:bg-[#eaf5ff]',
].join(' ');

const emptyList = { items: [], totalResults: 0, hasNextPage: false, nextCursor: null };

const getErrorMessage = (error, fallback) =>
    error?.response?.data?.message ||
    (error?.message?.startsWith('Dữ liệu') ? error.message : fallback);

const getKind = (type = '') => {
    if (type.startsWith('TASK_')) {
        return { label: 'Nhiệm vụ', icon: <ProfileOutlined />, color: 'blue' };
    }
    if (type.startsWith('DISEASE_') || type.startsWith('EMERGENCY_')) {
        return { label: 'Sức khỏe ao nuôi', icon: <SafetyOutlined />, color: 'rose' };
    }
    if (type.startsWith('TREATMENT_')) {
        return { label: 'Phác đồ điều trị', icon: <MedicineBoxOutlined />, color: 'teal' };
    }
    if (type.startsWith('PRODUCTION_')) {
        return { label: 'Quy trình sản xuất', icon: <ProfileOutlined />, color: 'teal' };
    }
    if (type.startsWith('SEASON_') || type === 'HARVEST_DUE') {
        return { label: 'Vụ nuôi', icon: <ExperimentOutlined />, color: 'teal' };
    }
    if (type.startsWith('OPERATION_') || type.startsWith('SCHEDULE_')) {
        return { label: 'Lịch vận hành', icon: <CalendarOutlined />, color: 'amber' };
    }
    return { label: 'Hệ thống', icon: <BellOutlined />, color: 'blue' };
};

const formatNotificationTime = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
    if (minutes >= 0 && minutes < 1) return 'Vừa xong';
    if (minutes >= 1 && minutes < 60) return `${minutes} phút trước`;
    if (minutes >= 60 && minutes < 1440) return `${Math.floor(minutes / 60)} giờ trước`;
    return formatDate(value, 'HH:mm dd/MM/yyyy');
};

const NotificationStatus = ({ readAt }) => (
    <span
        className={`grid h-4.5 w-3.75 shrink-0 basis-3.75 place-items-center text-[12px] ${readAt ? 'text-[#159168]' : 'text-[#e5a32d]'}`}
        title={readAt ? 'Đã đọc' : 'Chưa đọc'}
        aria-label={readAt ? 'Đã đọc' : 'Chưa đọc'}
    >
        {readAt ? <CheckOutlined /> : <ExclamationOutlined />}
    </span>
);

const ExpertNotificationBell = () => {
    const { account } = useAuth();
    const [open, setOpen] = useState(false);
    const [filter, setFilter] = useState('all');
    const [revision, setRevision] = useState(0);
    const [unreadCount, setUnreadCount] = useState(0);
    const [list, setList] = useState(emptyList);
    const [listLoading, setListLoading] = useState(true);
    const [listError, setListError] = useState(null);
    const [loadingMore, setLoadingMore] = useState(false);
    const [moreError, setMoreError] = useState(null);
    const [selectedId, setSelectedId] = useState(null);
    const [detail, setDetail] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState(null);
    const [detailRevision, setDetailRevision] = useState(0);
    const [realtimeError, setRealtimeError] = useState(false);
    const listRequest = useRef(0);
    const moreAbort = useRef(null);

    const refresh = useCallback(() => setRevision((value) => value + 1), []);

    useEffect(() => {
        if (!account?.id) return undefined;
        const controller = new AbortController();
        notificationAPI
            .getNotifications({ readStatus: 'unread', limit: 1 }, controller.signal)
            .then((page) => setUnreadCount(page.totalResults))
            .catch((error) => {
                if (!controller.signal.aborted && error?.response?.status === 401) {
                    setUnreadCount(0);
                }
            });
        return () => controller.abort();
    }, [account?.id, revision]);

    useEffect(() => {
        if (!account?.id) return undefined;
        let disposed = false;
        let retriedAuth = false;
        const socket = io(SOCKET_BASE_URL, {
            transports: ['websocket'],
            auth: (callback) => callback({ token: getAccessToken() }),
        });
        const onEvent = () => refresh();
        const onConnect = () => {
            retriedAuth = false;
            setRealtimeError(false);
            refresh();
        };
        const onConnectError = async (error) => {
            setRealtimeError(true);
            if (error.message !== 'Unauthorized' || retriedAuth) return;
            retriedAuth = true;
            try {
                // An HTTP request refreshes an expired access token through apiClient.
                await notificationAPI.getNotifications({ readStatus: 'unread', limit: 1 });
                if (!disposed) socket.connect();
            } catch {
                // The authenticated HTTP flow handles an invalid session.
            }
        };
        socket.on('connect', onConnect);
        socket.on('connect_error', onConnectError);
        socket.on('notification:new', onEvent);
        socket.on('notification:read', onEvent);
        return () => {
            disposed = true;
            socket.off('connect', onConnect);
            socket.off('connect_error', onConnectError);
            socket.off('notification:new', onEvent);
            socket.off('notification:read', onEvent);
            socket.disconnect();
        };
    }, [account?.id, refresh]);

    useEffect(() => {
        if (!open) return undefined;
        const request = ++listRequest.current;
        const controller = new AbortController();
        moreAbort.current?.abort();
        notificationAPI
            .getNotifications({ readStatus: filter, limit: 20 }, controller.signal)
            .then((page) => {
                if (request === listRequest.current) {
                    setList(page);
                    setListError(null);
                }
            })
            .catch((error) => {
                if (!controller.signal.aborted && request === listRequest.current) {
                    setListError(
                        getErrorMessage(error, 'Không thể tải thông báo. Vui lòng thử lại.'),
                    );
                }
            })
            .finally(() => {
                if (request === listRequest.current) setListLoading(false);
            });
        return () => {
            controller.abort();
            listRequest.current += 1;
        };
    }, [open, filter, revision]);

    useEffect(() => {
        if (!open || !selectedId) return undefined;
        const controller = new AbortController();
        notificationAPI
            .getNotification(selectedId, controller.signal)
            .then((item) => {
                if (controller.signal.aborted) return;
                setDetail(item);
                refresh();
            })
            .catch((error) => {
                if (!controller.signal.aborted) {
                    setDetailError(getErrorMessage(error, 'Không thể tải chi tiết thông báo.'));
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) setDetailLoading(false);
            });
        return () => controller.abort();
    }, [open, selectedId, detailRevision, refresh]);

    useEffect(() => () => moreAbort.current?.abort(), []);

    const loadMore = async () => {
        if (loadingMore || !list.hasNextPage || !list.nextCursor) return;
        const request = listRequest.current;
        const controller = new AbortController();
        moreAbort.current = controller;
        setLoadingMore(true);
        setMoreError(null);
        try {
            const page = await notificationAPI.getNotifications(
                { readStatus: filter, limit: 20, cursor: list.nextCursor },
                controller.signal,
            );
            if (controller.signal.aborted || request !== listRequest.current) return;
            setList((previous) => {
                const known = new Set(previous.items.map((item) => item.id));
                return {
                    ...page,
                    items: [...previous.items, ...page.items.filter((item) => !known.has(item.id))],
                };
            });
        } catch (error) {
            if (!controller.signal.aborted && request === listRequest.current) {
                setMoreError(getErrorMessage(error, 'Không thể tải thêm thông báo.'));
            }
        } finally {
            if (request === listRequest.current) setLoadingMore(false);
        }
    };

    const changeOpen = (nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) {
            setListLoading(true);
            setListError(null);
            setMoreError(null);
        } else {
            setSelectedId(null);
            setDetail(null);
        }
    };

    const changeFilter = (nextFilter) => {
        setFilter(nextFilter);
        setListLoading(true);
        setListError(null);
        setMoreError(null);
        setLoadingMore(false);
    };

    const openDetail = (id) => {
        setSelectedId(id);
        setDetail(null);
        setDetailError(null);
        setDetailLoading(true);
    };

    const retryDetail = () => {
        setDetailLoading(true);
        setDetailError(null);
        setDetailRevision((value) => value + 1);
    };

    const renderList = () => (
        <>
            <div className={`${headingClassName} justify-between`}>
                <div className="flex flex-col gap-0.5">
                    <strong className={`${headingTitleClassName} text-[16px]`}>Thông báo</strong>
                    <span>Cập nhật dành cho chuyên gia</span>
                </div>
                <Button
                    type="text"
                    icon={<ReloadOutlined />}
                    aria-label="Làm mới thông báo"
                    onClick={refresh}
                />
            </div>
            <Segmented
                className="mx-4.5! mt-0! mb-3! w-[calc(100%-36px)]! rounded-[11px]! bg-[#edf4f9]! p-1! text-[12px]! font-[650]!"
                block
                options={FILTERS}
                value={filter}
                onChange={changeFilter}
            />
            {realtimeError && (
                <p className="mx-4.5 mt-0 mb-2.25 text-[11px] text-[#a46b24]">Kết nối trực tiếp bị gián đoạn.</p>
            )}
            <div className={`${scrollClassName} px-2.5 pt-0 pb-3 [&_.ant-alert]:mx-2! [&_.ant-alert]:mt-1! [&_.ant-alert]:mb-2.5!`} aria-live="polite">
                {listLoading ? (
                    <div className={loadingClassName}>
                        <Spin tip="Đang tải" />
                    </div>
                ) : listError ? (
                    <Alert
                        type="error"
                        showIcon
                        message={listError}
                        action={
                            <Button size="small" onClick={refresh}>
                                Thử lại
                            </Button>
                        }
                    />
                ) : list.items.length === 0 ? (
                    <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={
                            filter === 'unread'
                                ? 'Không có thông báo chưa đọc'
                                : filter === 'read'
                                  ? 'Chưa có thông báo đã đọc'
                                  : 'Chưa có thông báo'
                        }
                    />
                ) : (
                    <>
                        <div className="px-2.25 pt-0 pb-2 text-[11px] font-[650] text-[#69809a]">
                            {list.totalResults} thông báo
                        </div>
                        {list.items.map((item) => {
                            const kind = getKind(item.type);
                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    className={`${itemClassName} ${item.readAt ? 'border-transparent bg-white' : 'border-[#d5e7f5] bg-[#f1f8ff]'}`}
                                    onClick={() => openDetail(item.id)}
                                    aria-label={`${item.readAt ? 'Đã đọc' : 'Chưa đọc'}, ${item.title}`}
                                >
                                    <span className={`${iconClassName} ${iconTone[kind.color]}`}>
                                        {kind.icon}
                                    </span>
                                    <span className="flex min-w-0 flex-1 flex-col gap-1.25">
                                        <span className="flex items-baseline justify-between gap-2">
                                            <span className="text-[11px] font-[750] text-[#247cc3]">
                                                {kind.label}
                                            </span>
                                            <span className="flex-none text-[10px] text-[#7a899d]">
                                                {formatNotificationTime(item.createdAt)}
                                            </span>
                                        </span>
                                        <span className={`text-[12.5px] leading-[1.35] wrap-anywhere ${item.readAt ? 'font-[550] text-[#52647d]' : 'font-[750] text-[#17243a]'}`}>
                                            {item.title}
                                        </span>
                                    </span>
                                    <NotificationStatus readAt={item.readAt} />
                                </button>
                            );
                        })}
                        {moreError && <Alert type="error" message={moreError} showIcon />}
                        {list.hasNextPage && (
                            <Button block type="link" loading={loadingMore} onClick={loadMore}>
                                Xem thêm
                            </Button>
                        )}
                    </>
                )}
            </div>
        </>
    );

    const renderDetail = () => (
        <>
            <div className={`${headingClassName} justify-start border-b border-[#e5e8f0]`}>
                <Button
                    type="text"
                    icon={<ArrowLeftOutlined />}
                    className="pl-0! text-[12px]! text-[#247cc3]!"
                    onClick={() => setSelectedId(null)}
                >
                    Danh sách
                </Button>
                <strong className={`${headingTitleClassName} text-[14px]`}>Chi tiết thông báo</strong>
            </div>
            <div className={`${scrollClassName} p-4.5`} aria-live="polite">
                {detailLoading ? (
                    <div className={loadingClassName}>
                        <Spin tip="Đang tải" />
                    </div>
                ) : detailError ? (
                    <Alert
                        type="error"
                        message={detailError}
                        showIcon
                        action={
                            <Button size="small" onClick={retryDetail}>
                                Thử lại
                            </Button>
                        }
                    />
                ) : (
                    detail && (
                        <>
                            <div className="flex items-center gap-2.5">
                                <span
                                    className={`${iconClassName} ${iconTone[getKind(detail.type).color]}`}
                                >
                                    {getKind(detail.type).icon}
                                </span>
                                <span className="flex flex-col gap-0.5">
                                    <strong className="text-[12px] text-[#247cc3]">
                                        {getKind(detail.type).label}
                                    </strong>
                                    <small className="text-[11px] text-[#7a899d]">
                                        <ClockCircleOutlined />{' '}
                                        {formatDate(detail.createdAt, 'HH:mm dd/MM/yyyy')}
                                    </small>
                                </span>
                            </div>
                            <h3 className="mt-4.5 mr-0 mb-2.5 ml-0 font-['Sora','Plus_Jakarta_Sans',sans-serif] text-[17px] leading-[1.4] wrap-anywhere text-[#17243a]">
                                {detail.title}
                            </h3>
                            {detail.content?.trim() && (
                                <p className="m-0 text-[13px] leading-[1.6] whitespace-pre-wrap wrap-anywhere text-[#40546b]">{detail.content}</p>
                            )}
                            <div className="mt-5 border-t border-[#e5e8f0] pt-3 text-[11px] font-[650] text-[#159168]">
                                <CheckOutlined /> Đã đọc lúc{' '}
                                {formatDate(detail.readAt, 'HH:mm dd/MM/yyyy')}
                            </div>
                        </>
                    )
                )}
            </div>
        </>
    );

    return (
        <Popover
            trigger="click"
            placement="bottomRight"
            open={open}
            onOpenChange={changeOpen}
            content={selectedId ? renderDetail() : renderList()}
            classNames={popoverClassNames}
        >
            <Badge count={unreadCount} overflowCount={99} size="small">
                <Button
                    className="size-9! min-w-9! rounded-full! border! border-[#e5e8f0]! bg-white/80! text-[13px]! text-[#6a7994]! shadow-[0_2px_0_rgba(15,28,46,0.02)]! hover:bg-white! hover:text-[#0f62b4]! focus-visible:bg-white! focus-visible:text-[#0f62b4]!"
                    type="text"
                    icon={<BellOutlined />}
                    aria-label={
                        unreadCount > 0 ? `Thông báo, ${unreadCount} chưa đọc` : 'Thông báo'
                    }
                    aria-expanded={open}
                />
            </Badge>
        </Popover>
    );
};

export default ExpertNotificationBell;
