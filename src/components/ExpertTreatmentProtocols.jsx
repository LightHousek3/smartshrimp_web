import { useEffect, useMemo, useRef, useState } from 'react';
import { App, Button, Empty, Form, Input, List, Modal, Radio, Space, Spin, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { expertProductionProtocolAPI, expertTreatmentProtocolAPI as api } from '../apis';
import { PROTOCOL_STATUS_COLORS, PROTOCOL_STATUS_LABELS, protocolError } from '../constants/productionProtocol';
import ExpertProductionProtocolForm from './ExpertProductionProtocolForm';
import ExpertProductionProtocolDetail from '../pages/expert/ExpertProductionProtocolDetail';

const ExpertTreatmentProtocols = ({ diseaseCase, onChanged }) => {
    const caseId = diseaseCase.id;
    const { message } = App.useApp();
    const [detail, setDetail] = useState(null);
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
    const load = async id => {
        request.current?.abort();
        const controller = new AbortController();
        request.current = controller;
        setLoading(true);
        try {
            const response = await api.detail(caseId, id, controller.signal);
            if (!controller.signal.aborted) setDetail(response.data.data);
        } catch (error) {
            if (!controller.signal.aborted) message.error(protocolError(error));
        } finally {
            if (!controller.signal.aborted) setLoading(false);
        }
    };
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
    const run = async callback => {
        if (mutation.current) return;
        mutation.current = true; setBusy(true);
        try {
            const response = await callback();
            if (!mounted.current) return;
            setAction(null); form.resetFields();
            message.success(response.data.message || 'Đã cập nhật phác đồ.');
            await load(detail.id);
            await onChanged();
        } catch (error) {
            if (mounted.current) message.error(protocolError(error));
        } finally {
            mutation.current = false;
            if (mounted.current) setBusy(false);
        }
    };
    const confirm = async () => {
        try {
            const values = await form.validateFields();
            await run(() => action === 'stop' ? api.stop(caseId, detail.id, { ...values, revision: detail.revision })
                : api.cancel(caseId, detail.id, { reason: values.reason, revision: detail.revision }));
        } catch (error) {
            if (!error.errorFields) message.error(protocolError(error));
        }
    };
    const protocols = diseaseCase.protocols || [];
    const inProgress = protocols.some(row => ['DRAFT', 'REJECTED', 'PENDING_APPROVAL'].includes(row.status));
    const writable = diseaseCase.status !== 'RESOLVED' && diseaseCase.season?.status === 'ACTIVE';
    return <Spin spinning={loading}>
        <div className="p-4 sm:p-5">
            <Space className="mb-4" wrap>
                <Button type="primary" icon={<PlusOutlined />} disabled={!writable || inProgress || busy} onClick={() => edit(null)}>
                    Tạo phác đồ điều trị
                </Button>
                {inProgress && <span>Tiếp tục bản đang soạn hoặc xử lý bản chờ duyệt trước khi tạo bản mới.</span>}
            </Space>
            <List dataSource={protocols} locale={{ emptyText: <Empty description="Chưa có phác đồ điều trị" /> }}
                renderItem={row => <List.Item key={row.id} actions={[
                    <Button key="detail" onClick={() => load(row.id)} disabled={busy}>Xem chi tiết</Button>,
                ]}>
                    <List.Item.Meta title={<Space wrap><span>v{row.versionNo} · {row.title}</span>
                        <Tag color={PROTOCOL_STATUS_COLORS[row.status]}>{PROTOCOL_STATUS_LABELS[row.status] || row.status}</Tag></Space>}
                        description={`${row.metrics?.completedCount ?? 0}/${row.metrics?.totalSchedules ?? 0} lịch đã sinh được ghi nhận thực hiện`} />
                </List.Item>} />
        </div>
        {detail && !editing && <ExpertProductionProtocolDetail detail={detail} submitBusy={busy}
            onClose={() => { request.current?.abort(); setDetail(null); setLoading(false); }}
            onEdit={() => edit(detail)} onRefresh={() => load(detail.id)}
            onSubmit={() => run(() => api.submit(caseId, detail.id, { revision: detail.revision }))}
            onCancel={() => { form.resetFields(); setAction('cancel'); }}
            onStop={() => { form.resetFields(); setAction('stop'); }} />}
        {editing && context && <ExpertProductionProtocolForm key={detail?.id || 'new-treatment'}
            seasonId={context.id} season={context} detail={detail} api={authoringAPI}
            onClose={() => setEditing(false)} onReload={async id => { setEditing(false); if (id) await load(id); }}
            onSaved={async saved => { setEditing(false); await load(saved.id); await onChanged(); }} />}
        <Modal open={Boolean(action)} title={action === 'stop' ? 'Dừng điều trị' : 'Hủy / thu hồi phác đồ chưa áp dụng'}
            confirmLoading={busy} closable={!busy} maskClosable={!busy} cancelButtonProps={{ disabled: busy }}
            onCancel={() => setAction(null)} onOk={confirm} okText="Xác nhận" cancelText="Quay lại">
            <Form form={form} layout="vertical">
                <Form.Item name="reason" label="Lý do và hướng chăm sóc tiếp theo" rules={[{ required: true, whitespace: true, max: 500 }]}>
                    <Input.TextArea rows={4} maxLength={500} showCount />
                </Form.Item>
                {action === 'stop' && <Form.Item name="resumeProduction" label="Sau khi dừng điều trị" rules={[{ required: true }]}>
                    <Radio.Group options={[{ label: 'Cho phép phác đồ nuôi tiếp tục nếu đủ điều kiện', value: true },
                        { label: 'Tạm giữ phác đồ nuôi', value: false }]} />
                </Form.Item>}
            </Form>
        </Modal>
    </Spin>;
};

export default ExpertTreatmentProtocols;
