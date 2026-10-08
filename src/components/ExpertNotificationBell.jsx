import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, App, Badge, Button, Empty, Popover, Spin } from 'antd';
import {
    BellOutlined,
    LoadingOutlined,
    RightOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { notificationAPI } from '../apis';
import { getAccessToken, SOCKET_BASE_URL } from '../config';
import { useAuth } from '../contexts/useAuth';
import {
    getNotificationDestination,
    NOTIFICATION_CHANGED_EVENT,
} from '../utils/notificationUtils';
import { formatNotificationTime, getNotificationKind } from '../utils/notificationView';

const emptyList = { items: [], totalResults: 0, hasNextPage: false, nextCursor: null };
const iconColorClassNames = {
    blue: 'bg-[#dceefa] text-[#247cc3]',
    rose: 'bg-[#fcecef] text-[#bb4c5e]',
    teal: 'bg-[#e1f5ef] text-[#168677]',
    amber: 'bg-[#fff2d9] text-[#a66a22]',
    violet: 'bg-[#eee9fb] text-[#6950bd]',
    slate: 'bg-[#eef1f6] text-[#64748b]',
};
const popoverClassName = `
    [&_.ant-popover-inner]:w-[min(400px,calc(100vw-24px))]
    [&_.ant-popover-inner]:max-w-full [&_.ant-popover-inner]:overflow-hidden
    [&_.ant-popover-inner]:rounded-[18px] [&_.ant-popover-inner]:border
    [&_.ant-popover-inner]:border-[#e0eaf3] [&_.ant-popover-inner]:p-0
    [&_.ant-popover-inner]:shadow-[0_18px_48px_rgba(15,28,46,0.2)]
    [&_.ant-popover-inner-content]:p-0
`;

const getErrorMessage = (error, fallback) =>
    error?.response?.data?.message ||
    (error?.message?.startsWith('Dữ liệu') ? error.message : fallback);

const ExpertNotificationBell = ({ onUnreadCountChange }) => {
    const { account } = useAuth();
    const { message } = App.useApp();
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const [revision, setRevision] = useState(0);
    const [unreadCount, setUnreadCount] = useState(0);
    const [list, setList] = useState(emptyList);
    const [listLoading, setListLoading] = useState(true);
    const [listError, setListError] = useState(null);
    const [loadingMore, setLoadingMore] = useState(false);
    const [moreError, setMoreError] = useState(null);
    const [openingId, setOpeningId] = useState(null);
    const [markingAll, setMarkingAll] = useState(false);
    const [realtimeError, setRealtimeError] = useState(false);
    const listRequest = useRef(0);
    const moreAbort = useRef(null);

    const refresh = useCallback(() => setRevision((value) => value + 1), []);

    useEffect(() => {
        if (!account?.id) return undefined;
        const controller = new AbortController();
        notificationAPI.getNotifications({ readStatus: 'unread', limit: 1 }, controller.signal)
            .then((page) => {
                if (controller.signal.aborted) return;
                setUnreadCount(page.totalResults);
                onUnreadCountChange?.(page.totalResults);
            })
            .catch((error) => {
                if (!controller.signal.aborted && error?.response?.status === 401) {
                    setUnreadCount(0);
                    onUnreadCountChange?.(0);
                }
            });
        return () => controller.abort();
    }, [account?.id, onUnreadCountChange, revision]);

    useEffect(() => {
        if (!account?.id) return undefined;
        let disposed = false;
        let retriedAuth = false;
        const socket = io(SOCKET_BASE_URL, {
            transports: ['websocket'],
            auth: (callback) => callback({ token: getAccessToken() }),
        });
        const onEvent = () => {
            refresh();
            window.dispatchEvent(new Event(NOTIFICATION_CHANGED_EVENT));
        };
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
        socket.on('notification:read-all', onEvent);
        return () => {
            disposed = true;
            socket.off('connect', onConnect);
            socket.off('connect_error', onConnectError);
            socket.off('notification:new', onEvent);
            socket.off('notification:read', onEvent);
            socket.off('notification:read-all', onEvent);
            socket.disconnect();
        };
    }, [account?.id, refresh]);

    useEffect(() => {
        if (!open) return undefined;
        const request = ++listRequest.current;
        const controller = new AbortController();
        moreAbort.current?.abort();
        notificationAPI.getNotifications({ readStatus: 'all', limit: 20 }, controller.signal)
            .then((page) => {
                if (request === listRequest.current) {
                    setList(page);
                    setListError(null);
                }
            })
            .catch((error) => {
                if (!controller.signal.aborted && request === listRequest.current) {
                    setListError(getErrorMessage(error, 'Không thể tải thông báo. Vui lòng thử lại.'));
                }
            })
            .finally(() => {
                if (request === listRequest.current) setListLoading(false);
            });
        return () => {
            controller.abort();
            listRequest.current += 1;
        };
    }, [open, revision]);

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
                { readStatus: 'all', limit: 20, cursor: list.nextCursor },
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
        }
    };

    const openNotification = async (item) => {
        if (openingId) return;
        setOpeningId(item.id);
        try {
            const detail = await notificationAPI.getNotification(item.id);
            const destination = getNotificationDestination(detail);
            setOpen(false);
            refresh();
            navigate(destination?.path || `/expert/notifications/${encodeURIComponent(item.id)}`);
        } catch (error) {
            message.error(getErrorMessage(error, 'Không thể mở thông báo. Vui lòng thử lại.'));
        } finally {
            setOpeningId(null);
        }
    };

    const openNotificationPage = () => {
        setOpen(false);
        navigate('/expert/notifications');
    };

    const markAllAsRead = async () => {
        if (markingAll || unreadCount === 0) return;
        setMarkingAll(true);
        try {
            const result = await notificationAPI.markAllAsRead();
            setList((previous) => ({
                ...previous,
                items: previous.items.map((item) =>
                    item.readAt ? item : { ...item, readAt: result.readAt }),
            }));
            setUnreadCount(0);
            onUnreadCountChange?.(0);
            message.success('Đã đánh dấu tất cả thông báo là đã đọc.');
        } catch (error) {
            message.error(getErrorMessage(error, 'Không thể đánh dấu tất cả là đã đọc.'));
        } finally {
            setMarkingAll(false);
        }
    };

    const content = (
        <>
            <div className="flex items-center justify-between gap-3 px-[18px] pt-[18px] pb-3">
                <div className="flex items-baseline gap-1">
                    <strong className="font-['Sora',_'Plus_Jakarta_Sans',_sans-serif] text-base text-[#17243a]">
                        Thông báo
                    </strong>
                    <span className="text-xs text-[#69809a]">· {unreadCount} mới</span>
                </div>
                <Button
                    type="text"
                    className="px-0.5! text-[11px]! font-[650]! text-[#1d7ad6]!"
                    loading={markingAll}
                    disabled={unreadCount === 0}
                    onClick={markAllAsRead}
                >
                    Đọc tất cả
                </Button>
            </div>
            {realtimeError && (
                <p className="mx-[18px] mt-0 mb-[9px] text-[11px] text-[#a46b24]">
                    Kết nối trực tiếp bị gián đoạn.
                </p>
            )}
            <div
                className="max-h-[min(60vh,490px)] overflow-y-auto overscroll-contain px-2.5 pb-3 [&_.ant-alert]:mx-2 [&_.ant-alert]:mt-1 [&_.ant-alert]:mb-2.5"
                aria-live="polite"
            >
                {listLoading ? (
                    <div className="grid min-h-[170px] place-items-center"><Spin tip="Đang tải" /></div>
                ) : listError ? (
                    <Alert
                        type="error"
                        showIcon
                        message={listError}
                        action={<Button size="small" onClick={refresh}>Thử lại</Button>}
                    />
                ) : list.items.length === 0 ? (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có thông báo" />
                ) : (
                    <>
                        {list.items.map((item) => {
                            const kind = getNotificationKind(item.type);
                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    className={`mb-1.5 flex min-h-[76px] w-full cursor-pointer items-start gap-2.5 rounded-xl border p-2.5 text-left transition-colors hover:border-[#a9d1ed] hover:bg-[#eaf5ff] focus-visible:border-[#a9d1ed] focus-visible:bg-[#eaf5ff] disabled:cursor-wait disabled:opacity-[0.72] ${
                                        item.readAt
                                            ? 'border-transparent bg-white'
                                            : 'border-[#d5e7f5] bg-[#f1f8ff]'
                                    }`}
                                    onClick={() => openNotification(item)}
                                    disabled={Boolean(openingId)}
                                    aria-label={`${item.readAt ? 'Đã đọc' : 'Chưa đọc'}, ${item.title}`}
                                >
                                    <span className={`grid size-[34px] shrink-0 place-items-center rounded-full text-base ${iconColorClassNames[kind.color]}`}>
                                        {kind.icon}
                                    </span>
                                    <span className="flex min-w-0 flex-1 flex-col gap-[5px]">
                                        <span className={`wrap-anywhere text-[12.5px] leading-[1.35] ${
                                            item.readAt
                                                ? 'font-[550] text-[#52647d]'
                                                : 'font-[750] text-[#17243a]'
                                        }`}>
                                            {item.title}
                                        </span>
                                        {item.content?.trim() && (
                                            <span className="max-w-full truncate text-[10.5px] leading-[1.4] text-[#708096]">
                                                {item.content}
                                            </span>
                                        )}
                                        <span className="text-[10px] text-[#7a899d]">
                                            {formatNotificationTime(item.createdAt)}
                                        </span>
                                    </span>
                                    {openingId === item.id ? (
                                        <LoadingOutlined className="mt-[3px] w-[13px] shrink-0 text-[#1d7ad6]" spin />
                                    ) : !item.readAt ? (
                                        <span className="mt-[5px] size-[7px] shrink-0 rounded-full bg-[#1d7ad6]" aria-label="Chưa đọc" />
                                    ) : null}
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
            <Button
                className="h-[43px]! rounded-none! border-x-0! border-b-0! border-t! border-[#e5e8f0]! text-xs! font-bold! text-[#247cc3]!"
                type="text"
                block
                onClick={openNotificationPage}
            >
                Xem tất cả thông báo <RightOutlined />
            </Button>
        </>
    );

    return (
        <Popover
            trigger="click"
            placement="bottomRight"
            open={open}
            onOpenChange={changeOpen}
            content={content}
            overlayClassName={popoverClassName}
        >
            <Badge count={unreadCount} overflowCount={99} size="small">
                <Button
                    className="expert-notification-trigger size-11! rounded-[13px]! border! border-[rgba(119,161,211,0.32)]! bg-[rgba(255,255,255,0.84)]! text-[21px]! text-[#247cc3]! shadow-[0_6px_18px_rgba(42,60,84,0.1)]! hover:bg-white! hover:text-[#0f62b4]! focus-visible:bg-white! focus-visible:text-[#0f62b4]!"
                    type="text"
                    icon={<BellOutlined />}
                    aria-label={unreadCount > 0 ? `Thông báo, ${unreadCount} chưa đọc` : 'Thông báo'}
                    aria-expanded={open}
                />
            </Badge>
        </Popover>
    );
};

export default ExpertNotificationBell;
