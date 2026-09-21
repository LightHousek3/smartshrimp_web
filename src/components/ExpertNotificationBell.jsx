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
import './expertNotificationBell.css';

const FILTERS = [
    { label: 'Tất cả', value: 'all' },
    { label: 'Chưa đọc', value: 'unread' },
    { label: 'Đã đọc', value: 'read' },
];

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
        className={`notification-status ${readAt ? 'is-read' : 'is-unread'}`}
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
        notificationAPI.getNotifications({ readStatus: 'unread', limit: 1 }, controller.signal)
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
        notificationAPI.getNotifications({ readStatus: filter, limit: 20 }, controller.signal)
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
    }, [open, filter, revision]);

    useEffect(() => {
        if (!open || !selectedId) return undefined;
        const controller = new AbortController();
        notificationAPI.getNotification(selectedId, controller.signal)
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
            <div className="expert-notification-heading">
                <div>
                    <strong>Thông báo</strong>
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
                className="expert-notification-filter"
                block
                options={FILTERS}
                value={filter}
                onChange={changeFilter}
            />
            {realtimeError && (
                <p className="expert-notification-connection">Kết nối trực tiếp bị gián đoạn.</p>
            )}
            <div className="expert-notification-list" aria-live="polite">
                {listLoading ? (
                    <div className="expert-notification-center"><Spin tip="Đang tải" /></div>
                ) : listError ? (
                    <Alert
                        type="error"
                        showIcon
                        message={listError}
                        action={<Button size="small" onClick={refresh}>Thử lại</Button>}
                    />
                ) : list.items.length === 0 ? (
                    <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={filter === 'unread' ? 'Không có thông báo chưa đọc' :
                            filter === 'read' ? 'Chưa có thông báo đã đọc' : 'Chưa có thông báo'}
                    />
                ) : (
                    <>
                        <div className="expert-notification-count">{list.totalResults} thông báo</div>
                        {list.items.map((item) => {
                            const kind = getKind(item.type);
                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    className={`expert-notification-item ${item.readAt ? 'is-read' : 'is-unread'}`}
                                    onClick={() => openDetail(item.id)}
                                    aria-label={`${item.readAt ? 'Đã đọc' : 'Chưa đọc'}, ${item.title}`}
                                >
                                    <span className={`expert-notification-icon is-${kind.color}`}>{kind.icon}</span>
                                    <span className="expert-notification-copy">
                                        <span className="expert-notification-item-top">
                                            <span className="expert-notification-kind">{kind.label}</span>
                                            <span className="expert-notification-time">{formatNotificationTime(item.createdAt)}</span>
                                        </span>
                                        <span className="expert-notification-title">{item.title}</span>
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
            <div className="expert-notification-heading is-detail">
                <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => setSelectedId(null)}>
                    Danh sách
                </Button>
                <strong>Chi tiết thông báo</strong>
            </div>
            <div className="expert-notification-detail" aria-live="polite">
                {detailLoading ? (
                    <div className="expert-notification-center"><Spin tip="Đang tải" /></div>
                ) : detailError ? (
                    <Alert
                        type="error"
                        message={detailError}
                        showIcon
                        action={<Button size="small" onClick={retryDetail}>Thử lại</Button>}
                    />
                ) : detail && (
                    <>
                        <div className="expert-notification-detail-type">
                            <span className={`expert-notification-icon is-${getKind(detail.type).color}`}>
                                {getKind(detail.type).icon}
                            </span>
                            <span>
                                <strong>{getKind(detail.type).label}</strong>
                                <small><ClockCircleOutlined /> {formatDate(detail.createdAt, 'HH:mm dd/MM/yyyy')}</small>
                            </span>
                        </div>
                        <h3>{detail.title}</h3>
                        {detail.content?.trim() && <p className="expert-notification-body">{detail.content}</p>}
                        <div className="expert-notification-read-time">
                            <CheckOutlined /> Đã đọc lúc {formatDate(detail.readAt, 'HH:mm dd/MM/yyyy')}
                        </div>
                    </>
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
            overlayClassName="expert-notification-popover"
        >
            <Badge count={unreadCount} overflowCount={99} size="small">
                <Button
                    className="expert-notification-trigger"
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
