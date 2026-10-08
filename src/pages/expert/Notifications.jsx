import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, App, Button, Drawer, Empty, Pagination, Select, Spin, Tooltip } from 'antd';
import {
    ArrowRightOutlined,
    BellOutlined,
    ClockCircleOutlined,
    EyeOutlined,
    MailOutlined,
    ReloadOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { notificationAPI } from '../../apis';
import { formatDate } from '../../utils/dateUtils';
import {
    getNotificationDestination,
    NOTIFICATION_CHANGED_EVENT,
} from '../../utils/notificationUtils';
import { formatNotificationTime, getNotificationKind } from '../../utils/notificationView';

const STATUS_OPTIONS = [
    { label: 'Tất cả trạng thái', value: 'all' },
    { label: 'Chưa đọc', value: 'unread' },
    { label: 'Đã đọc', value: 'read' },
];
const TYPE_OPTIONS = [
    { label: 'Tất cả loại thông báo', value: 'all' },
    { label: 'Ca bệnh', value: 'disease' },
    { label: 'Phác đồ', value: 'protocol' },
    { label: 'Vụ nuôi & phân công', value: 'season' },
    { label: 'Hệ thống', value: 'system' },
];
const emptyList = { items: [], totalResults: 0, hasNextPage: false, nextCursor: null };
const iconColorClassNames = {
    blue: 'bg-[#dceefa] text-[#247cc3]',
    rose: 'bg-[#fcecef] text-[#bb4c5e]',
    teal: 'bg-[#e1f5ef] text-[#168677]',
    amber: 'bg-[#fff2d9] text-[#a66a22]',
    violet: 'bg-[#eee9fb] text-[#6950bd]',
    slate: 'bg-[#eef1f6] text-[#64748b]',
};
const labelColorClassNames = {
    blue: 'text-[#1d7ad6]',
    rose: 'text-[#d43b57]',
    teal: 'text-[#0f9185]',
    amber: 'text-[#c6730c]',
    violet: 'text-[#7355d2]',
    slate: 'text-[#64748b]',
};
const selectClassName = `
    [&_.ant-select-selector]:min-h-[38px]! [&_.ant-select-selector]:rounded-[10px]!
    [&_.ant-select-selector]:border-[#dce5ee]! [&_.ant-select-selector]:shadow-none!
    [&_.ant-select-selector]:text-xs! [&_.ant-select-selection-item]:leading-9!
`;
const drawerClassName = `
    [&_.ant-drawer-header]:min-h-[58px] [&_.ant-drawer-header]:border-b-[#e7edf3]
    [&_.ant-drawer-title]:font-['Sora',_'Plus_Jakarta_Sans',_sans-serif]
    [&_.ant-drawer-title]:text-[15px] [&_.ant-drawer-title]:text-[#17243a]
    [&_.ant-drawer-body]:bg-[#fbfdff] [&_.ant-drawer-body]:p-6
`;

const getErrorMessage = (error, fallback) =>
    error?.response?.data?.message ||
    (error?.message?.startsWith('Dữ liệu') ? error.message : fallback);

const Notifications = () => {
    const navigate = useNavigate();
    const { notificationId } = useParams();
    const { message } = App.useApp();
    const [revision, setRevision] = useState(0);
    const [list, setList] = useState(emptyList);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [statusFilter, setStatusFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [unreadCount, setUnreadCount] = useState(0);
    const [markingAll, setMarkingAll] = useState(false);
    const [openingTargetId, setOpeningTargetId] = useState(null);
    const [detailRevision, setDetailRevision] = useState(0);
    const [detailState, setDetailState] = useState({
        id: notificationId || null,
        item: null,
        error: null,
        loading: Boolean(notificationId),
    });
    const requestId = useRef(0);

    const refresh = useCallback(() => {
        setLoading(true);
        setError(null);
        setRevision((value) => value + 1);
    }, []);

    useEffect(() => {
        const currentRequest = ++requestId.current;
        const controller = new AbortController();

        notificationAPI.getNotifications(
            {
                readStatus: statusFilter,
                ...(typeFilter !== 'all' && { group: typeFilter }),
                page,
                limit: pageSize,
            },
            controller.signal,
        )
            .then((result) => {
                if (controller.signal.aborted || currentRequest !== requestId.current) return;
                const lastPage = Math.max(1, Math.ceil(result.totalResults / pageSize));
                if (page > lastPage) {
                    setPage(lastPage);
                    return;
                }
                setList(result);
                setError(null);
            })
            .catch((requestError) => {
                if (!controller.signal.aborted && currentRequest === requestId.current) {
                    setError(getErrorMessage(requestError, 'Không thể tải danh sách thông báo.'));
                }
            })
            .finally(() => {
                if (currentRequest === requestId.current) setLoading(false);
            });

        return () => {
            controller.abort();
            requestId.current += 1;
        };
    }, [page, pageSize, revision, statusFilter, typeFilter]);

    useEffect(() => {
        const controller = new AbortController();
        notificationAPI.getNotifications(
            { readStatus: 'unread', limit: 1 },
            controller.signal,
        )
            .then((result) => {
                if (!controller.signal.aborted) setUnreadCount(result.totalResults);
            })
            .catch(() => {
                // The list request already exposes actionable request errors to the user.
            });
        return () => controller.abort();
    }, [revision]);

    useEffect(() => {
        const refreshSilently = () => setRevision((value) => value + 1);
        window.addEventListener(NOTIFICATION_CHANGED_EVENT, refreshSilently);
        return () => window.removeEventListener(NOTIFICATION_CHANGED_EVENT, refreshSilently);
    }, []);

    useEffect(() => {
        if (!notificationId) return undefined;
        const controller = new AbortController();

        notificationAPI.getNotification(notificationId, controller.signal)
            .then((item) => {
                if (controller.signal.aborted) return;
                setDetailState({ id: notificationId, item, error: null, loading: false });
                setList((previous) => ({
                    ...previous,
                    items: previous.items.map((current) =>
                        current.id === item.id ? { ...current, readAt: item.readAt } : current),
                }));
                setRevision((value) => value + 1);
            })
            .catch((requestError) => {
                if (!controller.signal.aborted) {
                    setDetailState({
                        id: notificationId,
                        item: null,
                        error: getErrorMessage(requestError, 'Không thể tải chi tiết thông báo.'),
                        loading: false,
                    });
                }
            });

        return () => controller.abort();
    }, [notificationId, detailRevision]);

    const selectedDetail = detailState.id === notificationId ? detailState.item : null;
    const detailError = detailState.id === notificationId ? detailState.error : null;
    const detailLoading = Boolean(notificationId) &&
        (detailState.id !== notificationId || detailState.loading);
    const detailKind = selectedDetail ? getNotificationKind(selectedDetail.type) : null;
    const detailDestination = getNotificationDestination(selectedDetail);

    const changeStatusFilter = (value) => {
        setStatusFilter(value);
        setPage(1);
        setLoading(true);
        setError(null);
    };

    const changeTypeFilter = (value) => {
        setTypeFilter(value);
        setPage(1);
        setLoading(true);
        setError(null);
    };

    const changePage = (nextPage, nextPageSize) => {
        setPage(nextPageSize === pageSize ? nextPage : 1);
        setPageSize(nextPageSize);
        setLoading(true);
        setError(null);
    };

    const openDetail = (id) => {
        setDetailState({ id, item: null, error: null, loading: true });
        navigate(`/expert/notifications/${encodeURIComponent(id)}`);
    };

    const closeDetail = () => navigate('/expert/notifications');

    const retryDetail = () => {
        if (!notificationId) return;
        setDetailState({ id: notificationId, item: null, error: null, loading: true });
        setDetailRevision((value) => value + 1);
    };

    const openRelatedPage = async (item) => {
        const destination = getNotificationDestination(item);
        if (!destination?.path || openingTargetId) return;
        setOpeningTargetId(item.id);
        try {
            if (!item.readAt) {
                const detail = await notificationAPI.getNotification(item.id);
                setList((previous) => ({
                    ...previous,
                    items: previous.items.map((current) =>
                        current.id === detail.id ? { ...current, readAt: detail.readAt } : current),
                }));
            }
            navigate(destination.path);
        } catch (requestError) {
            message.error(getErrorMessage(requestError, 'Không thể mở nội dung liên quan.'));
        } finally {
            setOpeningTargetId(null);
        }
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
            setRevision((value) => value + 1);
            message.success(result.updatedCount > 0
                ? 'Đã đánh dấu tất cả thông báo là đã đọc.'
                : 'Không có thông báo chưa đọc.');
        } catch (requestError) {
            message.error(getErrorMessage(requestError, 'Không thể đánh dấu tất cả là đã đọc.'));
        } finally {
            setMarkingAll(false);
        }
    };

    const rangeStart = list.totalResults === 0 ? 0 : (page - 1) * pageSize + 1;
    const rangeEnd = Math.min(page * pageSize, list.totalResults);

    return (
        <div className="w-full p-7 max-[900px]:px-5 max-[900px]:pt-[84px] max-[900px]:pb-6 max-[720px]:px-3">
            <header className="mb-4 flex min-h-[74px] items-start justify-between gap-5 max-[720px]:flex-col max-[720px]:items-stretch max-[720px]:gap-3">
                <div>
                    <h1 className="m-0 font-['Sora',_'Plus_Jakarta_Sans',_sans-serif] text-[23px] leading-[1.4] font-[750] text-[#0f1c2e] max-[720px]:text-xl">
                        Tất cả thông báo
                    </h1>
                    <p className="mt-[3px] mb-0 text-xs leading-[1.6] text-[#6a7994]">
                        Ca bệnh, kết quả duyệt phác đồ và thay đổi phân công vụ nuôi liên quan đến bạn.
                    </p>
                </div>
                <div className="flex items-center gap-[9px] max-[720px]:justify-end">
                    <Tooltip title="Tải lại danh sách">
                        <Button
                            className="min-h-[38px]! border-[#dbe4ed]! bg-[rgba(255,255,255,0.92)]! text-xs! text-[#40546b]! shadow-[0_3px_10px_rgba(15,28,46,0.04)]!"
                            aria-label="Tải lại danh sách thông báo"
                            icon={<ReloadOutlined />}
                            onClick={refresh}
                            loading={loading}
                        />
                    </Tooltip>
                    <Button
                        className="min-h-[38px]! border-[#dbe4ed]! bg-[rgba(255,255,255,0.92)]! text-xs! text-[#40546b]! shadow-[0_3px_10px_rgba(15,28,46,0.04)]!"
                        icon={<MailOutlined />}
                        onClick={markAllAsRead}
                        loading={markingAll}
                        disabled={unreadCount === 0}
                    >
                        <span className="max-[480px]:hidden">Đánh dấu tất cả đã đọc</span>
                    </Button>
                </div>
            </header>

            <section
                className="overflow-hidden rounded-[15px] border border-[#dfe8f0] bg-white shadow-[0_8px_25px_rgba(44,75,104,0.06)]"
                aria-labelledby="notification-list-title"
            >
                <div className="flex min-h-[62px] items-center justify-between gap-4 border-b border-[#e7edf3] px-4 py-2.5 max-[720px]:flex-col max-[720px]:items-stretch max-[720px]:px-3 max-[720px]:py-[13px]">
                    <div className="text-xs text-[#6a7994]">
                        <h2 id="notification-list-title" className="sr-only">Danh sách thông báo</h2>
                        <span>
                            <strong className="font-[750] text-[#1d7ad6]">{unreadCount}</strong>
                            {' '}chưa đọc / {list.totalResults} thông báo
                        </span>
                    </div>
                    <div className="flex items-center gap-2 max-[720px]:w-full max-[480px]:flex-col">
                        <Select
                            className={`w-[190px] max-[1000px]:w-[165px] max-[720px]:w-1/2 max-[480px]:w-full ${selectClassName}`}
                            value={statusFilter}
                            options={STATUS_OPTIONS}
                            popupMatchSelectWidth={220}
                            onChange={changeStatusFilter}
                            aria-label="Lọc theo trạng thái đọc"
                        />
                        <Select
                            className={`w-[205px] max-[1000px]:w-[180px] max-[720px]:w-1/2 max-[480px]:w-full ${selectClassName}`}
                            value={typeFilter}
                            options={TYPE_OPTIONS}
                            popupMatchSelectWidth={230}
                            onChange={changeTypeFilter}
                            aria-label="Lọc theo loại thông báo"
                        />
                    </div>
                </div>

                <div className="min-h-[420px]" aria-live="polite">
                    {loading ? (
                        <div className="grid min-h-[360px] place-items-center"><Spin tip="Đang tải thông báo" /></div>
                    ) : error ? (
                        <div className="p-5">
                            <Alert
                                type="error"
                                showIcon
                                message={error}
                                action={<Button size="small" onClick={refresh}>Thử lại</Button>}
                            />
                        </div>
                    ) : list.items.length === 0 ? (
                        <div className="grid min-h-[360px] place-items-center">
                            <Empty
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                description={statusFilter === 'all' && typeFilter === 'all'
                                    ? 'Chưa có thông báo nào'
                                    : 'Không có thông báo phù hợp bộ lọc'}
                            />
                        </div>
                    ) : (
                        list.items.map((item) => {
                            const kind = getNotificationKind(item.type);
                            const destination = getNotificationDestination(item);
                            return (
                                <article
                                    key={item.id}
                                    className={`relative grid min-h-[66px] grid-cols-[42px_minmax(0,1fr)_118px_76px_9px] items-center gap-[11px] border-b border-[#e5ebf1] px-[15px] py-2.5 transition-colors hover:bg-[#eef7ff] max-[1000px]:grid-cols-[42px_minmax(0,1fr)_96px_70px_9px] max-[720px]:min-h-24 max-[720px]:grid-cols-[38px_minmax(0,1fr)_70px_8px] max-[720px]:grid-rows-[auto_auto] max-[720px]:gap-x-[9px] max-[720px]:gap-y-1.5 max-[720px]:p-3 ${
                                        item.readAt ? 'bg-white' : 'bg-[#f3f9ff]'
                                    }`}
                                >
                                    <span
                                        className={`grid size-9 shrink-0 place-items-center rounded-full text-base max-[720px]:row-[1/3] ${iconColorClassNames[kind.color]}`}
                                        aria-hidden="true"
                                    >
                                        {kind.icon}
                                    </span>
                                    <div className="min-w-0 max-[720px]:col-[2/4]">
                                        <div className="flex min-w-0 items-center gap-2 max-[720px]:flex-col max-[720px]:items-start max-[720px]:gap-0.5">
                                            <h3 className={`m-0 min-w-0 truncate text-[12.5px] leading-[1.45] ${
                                                item.readAt
                                                    ? 'font-[650] text-[#43546b]'
                                                    : 'font-[750] text-[#17243a]'
                                            }`}>
                                                {item.title}
                                            </h3>
                                            <span className={`shrink-0 text-[10px] font-[650] whitespace-nowrap ${labelColorClassNames[kind.color]}`}>
                                                {kind.label}
                                            </span>
                                        </div>
                                        {item.content?.trim() && (
                                            <p className="mt-0.5 mb-0 max-w-full truncate text-[11px] leading-[1.45] text-[#708096]">
                                                {item.content}
                                            </p>
                                        )}
                                    </div>
                                    <time
                                        className="text-right text-[10.5px] whitespace-nowrap text-[#718198] max-[720px]:col-start-2 max-[720px]:text-left"
                                        dateTime={item.createdAt}
                                    >
                                        {formatNotificationTime(item.createdAt)}
                                    </time>
                                    <div className="flex items-center justify-end gap-0.5 max-[720px]:col-start-3 max-[720px]:row-start-2 [&_.ant-btn]:size-8! [&_.ant-btn]:p-0! [&_.ant-btn]:text-[#5f7794]! [&_.ant-btn:hover]:bg-[#e2f0fd]! [&_.ant-btn:hover]:text-[#1d7ad6]! [&_.ant-btn:disabled]:bg-transparent! [&_.ant-btn:disabled]:text-[#bdc7d2]!">
                                        <Tooltip title="Xem chi tiết">
                                            <Button
                                                type="text"
                                                aria-label={`Xem chi tiết: ${item.title}`}
                                                icon={<EyeOutlined />}
                                                onClick={() => openDetail(item.id)}
                                            />
                                        </Tooltip>
                                        <Tooltip title={destination?.path ? destination.label : 'Không có liên kết'}>
                                            <Button
                                                type="text"
                                                aria-label={destination?.path
                                                    ? `${destination.label}: ${item.title}`
                                                    : `Không có liên kết: ${item.title}`}
                                                icon={<ArrowRightOutlined />}
                                                disabled={!destination?.path}
                                                loading={openingTargetId === item.id}
                                                onClick={() => openRelatedPage(item)}
                                            />
                                        </Tooltip>
                                    </div>
                                    {!item.readAt && (
                                        <span
                                            className="size-[7px] rounded-full bg-[#1d7ad6] max-[720px]:col-start-4 max-[720px]:row-start-1"
                                            aria-label="Chưa đọc"
                                        />
                                    )}
                                </article>
                            );
                        })
                    )}
                </div>

                {!loading && !error && list.totalResults > 0 && (
                    <footer className="flex min-h-[66px] items-center justify-end gap-[18px] px-4 py-[11px] max-[720px]:flex-col max-[720px]:items-end max-[720px]:gap-2 [&_.ant-pagination]:m-0 [&_.ant-pagination-item]:rounded-lg [&_.ant-pagination-prev]:rounded-lg [&_.ant-pagination-next]:rounded-lg max-[480px]:[&_.ant-pagination-options]:hidden">
                        <span className="text-[11px] text-[#53647a]">
                            {rangeStart}–{rangeEnd} / {list.totalResults} thông báo
                        </span>
                        <Pagination
                            current={page}
                            pageSize={pageSize}
                            total={list.totalResults}
                            showSizeChanger
                            pageSizeOptions={[10, 20, 50]}
                            locale={{ items_per_page: '/ trang' }}
                            onChange={changePage}
                        />
                    </footer>
                )}
            </section>

            <Drawer
                rootClassName={drawerClassName}
                title="Chi tiết thông báo"
                width={480}
                open={Boolean(notificationId)}
                onClose={closeDetail}
                destroyOnHidden
            >
                {detailLoading ? (
                    <div className="grid min-h-[360px] place-items-center"><Spin tip="Đang tải chi tiết" /></div>
                ) : detailError ? (
                    <Alert
                        type="error"
                        showIcon
                        message={detailError}
                        action={<Button size="small" onClick={retryDetail}>Thử lại</Button>}
                    />
                ) : selectedDetail && (
                    <div>
                        <div className="flex items-center gap-[11px]">
                            <span
                                className={`grid size-9 shrink-0 place-items-center rounded-full text-base ${iconColorClassNames[detailKind.color]}`}
                                aria-hidden="true"
                            >
                                {detailKind.icon}
                            </span>
                            <span className="flex flex-col gap-[3px]">
                                <strong className="text-xs text-[#247cc3]">{detailKind.label}</strong>
                                <time className="text-[11px] text-[#7a899d]" dateTime={selectedDetail.createdAt}>
                                    <ClockCircleOutlined className="mr-[5px]" />
                                    {formatDate(selectedDetail.createdAt, 'HH:mm dd/MM/yyyy')}
                                </time>
                            </span>
                        </div>
                        <h2 className="wrap-anywhere mt-6 mb-3 font-['Sora',_'Plus_Jakarta_Sans',_sans-serif] text-xl leading-[1.45] text-[#17243a]">
                            {selectedDetail.title}
                        </h2>
                        <p className={`wrap-anywhere m-0 min-h-[72px] whitespace-pre-wrap text-[13px] leading-[1.75] ${
                            selectedDetail.content?.trim()
                                ? 'text-[#40546b]'
                                : 'text-[#8592a3] italic'
                        }`}>
                            {selectedDetail.content?.trim() ||
                                'Thông báo này không có nội dung bổ sung.'}
                        </p>
                        <div className="mt-6 border-t border-[#e7edf3] pt-[15px] text-[11px] text-[#708096]">
                            Đã đọc lúc {formatDate(selectedDetail.readAt, 'HH:mm dd/MM/yyyy')}
                        </div>
                        {detailDestination?.path ? (
                            <Button
                                className="mt-7 min-h-[45px]! w-full rounded-[11px]! border-0! bg-[linear-gradient(135deg,#247cc3,#168f82)]! text-[13px]! font-[750]! shadow-[0_9px_18px_rgba(36,124,195,0.18)]!"
                                type="primary"
                                size="large"
                                onClick={() => navigate(detailDestination.path)}
                            >
                                {detailDestination.label} <ArrowRightOutlined />
                            </Button>
                        ) : (
                            <div className="mt-7 rounded-[10px] bg-[#eef3f7] px-3.5 py-3 text-center text-[11px] text-[#7a899d]">
                                <BellOutlined className="mr-1.5" />
                                Thông báo này không có liên kết công việc.
                            </div>
                        )}
                    </div>
                )}
            </Drawer>
        </div>
    );
};

export default Notifications;
