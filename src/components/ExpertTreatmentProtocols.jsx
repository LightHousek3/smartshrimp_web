import { useEffect, useMemo, useRef, useState } from 'react';
import { App, Button, Card, Form, Input, Modal, Radio, Space, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { expertProductionProtocolAPI, expertTreatmentProtocolAPI as api } from '../apis';
import { protocolError } from '../constants/productionProtocol';
import ExpertProductionProtocolForm from './ExpertProductionProtocolForm';
import ExpertProductionProtocolDetail from '../pages/expert/ExpertProductionProtocolDetail';
import ExpertTreatmentProtocolList from './ExpertTreatmentProtocolList';
import { expertStyle as styles } from '../constants/expertStyle';

/** Keep treatment authoring and actions within the selected disease case. */
const ExpertTreatmentProtocols = ({ diseaseCase, onChanged }) => {
    const caseId = diseaseCase.id;
    const { message } = App.useApp();
    const [detail, setDetail] = useState(null);
    const [viewId, setViewId] = useState(null);
    const [loadError, setLoadError] = useState(null);
    const [context, setContext] = useState(null);
    const [editing, setEditing] = useState(false);
    const [action, setAction] = useState(null);
    const [loading, setLoading] = useState(false);
    const [busy, setBusy] = useState(false);
    const [form] = Form.useForm();
    const request = useRef(null);
    const mutation = useRef(false);
    const mounted = useRef(true);
    const authoringAPI = useMemo(() => ({ ...expertProductionProtocolAPI,
        create: (_seasonId, body) => api.create(caseId, body),
        update: (_seasonId, id, body) => api.update(caseId, id, body),
    }), [caseId]);
    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; request.current?.abort(); };
    }, []);
    /** Cancel the previous detail request before selecting another treatment version. */
    const load = async id => {
        request.current?.abort();
        const controller = new AbortController();
        request.current = controller;
        setViewId(id); setLoadError(null); setDetail(null);
        setLoading(true);
        try {
            const response = await api.detail(caseId, id, controller.signal);
            if (!controller.signal.aborted) setDetail(response.data.data);
        } catch (error) {
            if (!controller.signal.aborted) setLoadError(protocolError(error));
        } finally {
            if (!controller.signal.aborted) setLoading(false);
        }
    };
    /** Reload authoring permissions before creating or editing treatment content. */
    const edit = async current => {
        request.current?.abort();
        const controller = new AbortController(); request.current = controller;
        setLoading(true);
        try {
            const response = await api.context(caseId, controller.signal);
            if (controller.signal.aborted) return;
            if (!current && !response.data.data.availableActions.create) {
                message.warning('Còn bản đang soạn hoặc chờ duyệt; hãy xử lý bản đó trước.'); return;
            }
            setContext({ ...response.data.data, protocolType: 'TREATMENT', authoringVersion: 2 });
            setDetail(current); setEditing(true);
        } catch (error) {
            if (!controller.signal.aborted) message.error(protocolError(error));
        } finally {
            if (!controller.signal.aborted) setLoading(false);
        }
    };
    /** Serialize treatment mutations and avoid refetching a draft that has just been deleted. */
    const run = async (callback, { deleted = false } = {}) => {
        if (mutation.current) return;
        mutation.current = true; setBusy(true);
        try {
            const response = await callback();
            if (!mounted.current) return;
            setAction(null); form.resetFields();
            message.success(response.data.message || 'Đã cập nhật phác đồ.');
            if (deleted) { setViewId(null); setDetail(null); setLoadError(null); }
            else await load(detail.id);
            await onChanged();
        } catch (error) {
            if (mounted.current) message.error(protocolError(error));
        } finally {
            mutation.current = false;
            if (mounted.current) setBusy(false);
        }
    };
    /** Keep draft deletion separate from a reasoned treatment-stop decision. */
    const confirm = async () => {
        try {
            if (action === 'delete') {
                await run(() => api.remove(caseId, detail.id, { revision: detail.revision }), { deleted: true });
                return;
            }
            const values = await form.validateFields();
            await run(() => api.stop(caseId, detail.id, { ...values, revision: detail.revision }));
        } catch (error) {
            if (!error.errorFields) message.error(protocolError(error));
        }
    };
    const protocols = diseaseCase.protocols || [];
    const inProgress = protocols.some(row => ['DRAFT', 'REJECTED', 'PENDING_APPROVAL'].includes(row.status));
    const writable = diseaseCase.status !== 'RESOLVED' && diseaseCase.season?.status === 'ACTIVE';
    return <>
        <div className="p-4 sm:p-5">
            <Card className={`${styles.panel} rounded-[14px]! border-[#e5e8f0]!`}>
            <Space className="mb-4" wrap>
                <Button type="primary" icon={<PlusOutlined />} loading={loading && !viewId} disabled={!writable || inProgress || busy || loading} onClick={() => edit(null)}>
                    Tạo phác đồ điều trị
                </Button>
                {inProgress && <span>Tiếp tục bản đang soạn hoặc xử lý bản chờ duyệt trước khi tạo bản mới.</span>}
            </Space>
            <ExpertTreatmentProtocolList rows={protocols} onView={row => load(row.id)} disabled={busy} />
            </Card>
        </div>
        {viewId && !editing && <ExpertProductionProtocolDetail detail={detail} submitBusy={busy} loading={loading}
            error={loadError} title="Chi tiết phác đồ điều trị" onRetry={() => load(viewId)}
            onClose={() => { request.current?.abort(); setViewId(null); setDetail(null); setLoading(false); }}
            onEdit={() => edit(detail)} onRefresh={() => load(detail.id)}
            onSubmit={() => run(() => api.submit(caseId, detail.id, { revision: detail.revision }))}
            onDelete={() => setAction('delete')}
            onStop={() => { form.resetFields(); setAction('stop'); }} />}
        {editing && context && <ExpertProductionProtocolForm key={detail?.id || 'new-treatment'}
            seasonId={context.id} season={context} detail={detail} api={authoringAPI}
            onClose={() => setEditing(false)} onReload={async id => { setEditing(false); if (id) await load(id); }}
            onSaved={async saved => { setEditing(false); await load(saved.id); await onChanged(); }} />}
        <Modal open={Boolean(action)} title={action === 'stop' ? (detail?.status === 'APPROVED' ? 'Hủy kế hoạch điều trị chưa bắt đầu' : 'Dừng điều trị') : 'Xóa bản nháp phác đồ điều trị?'}
            confirmLoading={busy} closable={!busy} maskClosable={!busy} keyboard={!busy} cancelButtonProps={{ disabled: busy }}
            onCancel={() => setAction(null)} onOk={confirm} okText={action === 'delete' ? 'Xóa nháp' : 'Xác nhận'}
            okButtonProps={{ danger: action === 'delete' }} cancelText="Quay lại">
            {action === 'delete' ? <Typography.Paragraph>Bản nháp chưa gửi sẽ bị xóa. Lần tạo tiếp theo có thể dùng lại số phiên bản này.</Typography.Paragraph>
                : <Form form={form} layout="vertical" disabled={busy}>
                <Form.Item name="reason" label="Lý do và hướng chăm sóc tiếp theo" rules={[{ required: true, whitespace: true, max: 500 }]}>
                    <Input.TextArea rows={4} maxLength={500} showCount />
                </Form.Item>
                {action === 'stop' && <Form.Item name="resumeProduction" label="Sau khi dừng điều trị" rules={[{ required: true }]}>
                    <Radio.Group options={[{ label: 'Cho phép phác đồ nuôi tiếp tục nếu đủ điều kiện', value: true },
                        { label: 'Tạm hoãn phác đồ nuôi', value: false }]} />
                </Form.Item>}
            </Form>}
        </Modal>
    </>;
};

export default ExpertTreatmentProtocols;
