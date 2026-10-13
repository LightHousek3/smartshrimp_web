import { useEffect, useRef, useState } from 'react';
import { Alert, App, Avatar, Button, Card, ConfigProvider, Descriptions, Drawer, Empty, Form, Input, Progress, Select, Skeleton, Space, Statistic, Switch, Table, Tag, Tooltip, Upload } from 'antd';
import { EditOutlined, ReloadOutlined, SyncOutlined } from '@ant-design/icons';
import { adminStyles } from './adminStyles';
import { ragDocumentAPI as api } from '../../apis';
import { RAG_DOCUMENT_CATEGORIES, RAG_DOCUMENT_RULES } from '../../constants/ragDocument';
import { validateRagDocument } from '../../utils/ragDocumentUtils';

const asset = (name) => `/assets/rag/${name.startsWith('upload-') || name.startsWith('detail-') ? '' : 'list/'}${name}.svg`;
const Icon = ({ name, className = '' }) => <img className={`inline-block shrink-0 align-middle max-w-none ${className}`} src={asset(name)} alt="" aria-hidden="true" />;
const STATES = {
    UPLOADING: ['Đang tải lên', 'processing'], PENDING: ['Chờ xử lý', 'default'],
    PROCESSING: ['Đang xử lý', 'processing'], READY: ['Sẵn sàng', 'success'],
    FAILED: ['Xử lý thất bại', 'error'], DELETING: ['Đang dọn file', 'processing'], DELETE_FAILED: ['Dọn file chưa hoàn tất', 'error'],
};
const Status = ({ value, errorCode }) => <Tag className={`rounded-full! text-[10px]! leading-[18px]! [&_img]:mr-[7px] ${value === 'READY' ? 'border-[#b5e5de]! bg-[#e6f7f4]! text-[#0f9b8e]!' : ''}`} color={STATES[value]?.[1]}
    icon={value === 'READY' ? <Icon name="imgIconReact13" /> : value === 'FAILED' ? <Icon name="imgIconReact17" /> : undefined}>{value === 'FAILED' && errorCode === 'RAG_SOURCE_MISSING' ? 'Mất file gốc' : STATES[value]?.[0] || value}</Tag>;
const date = (value) => value ? new Date(value).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }).replace(',', '') : '—';
const size = (value) => `${(value / 1024 / 1024).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} MiB`;
const errorText = (error) => error?.response?.data?.message || error?.message || 'Không thể kết nối. Vui lòng thử lại.';
const busy = (row) => ['UPLOADING', 'PROCESSING', 'DELETING'].includes(row.status);

export default function RagDocuments() {
    const { message } = App.useApp();
    const [rows, setRows] = useState([]);
    const [meta, setMeta] = useState({ counts: {}, categories: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [query, setQuery] = useState('');
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState();
    const [status, setStatus] = useState();
    const [page, setPage] = useState(1);
    const [refresh, setRefresh] = useState(0);
    const [selectedId, setSelectedId] = useState(null);
    const [detail, setDetail] = useState(null);
    const [uploadOpen, setUploadOpen] = useState(false);
    const [editing, setEditing] = useState(false);
    const [file, setFile] = useState(null);
    const [fileError, setFileError] = useState('');
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [uploadError, setUploadError] = useState('');
    const [uploadPhase, setUploadPhase] = useState('');
    const [uploadSession, setUploadSession] = useState(null);
    const [reuploadTarget, setReuploadTarget] = useState(null);
    const [pendingAction, setPendingAction] = useState(null);
    const [hasColumnFilters, setHasColumnFilters] = useState(false);
    const actionRef = useRef(false);
    const alive = useRef(true);
    const uploadRequest = useRef(null);
    const [form] = Form.useForm();
    const [editForm] = Form.useForm();
    const reload = () => setRefresh((value) => value + 1);

    useEffect(() => {
        alive.current = true;
        return () => { alive.current = false; uploadRequest.current?.abort(); };
    }, []);
    useEffect(() => {
        const timer = setTimeout(() => { setSearch(query.trim()); setPage(1); }, 400);
        return () => clearTimeout(timer);
    }, [query]);
    useEffect(() => {
        const controller = new AbortController();
        let timer;
        const load = async (initial = false) => {
            if (initial) setLoading(true);
            try {
                const response = await api.list({ q: search || undefined, category, status, page, limit: 10 }, controller.signal);
                if (controller.signal.aborted) return;
                setRows(response.data); setMeta(response.meta); setError('');
                if (page > 1 && response.data.length === 0) setPage(page - 1);
                if (selectedId) {
                    try {
                        const value = response.data.find((row) => row.id === selectedId) || await api.get(selectedId, controller.signal);
                        if (!controller.signal.aborted) setDetail(value);
                    } catch (detailError) {
                        if (detailError.response?.status === 404 && !controller.signal.aborted) { setSelectedId(null); setDetail(null); }
                        else throw detailError;
                    }
                }
                const counts = response.meta.counts;
                if (['PENDING', 'PROCESSING', 'UPLOADING', 'DELETING'].some((key) => counts[key] > 0) && !controller.signal.aborted) {
                    timer = setTimeout(() => load(), 10000);
                }
            } catch (requestError) {
                if (!controller.signal.aborted) setError(errorText(requestError));
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        };
        void load(true);
        return () => { controller.abort(); clearTimeout(timer); };
    }, [search, category, status, page, refresh, selectedId]);

    const openDetail = (row) => { setEditing(false); setDetail(row); setSelectedId(row.id); };
    const act = async (id, operation, success) => {
        if (actionRef.current) return;
        actionRef.current = true; setPendingAction(id);
        try {
            const result = await operation();
            if (!alive.current) return;
            if (result?.id === selectedId) setDetail(result);
            if (success) message.success(success);
            reload();
            return result;
        } catch (requestError) {
            if (alive.current) message.error(errorText(requestError));
            if (alive.current && requestError.response?.data?.errorCode === 'RAG_SOURCE_MISSING') reload();
            throw requestError;
        } finally {
            actionRef.current = false;
            if (alive.current) setPendingAction(null);
        }
    };
    const toggle = (row, value) => { void act(row.id, () => api.update(row.id, { isActive: value }), value ? 'Đã bật tài liệu cho AI.' : 'Đã ngừng sử dụng tài liệu.').catch(() => {}); };
    const retry = (row) => { void act(row.id, () => api.retry(row.id), 'Đã đưa tài liệu vào hàng đợi xử lý lại.').catch(() => {}); };
    const download = (row) => { void act(row.id, async () => {
        const blob = await api.download(row.id);
        if (!alive.current) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a'); link.href = url; link.download = row.originalFilename;
        link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    }).catch(() => {}); };
    const selectFile = (value, files) => {
        const limit = meta.upload?.maxFileBytes || RAG_DOCUMENT_RULES.maxFileBytes;
        const problem = files.length !== 1 ? 'Chỉ chọn một file mỗi lần.'
            : value.size > limit ? `Tài liệu không được vượt quá ${size(limit)}.` : validateRagDocument(value);
        setFileError(problem); setUploadError(''); setFile(problem ? null : value);
        if (!problem && !form.getFieldValue('title')) form.setFieldValue('title', value.name.replace(/\.[^.]+$/, '').slice(0, 255));
        return Upload.LIST_IGNORE;
    };
    const clearFile = () => {
        if (uploadSession && uploadSession.kind !== 'reupload') void api.cancelUpload(uploadSession.id).catch(() => {});
        setUploadSession(null); setFile(null); setFileError(''); setUploadError('');
    };
    const openUpload = (target = null) => {
        clearFile(); form.resetFields(); setReuploadTarget(target); setUploadOpen(true);
    };
    const submit = async (values) => {
        if (uploadRequest.current) return;
        const problem = validateRagDocument(file);
        if (problem) { setFileError(problem); return; }
        const controller = new AbortController(); uploadRequest.current = controller;
        setUploading(true); setProgress(0); setUploadError('');
        try {
            const result = await api.createDocument(file, {
                ...values, reuploadId: reuploadTarget?.id, session: uploadSession, signal: controller.signal,
                onProgress: (value) => { if (alive.current) setProgress(value); },
                onPhase: (value) => { if (alive.current) setUploadPhase(value); },
                onSession: (value) => { if (alive.current) setUploadSession(value); },
            });
            if (!alive.current) return;
            if (result.id === selectedId) setDetail(result);
            message.success('Tải lên thành công. AI đang chuẩn bị tài liệu.');
            setUploadOpen(false); setFile(null); setUploadSession(null); setReuploadTarget(null); form.resetFields(); setPage(1); reload();
        } catch (requestError) {
            if (alive.current && !controller.signal.aborted) { setUploadError(errorText(requestError)); reload(); }
        } finally {
            uploadRequest.current = null;
            if (alive.current) { setUploading(false); setUploadPhase(''); }
        }
    };
    const saveMetadata = async (values) => {
        try {
            await act(detail.id, () => api.update(detail.id, values), 'Đã lưu thông tin tài liệu.');
            if (alive.current) setEditing(false);
        } catch { /* The action displays the backend error and keeps the editor open. */ }
    };
    const categories = RAG_DOCUMENT_CATEGORIES.map((value) => ({ label: value, value }));
    const columnFilterProps = { filterMultiple: true, filterDropdownProps: { rootClassName: adminStyles.filterDropdown } };
    const columns = [
        { title: 'Tên tài liệu', key: 'title', width: 300, fixed: 'left', render: (_, row) => <div className="flex min-w-0 items-center gap-2.5 [&>div]:min-w-0">
            <Avatar className={adminStyles.avatar} size={36} icon={<span className="inline-flex items-center justify-center"><Icon name="imgIconReact18" /></span>} /><div>
                <button type="button" className="block max-w-full cursor-pointer truncate border-0 bg-transparent p-0 text-left text-[13px] font-semibold leading-[21px] text-[#0f1c2e] hover:text-[#1d7ad6]" onClick={() => openDetail(row)}>{row.title}</button>
                <div className="mt-0.5 truncate text-[11px] leading-[18px] text-[#6a7994]" title={row.originalFilename}>{row.originalFilename}</div>
            </div></div> },
        { title: 'Danh mục', dataIndex: 'category', width: 150, ...columnFilterProps,
            filters: [{ text: 'Tất cả', value: '*' }, ...categories.map(({ label, value }) => ({ text: label, value })), { text: 'Chưa có danh mục', value: '' }],
            onFilter: (value, row) => value === '*' || (row.category || '') === value, render: (value) => value || '—' },
        { title: 'Trạng thái', dataIndex: 'status', width: 155, ...columnFilterProps,
            filters: [{ text: 'Tất cả', value: '*' }, ...Object.entries(STATES).map(([value, [text]]) => ({ text, value }))],
            onFilter: (value, row) => value === '*' || row.status === value, render: (value, row) => <Status value={value} errorCode={row.errorCode} /> },
        { title: 'AI sử dụng', key: 'active', width: 115, align: 'center', ...columnFilterProps,
            filters: [{ text: 'Đang sử dụng', value: true }, { text: 'Không sử dụng', value: false }],
            onFilter: (value, row) => Boolean(row.isActive && row.status === 'READY') === value,
            render: (_, row) => <Tooltip title={row.status !== 'READY' ? 'Chỉ sử dụng khi tài liệu sẵn sàng.' : undefined}>
            <Switch size="small" checked={row.isActive && row.status === 'READY'} disabled={row.status !== 'READY' || !!pendingAction}
                loading={pendingAction === row.id} onChange={(value) => toggle(row, value)} aria-label={`Cho phép AI dùng ${row.title}`} /></Tooltip> },
        { title: 'Người tải', key: 'uploader', width: 110, ...columnFilterProps,
            filters: [...new Set(rows.map((row) => row.uploader?.fullName || 'Admin'))].map((value) => ({ text: value, value })),
            onFilter: (value, row) => (row.uploader?.fullName || 'Admin') === value,
            render: (_, row) => row.uploader?.fullName || 'Admin' },
        { title: 'Ngày tải', dataIndex: 'createdAt', width: 170, render: date },
        { title: 'Hành động', key: 'actions', width: 100, fixed: 'right', render: (_, row) => <Space size={6} className="flex">
            <Tooltip title="Xem chi tiết"><Button className={adminStyles.iconButton} shape="circle" size="small" aria-label={`Xem ${row.title}`} disabled={!!pendingAction} onClick={() => openDetail(row)} icon={<Icon name="imgIconReact14" />} /></Tooltip>
            <Tooltip title="Tải file gốc"><Button className={adminStyles.iconButton} shape="circle" size="small" aria-label={`Tải xuống ${row.title}`} disabled={!!pendingAction || ['DELETING', 'DELETE_FAILED', 'UPLOADING'].includes(row.status)} onClick={() => download(row)} icon={<Icon name="detail-imgIconReact20" />} /></Tooltip>
        </Space> },
    ];
    const count = meta.counts || {};
    const statistics = [
        ['Tổng tài liệu', Object.values(count).reduce((total, value) => total + value, 0), 'imgIconReact5'],
        ['Sẵn sàng', count.READY || 0, 'imgIconReact6'],
        ['Đang xử lý', (count.PENDING || 0) + (count.PROCESSING || 0) + (count.UPLOADING || 0), 'processing'],
        ['Thất bại', (count.FAILED || 0) + (count.DELETE_FAILED || 0), 'imgIconReact8'],
    ];

    return <ConfigProvider theme={{ token: { fontFamily: "'Plus Jakarta Sans', 'Segoe UI', sans-serif", fontSize: 13, borderRadius: 10, controlHeight: 36, colorPrimary: '#1d7ad6', colorText: '#0f1c2e', colorTextSecondary: '#6a7994', colorBorder: '#e5e8f0' } }}>
        <section className="flex min-w-0 flex-col text-[13px] text-[#0f1c2e]" aria-labelledby="rag-heading">
            <header className="flex items-end justify-between gap-5 max-[600px]:flex-wrap max-[600px]:items-start"><div><h1 id="rag-heading" className="m-0 font-[Sora] text-[22px] leading-7 font-semibold max-[600px]:text-xl">Kho tài liệu AI</h1><p className="m-0 mt-1 text-[#6a7994]">Quản lý nguồn tri thức phục vụ chatbot SmartShrimp.</p></div>
                <Button className={adminStyles.primaryButton} type="primary" icon={<Icon name="imgIconReact4" />} onClick={() => openUpload()}>Thêm tài liệu</Button></header>
            <div className="mt-5 mb-4 grid grid-cols-2 gap-3 [&_.ant-card-body]:p-4 [&_.ant-statistic-content]:flex [&_.ant-statistic-content]:items-center [&_.ant-statistic-content]:text-[22px] [&_.ant-statistic-content-prefix]:mr-2">{statistics.map(([title, value, icon]) => <Card key={title}><Statistic title={title} value={value} prefix={<Avatar className="inline-flex! shrink-0! items-center! justify-center! rounded-full! border-0! bg-[rgba(29,122,214,0.12)]! text-[22px]! text-[#1d7ad6]!" size={44} icon={<span className="inline-flex items-center justify-center">{icon === 'processing' ? <SyncOutlined className="text-[17px]" spin={value > 0} /> : <Icon name={icon} />}</span>} />} /></Card>)}</div>
            {error && <Alert type="error" showIcon message="Không thể tải tài liệu" description={error} action={<Button onClick={reload}>Thử lại</Button>} />}
            <div className={`${adminStyles.tableShell} mt-4`}><div className="flex flex-wrap items-center gap-2 border-b border-[#eef1f7] px-4 py-3">
                <Input className={`${adminStyles.search} max-[600px]:w-full`} allowClear={{ clearIcon: <span className="inline-block h-2.5 w-2.5 overflow-hidden [&_img]:origin-top-left [&_img]:scale-[.3125] [&_img]:align-top"><Icon name="imgIconReact10" /></span> }} prefix={<Icon name="imgIconReact9" />} placeholder="Tìm tên tài liệu…" aria-label="Tìm tên tài liệu" value={query} onChange={(event) => setQuery(event.target.value)} />
                <Select className={adminStyles.filter} allowClear placeholder="Danh mục" aria-label="Lọc danh mục" value={category ?? ''} options={[{ label: 'Tất cả', value: '' }, ...categories]} onChange={(value) => { setCategory(value || undefined); setPage(1); }} suffixIcon={<Icon name="imgIconReact11" />} />
                <Select className={adminStyles.filter} allowClear placeholder="Trạng thái" aria-label="Lọc trạng thái" value={status ?? ''} options={[{ label: 'Tất cả', value: '' }, ...Object.entries(STATES).map(([value, [label]]) => ({ label, value }))]} onChange={(value) => { setStatus(value || undefined); setPage(1); }} suffixIcon={<Icon name="imgIconReact11" />} />
                <Tooltip title="Làm mới"><Button className="shrink-0" aria-label="Làm mới danh sách" icon={<Icon name="imgIconReact12" />} onClick={reload} loading={loading} /></Tooltip>
            </div><Table rowKey="id" columns={columns} dataSource={rows} loading={loading} scroll={{ x: 1132 }}
                onChange={(pagination, filters, _sorter, extra) => {
                    setHasColumnFilters(Object.values(filters).some((values) => values?.length && !values.includes('*')));
                    if (extra.action === 'paginate') setPage(pagination.current);
                }}
                locale={{ filterReset: 'Reset', filterConfirm: 'OK', emptyText: <Empty description={search || category || status || hasColumnFilters ? 'Không tìm thấy tài liệu phù hợp.' : 'Chưa có tài liệu.'}>{!search && !category && !status && !hasColumnFilters && <Button type="primary" className={adminStyles.primaryButton} onClick={() => openUpload()}>Thêm tài liệu</Button>}</Empty> }}
                pagination={{ current: page, pageSize: 10, total: meta.totalResults || 0, showSizeChanger: false, showTotal: (total, range) => `${range[0]}–${range[1]} / ${total} tài liệu`,
                    itemRender: (_, type, original) => type === 'prev' || type === 'next' ? <button type="button" className="ant-pagination-item-link" aria-label={type === 'prev' ? 'Trang trước' : 'Trang sau'}><Icon name={type === 'prev' ? 'imgIconReact19' : 'imgIconReact20'} /></button> : original,
                }} /></div>
        </section>
        <Drawer title={reuploadTarget ? 'Tải lại file gốc' : 'Thêm tài liệu kiến thức'} open={uploadOpen} width={520} onClose={() => { if (!uploading) setUploadOpen(false); }} maskClosable={!uploading} keyboard={!uploading}
            closeIcon={<Icon name="upload-imgIconReact19" />} className={adminStyles.drawer} rootClassName={adminStyles.drawerRoot}
            footer={<Space><Button disabled={uploading} onClick={() => setUploadOpen(false)}>Hủy</Button><Button type="primary" className={adminStyles.primaryButton} icon={<Icon name="upload-imgIconReact22" />} loading={uploading} onClick={() => form.submit()}>{uploadSession ? 'Xác nhận lại' : 'Tải lên'}</Button></Space>}>
            <p className="text-[#6a7994] m-0 mb-4 leading-[21px]">{reuploadTarget ? `Chọn lại file gốc của “${reuploadTarget.title}”. Nội dung và định dạng phải khớp bản ban đầu; tên file có thể khác. Tài liệu sẽ được xử lý lại sau khi tải lên.` : 'Tải tài liệu để AI có thể tham khảo khi trả lời câu hỏi.'}</p>
            <Form form={form} layout="vertical" onFinish={submit} disabled={uploading || !!uploadSession} requiredMark={false}>
                <Form.Item label="Tài liệu" validateStatus={fileError ? 'error' : undefined} help={fileError}>
                    <Upload.Dragger accept={(meta.upload?.extensions || RAG_DOCUMENT_RULES.extensions).join(',')} beforeUpload={selectFile} showUploadList={false} multiple={false} disabled={uploading || !!uploadSession} aria-label="Chọn tài liệu">
                        <div className="mb-3 flex justify-center"><Icon name="upload-imgIconReact20" /></div><p className="m-0 text-[13px] font-semibold leading-[21px]">Kéo thả hoặc chọn file</p><p className="m-0 mt-1 text-xs leading-5 text-[#6a7994]">PDF, DOCX, TXT, MD · Tối đa {size(meta.upload?.maxFileBytes || RAG_DOCUMENT_RULES.maxFileBytes)}</p>
                    </Upload.Dragger>
                    {file && <div className="flex items-center justify-between gap-2 pt-2 break-all"><span>{file.name} · {size(file.size)}</span><Button size="small" type="text" disabled={uploading} onClick={clearFile}>Bỏ file</Button></div>}
                </Form.Item>
                {!reuploadTarget && <>
                <Form.Item name="title" label="Tên tài liệu" rules={[{ required: true, whitespace: true, message: 'Nhập tên tài liệu.' }, { max: 255 }]}><Input maxLength={255} placeholder="Ví dụ: Hướng dẫn phòng bệnh EMS" /></Form.Item>
                <Form.Item name="category" label="Danh mục" getValueFromEvent={(value) => value ?? null}><Select allowClear options={categories} placeholder="Chọn danh mục" /></Form.Item>
                <Form.Item name="description" label="Mô tả" rules={[{ max: 1000 }]}><Input.TextArea rows={4} maxLength={1000} showCount placeholder="Mô tả ngắn về nội dung tài liệu" /></Form.Item>
                </>}
                <Alert className="mt-1" type="info" showIcon icon={<Icon name="upload-imgIconReact21" />} message="Sau khi tải lên, AI cần xử lý trước khi tài liệu sẵn sàng." />
                {uploading && <div aria-live="polite">{uploadPhase === 'uploading' && <Progress percent={progress} />}<span className="text-[#6a7994]">{uploadPhase === 'hashing' ? 'Đang chuẩn bị tài liệu…' : uploadPhase === 'confirming' ? 'Đang xác nhận tài liệu…' : 'Đang tải file lên…'}</span></div>}
                {uploadError && <Alert type="error" showIcon message={uploadError} description={uploadSession ? 'File đã tải lên. Chọn Xác nhận lại để tiếp tục với tài liệu này.' : 'Kiểm tra kết nối rồi thử lại.'} />}
            </Form>
        </Drawer>
        <Drawer title={detail?.title || 'Chi tiết tài liệu'} width={620} open={!!selectedId} onClose={() => { setSelectedId(null); setDetail(null); setEditing(false); }} closeIcon={<Icon name="detail-imgIconReact19" />} className={adminStyles.drawer} rootClassName={adminStyles.drawerRoot}
            extra={detail && <Button icon={<Icon name="detail-imgIconReact20" />} disabled={!!pendingAction || ['UPLOADING', 'DELETING', 'DELETE_FAILED'].includes(detail.status)} onClick={() => download(detail)}>Tải file</Button>}>
            {!detail ? <Skeleton active /> : <>
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#eef1f7] p-4"><span className="text-[#6a7994]">Trạng thái: <Status value={detail.status} errorCode={detail.errorCode} /></span><Space>Cho phép AI dùng <Switch checked={detail.isActive && detail.status === 'READY'} disabled={detail.status !== 'READY' || !!pendingAction} onChange={(value) => toggle(detail, value)} aria-label="Cho phép AI dùng tài liệu" /></Space></div>
                <Descriptions className={adminStyles.descriptions} bordered size="small" column={2} items={[
                    { key: 'file', label: 'Tên file', children: detail.originalFilename }, { key: 'size', label: 'Dung lượng', children: size(detail.fileSize) },
                    { key: 'category', label: 'Danh mục', children: detail.category || '—' }, { key: 'uploader', label: 'Người tải lên', children: detail.uploader?.fullName || 'Admin' },
                    { key: 'created', label: 'Ngày tạo', children: date(detail.createdAt) }, { key: 'indexed', label: 'Index xong', children: date(detail.indexedAt) },
                    { key: 'chunks', label: 'Số chunks', children: detail.status === 'READY' ? detail.chunkCount : '—' }, { key: 'type', label: 'Định dạng', children: detail.originalFilename.split('.').at(-1).toUpperCase() },
                ]} />
                {editing ? <Form form={editForm} layout="vertical" onFinish={saveMetadata} className="mt-5">
                    <Form.Item name="title" label="Tên tài liệu" rules={[{ required: true, whitespace: true }, { max: 255 }]}><Input maxLength={255} /></Form.Item>
                    <Form.Item name="category" label="Danh mục" getValueFromEvent={(value) => value ?? null}><Select allowClear options={categories} placeholder="Chọn danh mục" /></Form.Item>
                    <Form.Item name="description" label="Mô tả"><Input.TextArea maxLength={1000} rows={4} /></Form.Item>
                    <Space><Button onClick={() => setEditing(false)}>Hủy</Button><Button htmlType="submit" type="primary" className={adminStyles.primaryButton} loading={!!pendingAction}>Lưu thay đổi</Button></Space>
                </Form> : <div className="mt-5 text-[#3a4a63] [&>div]:flex [&>div]:items-center [&>div]:justify-between [&>p]:mt-2 [&>p]:whitespace-pre-wrap [&>p]:break-words [&>p]:leading-[21px]"><div><strong>Mô tả</strong><Button size="small" type="text" icon={<EditOutlined />} disabled={busy(detail) || detail.status === 'DELETE_FAILED'} onClick={() => { editForm.setFieldsValue(detail); setEditing(true); }}>Chỉnh sửa</Button></div><p>{detail.description || 'Chưa có mô tả.'}</p></div>}
                {detail.errorMessage && <Alert type="error" showIcon message={detail.errorMessage} description={detail.errorCode === 'RAG_SOURCE_MISSING' ? 'Thử lại xử lý không thể khôi phục file đã mất. Hãy tải lại file gốc để tiếp tục.' : undefined} />}
                {['PENDING', 'PROCESSING'].includes(detail.status) && <Alert type="info" showIcon message="AI đang chuẩn bị tài liệu. Trạng thái sẽ tự cập nhật." />}
                {detail.status === 'FAILED' && <div className="mt-6 border-t border-[#eef1f7] pt-5">{detail.errorCode === 'RAG_SOURCE_MISSING'
                    ? <Button type="primary" className={adminStyles.primaryButton} icon={<Icon name="upload-imgIconReact22" />} disabled={!!pendingAction || uploading} onClick={() => openUpload(detail)}>Tải lại file gốc</Button>
                    : <Button type="primary" className={adminStyles.primaryButton} icon={<ReloadOutlined />} loading={!!pendingAction} onClick={() => retry(detail)}>Thử lại xử lý</Button>}</div>}
            </>}
        </Drawer>
    </ConfigProvider>;
}
