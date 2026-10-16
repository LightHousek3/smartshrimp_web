import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, App, Button, Card, ConfigProvider, Empty, Flex, Form, Input, Modal, Pagination, Space, Tabs, Tag, Tooltip, Typography } from 'antd';
import { ArrowLeftOutlined, DeleteOutlined, EditOutlined, EyeOutlined, PlusOutlined, SendOutlined } from '@ant-design/icons';
import { expertProductionProtocolAPI as api, expertSeasonAPI } from '../../apis';
import Loading from '../../components/Loading';
import { PROTOCOL_PRIMARY_BUTTON, PROTOCOL_STATUS_COLORS, PROTOCOL_STATUS_LABELS, PROTOCOL_THEME, SEASON_STATUS_LABELS, protocolError } from '../../constants/productionProtocol';
import ExpertProductionProtocolDetail from './ExpertProductionProtocolDetail';
import ExpertProductionProtocolForm from './ExpertProductionProtocolForm';
import { expertStyle as styles } from './expertStyle';

const dateText = (value) => {
    if (!value) return '—';
    const date = new Date(value);
    const timeZone = 'Asia/Ho_Chi_Minh';
    return `${date.toLocaleTimeString('vi-VN', { timeZone, hour: '2-digit', minute: '2-digit' })} ${date.toLocaleDateString('vi-VN', { timeZone, day: '2-digit', month: '2-digit' }).replace('/', '-')}`;
};
const ExpertSeasonDetailContent = ({ seasonId }) => {
    const navigate = useNavigate();
    const { message } = App.useApp();
    const [page, setPage] = useState(1);
    const [revision, setRevision] = useState(0);
    const [state, setState] = useState({ key: null });
    const [dialog, setDialog] = useState(null);
    const [cancelTarget, setCancelTarget] = useState(null);
    const [cancelBusy, setCancelBusy] = useState(false);
    const [cancelError, setCancelError] = useState(null);
    const [submitTarget, setSubmitTarget] = useState(null);
    const [submitBusy, setSubmitBusy] = useState(false);
    const [submitError, setSubmitError] = useState(null);
    const [cancelForm] = Form.useForm();
    const dialogRequest = useRef(null);
    const cancelPending = useRef(false);
    const submitPending = useRef(false);
    const alive = useRef(true);
    const key = `${seasonId}:${page}:${revision}`;
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
    const confirmCancel = (row) => { cancelForm.resetFields(); setCancelError(null); setCancelTarget(row); };
    const cancel = async () => {
        if (cancelPending.current) return;
        cancelPending.current = true;
        setCancelBusy(true); setCancelError(null);
        try {
            const { reason } = await cancelForm.validateFields();
            await api.cancel(seasonId, cancelTarget.id, { revision: cancelTarget.revision, reason: reason.trim() });
            if (!alive.current) return;
            setCancelTarget(null); message.success('Đã hủy bản nháp.'); refresh();
        } catch (error) {
            if (alive.current && !error.errorFields) {
                setCancelError(`${protocolError(error)}${error.response?.status === 409 ? ' Đóng hộp thoại và mở lại từ danh sách mới nhất để kiểm tra trạng thái.' : ''}`);
                if (error.response?.status === 409) refresh();
            }
        } finally { cancelPending.current = false; if (alive.current) setCancelBusy(false); }
    };
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
    if (state.error) return <Alert type="error" showIcon message={state.error} action={<Space>
        <Button onClick={() => navigate('/expert/seasons')}>Danh sách vụ</Button><Button onClick={refresh}>Thử lại</Button>
    </Space>} />;
    const { season, rows, meta } = state;
    const readOnly = ['COMPLETED', 'CANCELLED'].includes(season.status);
    return <ConfigProvider theme={PROTOCOL_THEME}><div className={styles.page}>
        <Button type="text" icon={<ArrowLeftOutlined />} className="mb-3! px-0! text-[#6a7994]!" onClick={() => navigate('/expert/seasons')}>Vụ nuôi được phân công</Button>
        <Flex align="center" wrap gap={12}><Typography.Title level={1} className="mb-0! text-[22px]!">{season.name}</Typography.Title>
            <Tag className={styles.pill} color={season.status === 'ACTIVE' ? 'blue' : season.status === 'PLANNING' ? 'purple' : 'default'}>{SEASON_STATUS_LABELS[season.status]}</Tag></Flex>
        <Typography.Paragraph type="secondary" className="mt-1! mb-0! text-[13px]!">
            {season.pond.farm.name} · Ao {season.pond.name} · {season.shrimpType === 'WHITELEG' ? 'Tôm thẻ chân trắng' : 'Tôm sú'}
            {season.stockingDate && ` · Thả ${new Date(season.stockingDate).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`}
            {season.expectedEndDate && ` → dự kiến ${new Date(season.expectedEndDate).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`}
        </Typography.Paragraph>
        <Tabs activeKey="protocols" items={[{ key: 'metrics', label: <Tooltip title="Chỉ số chuyên môn sẽ được bổ sung ở màn hình này">Chỉ số chuyên môn</Tooltip>, disabled: true },
            { key: 'protocols', label: 'Phác đồ nuôi', children: <Card className={`${styles.panel} rounded-[14px]! border-[#e5e8f0]! shadow-[0_1px_1px_rgba(15,28,46,0.04)]!`}>
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
                    {row.availableActions.cancel && <Tooltip title="Hủy bản nháp"><Button type="text" shape="circle" danger aria-label={`Hủy phiên bản ${row.versionNo}`} icon={<DeleteOutlined />} onClick={() => confirmCancel(row)} /></Tooltip>}
                </Space>
            </div>)}</Flex>
            {meta.totalResults > 20 && <Pagination className="mt-4!" current={page} total={meta.totalResults} pageSize={20} showSizeChanger={false} onChange={setPage} />}
        </Card> }, { key: 'diseases', label: <Tooltip title="Ca bệnh được quản lý ở mục Ca bệnh">Ca bệnh</Tooltip>, disabled: true }]} />
        {(dialog?.loading || dialog?.error) && <Modal open footer={null} onCancel={closeDialog} title="Phác đồ nuôi">
            {dialog.loading ? <Loading tip="Đang tải chi tiết" /> : <Alert type="error" message={dialog.error}
                action={<Button onClick={() => openDialog(dialog.protocolId, dialog.mode)}>Thử lại</Button>} />}
        </Modal>}
        {dialog?.detail && dialog.mode === 'view' && <ExpertProductionProtocolDetail detail={dialog.detail} onClose={closeDialog} onEdit={() => openDialog(dialog.detail.id, 'edit')} onSubmit={() => confirmSubmit(dialog.detail)} submitBusy={submitBusy} />}
        {dialog && !dialog.loading && !dialog.error && dialog.mode !== 'view' && <ExpertProductionProtocolForm
            key={`${seasonId}:${dialog.detail?.id || 'new'}:${dialog.detail?.revision || 0}`} seasonId={seasonId} season={season}
            detail={dialog.detail} onClose={closeDialog} onSaved={() => { closeDialog(); refresh(); }}
            onReload={(id) => { closeDialog(); refresh(); if (id) openDialog(id, 'edit'); }} />}
        <Modal open={Boolean(cancelTarget)} title="Hủy bản nháp phác đồ nuôi?" okText="Xác nhận hủy" cancelText="Quay lại" okButtonProps={{ danger: true }}
            confirmLoading={cancelBusy} closable={!cancelBusy} maskClosable={!cancelBusy} keyboard={!cancelBusy}
            onCancel={() => { if (!cancelBusy) setCancelTarget(null); }} onOk={cancel}>
            <Typography.Paragraph>{cancelTarget?.title} — v{cancelTarget?.versionNo}. Nội dung và lịch sử sẽ được giữ lại.</Typography.Paragraph>
            {cancelError && <Alert type="error" message={cancelError} className="mb-3!" />}
            <Form form={cancelForm} layout="vertical" disabled={cancelBusy}><Form.Item name="reason" label="Lý do hủy" rules={[{ required: true, whitespace: true, max: 2000, message: 'Nhập lý do hủy, tối đa 2000 ký tự.' }]}>
                <Input.TextArea autoFocus maxLength={2000} rows={3} />
            </Form.Item></Form>
        </Modal>
        <Modal open={Boolean(submitTarget)} title="Gửi phác đồ cho chủ trại duyệt?" okText="Gửi duyệt" cancelText="Quay lại" confirmLoading={submitBusy}
            okButtonProps={{ className: PROTOCOL_PRIMARY_BUTTON }} closable={!submitBusy} maskClosable={!submitBusy} keyboard={!submitBusy}
            onCancel={() => { if (!submitBusy) setSubmitTarget(null); }} onOk={submit}>
            <Typography.Paragraph>{submitTarget?.title} · v{submitTarget?.versionNo}. Bạn có thể chỉnh sửa lại nếu chủ trại từ chối.</Typography.Paragraph>
            {submitError && <Alert type="error" message={submitError} />}
        </Modal>
    </div></ConfigProvider>;
};

const ExpertSeasonDetail = () => {
    const { seasonId } = useParams();
    return <ExpertSeasonDetailContent key={seasonId} seasonId={seasonId} />;
};

export default ExpertSeasonDetail;
