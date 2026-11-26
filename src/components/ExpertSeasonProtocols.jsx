import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, App, Button, Card, Empty, Flex, Modal, Pagination, Space, Tag, Tooltip, Typography } from 'antd';
import { DeleteOutlined, EditOutlined, EyeOutlined, PlusOutlined, SendOutlined } from '@ant-design/icons';
import { expertProductionProtocolAPI as api, expertSeasonAPI } from '../apis';
import Loading from './Loading';
import { PROTOCOL_PRIMARY_BUTTON, PROTOCOL_STATUS_COLORS, PROTOCOL_STATUS_LABELS, protocolError } from '../constants/productionProtocol';
import ExpertProductionProtocolDetail from '../pages/expert/ExpertProductionProtocolDetail';
import ExpertProductionProtocolForm from './ExpertProductionProtocolForm';
import { expertStyle as styles } from '../constants/expertStyle';
import ErrorState from '../components/ErrorState';

const dateText = (value) => {
    if (!value) return '—';
    const date = new Date(value);
    const timeZone = 'Asia/Ho_Chi_Minh';
    return `${date.toLocaleTimeString('vi-VN', { timeZone, hour: '2-digit', minute: '2-digit' })} ${date.toLocaleDateString('vi-VN', { timeZone, day: '2-digit', month: '2-digit' }).replace('/', '-')}`;
};
/** Load and manage production protocols only when this tab is opened. */
const ExpertSeasonProtocols = ({ seasonId }) => {
    const [searchParams, setSearchParams] = useSearchParams();
    const { message } = App.useApp();
    const [page, setPage] = useState(1);
    const [revision, setRevision] = useState(0);
    const [state, setState] = useState({ key: null });
    const [dialog, setDialog] = useState(() => searchParams.get('create') === '1' ? { mode: 'create' } : null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteBusy, setDeleteBusy] = useState(false);
    const [deleteError, setDeleteError] = useState(null);
    const [submitTarget, setSubmitTarget] = useState(null);
    const [submitBusy, setSubmitBusy] = useState(false);
    const [submitError, setSubmitError] = useState(null);
    const dialogRequest = useRef(null);
    const deletePending = useRef(false);
    const submitPending = useRef(false);
    const alive = useRef(true);
    const key = `${seasonId}:${page}:${revision}`;
    useEffect(() => {
        if (searchParams.get('create') !== '1') return;
        setSearchParams(previous => { const next = new URLSearchParams(previous); next.delete('create'); return next; }, { replace: true });
    }, [searchParams, setSearchParams]);
    useEffect(() => {
        alive.current = true;
        return () => { alive.current = false; dialogRequest.current?.abort(); };
    }, [seasonId]);
    useEffect(() => {
        const controller = new AbortController();
        Promise.all([expertSeasonAPI.getSeason(seasonId, controller.signal), api.list(seasonId, { page, limit: 20 }, controller.signal)])
            .then(([seasonResponse, listResponse]) => { if (!controller.signal.aborted) setState({ key,
                season: seasonResponse.data.data, rows: listResponse.data.data, meta: listResponse.data.meta }); })
            .catch((error) => { if (!controller.signal.aborted) setState({ key, error: protocolError(error) }); });
        return () => controller.abort();
    }, [seasonId, page, revision, key]);
    const refresh = () => setRevision((value) => value + 1);
    /** Open details immediately and ignore cancelled requests when the selected version changes. */
    const openDialog = async (protocolId, mode = 'view') => {
        dialogRequest.current?.abort();
        if (!protocolId) { setDialog({ mode: 'create' }); return; }
        const controller = new AbortController();
        dialogRequest.current = controller;
        setDialog({ mode, protocolId, loading: true });
        try {
            const response = await api.detail(seasonId, protocolId, controller.signal);
            if (controller.signal.aborted) return;
            if (mode === 'edit' && !response.data.data.availableActions.update) {
                setDialog({ mode: 'view', protocolId, detail: response.data.data });
                message.info('Phác đồ hiện chỉ hỗ trợ xem.');
            } else setDialog({ mode, protocolId, detail: response.data.data });
        } catch (error) { if (!controller.signal.aborted) setDialog({ mode, protocolId, error: protocolError(error) }); }
    };
    const closeDialog = () => { dialogRequest.current?.abort(); setDialog(null); };
    const confirmDelete = row => { setDeleteError(null); setDeleteTarget(row); };
    /** Delete the confirmed draft revision and close details before refreshing the version list. */
    const removeDraft = async () => {
        if (deletePending.current) return;
        deletePending.current = true;
        setDeleteBusy(true); setDeleteError(null);
        try {
            await api.remove(seasonId, deleteTarget.id, { revision: deleteTarget.revision });
            if (!alive.current) return;
            if (dialog?.detail?.id === deleteTarget.id) closeDialog();
            if (state.rows.length === 1 && page > 1) setPage(value => value - 1);
            setDeleteTarget(null); message.success('Đã xóa bản nháp.'); refresh();
        } catch (error) {
            if (alive.current) {
                setDeleteError(`${protocolError(error)}${error.response?.status === 409 ? ' Đóng hộp thoại và mở lại từ danh sách mới nhất để kiểm tra trạng thái.' : ''}`);
                if (error.response?.status === 409) refresh();
            }
        } finally { deletePending.current = false; if (alive.current) setDeleteBusy(false); }
    };
    /** Submit the displayed revision and refresh the list without accepting duplicate clicks. */
    const submit = async () => {
        if (submitPending.current) return;
        submitPending.current = true; setSubmitBusy(true); setSubmitError(null);
        try {
            const response = await api.submit(seasonId, submitTarget.id, { revision: submitTarget.revision });
            if (!alive.current) return;
            setSubmitTarget(null); message.success(response.data.message);
            if (dialog?.detail?.id === submitTarget.id) setDialog({ mode: 'view', detail: response.data.data });
            refresh();
        } catch (error) {
            if (alive.current) {
                if (error.response?.status === 409) {
                    setSubmitTarget(null);
                    closeDialog();
                    refresh();
                    message.warning('Phác đồ đã thay đổi hoặc không còn đủ điều kiện gửi duyệt. Vui lòng kiểm tra dữ liệu mới và xác nhận lại từ danh sách.');
                } else setSubmitError(protocolError(error));
            }
        } finally { submitPending.current = false; if (alive.current) setSubmitBusy(false); }
    };
    const confirmSubmit = (row) => { setSubmitError(null); setSubmitTarget(row); };
    if (state.key !== key) return <Loading tip="Đang tải phác đồ nuôi" />;
    if (state.error) return <ErrorState message={state.error} onRetry={refresh} />;
    const { season, rows, meta } = state;
    const readOnly = ['COMPLETED', 'CANCELLED'].includes(season.status);
    return <>
        <Card className={`${styles.panel} rounded-[14px]! border-[#e5e8f0]! shadow-[0_1px_1px_rgba(15,28,46,0.04)]!`}>
            <Flex justify="space-between" align="center" gap={12} wrap className="mb-3!">
                <Typography.Text type="secondary" className="text-xs!">{season.approvedProductionProtocol
                    ? `Đang áp dụng v${season.approvedProductionProtocol.versionNo} · duyệt ${dateText(season.approvedProductionProtocol.reviewedAt)}`
                    : 'Chưa có phác đồ nuôi được duyệt'}</Typography.Text>
                {!readOnly && <Tooltip title={!season.availableActions.create ? 'Vụ chưa đủ điều kiện hoặc đã có phác đồ đang xử lý.' : undefined}>
                    <Button type="primary" className={season.availableActions.create ? PROTOCOL_PRIMARY_BUTTON : ''} icon={<PlusOutlined />} disabled={!season.availableActions.create} onClick={() => openDialog(null)}>Tạo phác đồ nuôi</Button>
                </Tooltip>}
            </Flex>
            {readOnly && <Alert type="info" className="mb-3!" message="Vụ nuôi đã kết thúc — chỉ xem lịch sử phác đồ." />}
            {!rows.length && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có phác đồ nuôi" />}
            <Flex vertical gap={10}>{rows.map((row) => <div key={row.id} className={styles.version}>
                <div className={styles.versionNumber}>v{row.versionNo}</div>
                <div className="min-w-0 flex-1">
                    <Space wrap><Typography.Text strong className="text-[13px]!">{row.title}</Typography.Text><Tag className={styles.pill} color={PROTOCOL_STATUS_COLORS[row.status]}>{PROTOCOL_STATUS_LABELS[row.status]}</Tag></Space>
                    <Typography.Paragraph type="secondary" className="mb-0! mt-0.5! text-[11.5px]!">{row.stageCount} giai đoạn · {row.itemCount} hạng mục · {row.submittedAt ? 'gửi' : 'sửa'} {dateText(row.submittedAt || row.updatedAt)}{row.rejectionReason && ` · ${row.rejectionReason}`}</Typography.Paragraph>
                </div>
                <Space size={2} className={styles.actions}>
                    <Tooltip title="Xem phác đồ"><Button type="text" shape="circle" aria-label={`Xem phiên bản ${row.versionNo}`} icon={<EyeOutlined />} onClick={() => openDialog(row.id)} /></Tooltip>
                    {row.availableActions.update && <Tooltip title="Chỉnh sửa"><Button type="text" shape="circle" aria-label={`Sửa phiên bản ${row.versionNo}`} icon={<EditOutlined />} onClick={() => openDialog(row.id, 'edit')} /></Tooltip>}
                    {row.availableActions.submit && <Tooltip title="Gửi duyệt"><Button type="text" shape="circle" aria-label={`Gửi duyệt phiên bản ${row.versionNo}`} icon={<SendOutlined />} onClick={() => confirmSubmit(row)} /></Tooltip>}
                    {row.availableActions.delete && <Tooltip title="Xóa nháp"><Button type="text" shape="circle" danger aria-label={`Xóa nháp phiên bản ${row.versionNo}`} icon={<DeleteOutlined />} onClick={() => confirmDelete(row)} /></Tooltip>}
                </Space>
            </div>)}</Flex>
            {meta.totalResults > 20 && <Pagination className="mt-4!" current={page} total={meta.totalResults} pageSize={20} showSizeChanger={false} onChange={setPage} />}
        </Card>
        {dialog && (dialog.loading || dialog.error || dialog.mode === 'view') && <ExpertProductionProtocolDetail
            detail={dialog.detail} loading={dialog.loading} error={dialog.error}
            onRetry={() => openDialog(dialog.protocolId, dialog.mode)} onClose={closeDialog}
            onRefresh={() => openDialog(dialog.detail.id, 'view')}
            onEdit={() => openDialog(dialog.detail.id, 'edit')} onDelete={() => confirmDelete(dialog.detail)}
            onSubmit={() => confirmSubmit(dialog.detail)} submitBusy={submitBusy || deleteBusy} />}
        {dialog && !dialog.loading && !dialog.error && dialog.mode !== 'view' && !readOnly
            && (dialog.mode !== 'create' || season.availableActions.create) && <ExpertProductionProtocolForm
            key={`${seasonId}:${dialog.detail?.id || 'new'}:${dialog.detail?.revision || 0}`} seasonId={seasonId} season={season}
            detail={dialog.detail} onClose={closeDialog} onSaved={() => { closeDialog(); refresh(); }}
            onReload={(id) => { closeDialog(); refresh(); if (id) openDialog(id, 'edit'); }} />}
        <Modal open={Boolean(deleteTarget)} title="Xóa bản nháp phác đồ nuôi?" okText="Xóa nháp" cancelText="Quay lại" okButtonProps={{ danger: true }}
            confirmLoading={deleteBusy} closable={!deleteBusy} maskClosable={!deleteBusy} keyboard={!deleteBusy}
            onCancel={() => { if (!deleteBusy) setDeleteTarget(null); }} onOk={removeDraft}>
            <Typography.Paragraph>{deleteTarget?.title} — v{deleteTarget?.versionNo}. Bản nháp chưa gửi sẽ bị xóa; lần tạo tiếp theo có thể dùng lại số phiên bản này.</Typography.Paragraph>
            {deleteError && <Alert type="error" message={deleteError} className="mb-3!" />}
        </Modal>
        <Modal open={Boolean(submitTarget)} title="Gửi phác đồ cho chủ trại duyệt?" okText="Gửi duyệt" cancelText="Quay lại" confirmLoading={submitBusy}
            okButtonProps={{ className: PROTOCOL_PRIMARY_BUTTON }} closable={!submitBusy} maskClosable={!submitBusy} keyboard={!submitBusy}
            onCancel={() => { if (!submitBusy) setSubmitTarget(null); }} onOk={submit}>
            <Typography.Paragraph>{submitTarget?.title} · v{submitTarget?.versionNo}. Bạn có thể chỉnh sửa lại nếu chủ trại từ chối.</Typography.Paragraph>
            {submitError && <Alert type="error" message={submitError} />}
        </Modal>
    </>;
};

export default ExpertSeasonProtocols;
