import { useEffect, useRef, useState } from 'react';
import { Alert, App, Badge, Button, ConfigProvider, Drawer, Empty, Flex, Form, Input, InputNumber, Pagination, Select, Space, Tag, TimePicker, Tooltip, Typography } from 'antd';
import dayjs from 'dayjs';
import { ClockCircleOutlined, CopyOutlined, DeleteOutlined, DownOutlined, EditOutlined, ExperimentOutlined, PlusOutlined, SaveOutlined, SendOutlined, UpOutlined } from '@ant-design/icons';
import { expertProductionProtocolAPI as api, expertProtocolTemplateAPI } from '../apis';
import ExpertProtocolMaterialPicker from './ExpertProtocolMaterialPicker';
import ProtocolMaterialDetail from './ProtocolMaterialDetail';
import { allowedDoseBases, DOSE_LABELS, OPERATION_COLORS, OPERATION_LABELS, PROTOCOL_PRIMARY_BUTTON, PROTOCOL_THEME, UNIT_LABELS, protocolError } from '../constants/productionProtocol';
import { cloneGroup, emptyItem, emptyMeal, emptyStage, expectedHarvestDoc, productionMaterialDoseUnit, productionMaterialOptions, protocolHarvestCoverageError, protocolPayload, protocolToForm, stageOverlapError, templateToForm } from '../utils/productionProtocolUtils';
import { getMaterialDoseUnits } from '../utils/protocolTemplateUtils';
import { expertStyle as styles } from '../constants/expertStyle';

const options = (labels) => Object.entries(labels).map(([value, label]) => ({ value, label }));
const required = [{ required: true, message: 'Vui lòng nhập trường này.' }];
const Action = ({ title, ...props }) => <Tooltip title={title}><Button size="small" type="text" shape="circle" aria-label={title} {...props} /></Tooltip>;

const ItemEditor = ({ field, index, item, prefix, offset, endDoc, environment, contentVersion, preserveProposal, farm, manufacturers, onMaterialSelected, form, products, catalog, onSearch, onPage, remove, move, count, busy }) => {
    const [picker, setPicker] = useState(false);
    const [showMaterial, setShowMaterial] = useState(false);
    const [expanded, setExpanded] = useState(() => {
        const entry = item || form.getFieldValue(prefix);
        return !entry?.productId && !entry?.recommendedProductName;
    });
    const doseBases = (operation) => allowedDoseBases(operation, (item?.firstDoc ?? offset + 1) - 1, { contentVersion, environment });
    const doseOptions = doseBases(item?.operationType).map((value) => ({ value, label: DOSE_LABELS[value] }));
    const proposed = item?.recommendedProductDetails?.proposed;
    const proposalLocked = preserveProposal && Boolean(proposed);
    const material = proposed ? { ...proposed, category: proposed.category?.toUpperCase(), unit: proposed.unit?.toUpperCase(),
        conversionUnit: proposed.conversionUnit?.toUpperCase(), manufacturerId: item?.recommendedManufacturerId ?? proposed.manufacturerId }
        : item?.materialSnapshot ? { ...item.materialSnapshot, productCompliance: item.materialSnapshot.compliance }
            : products.get(item?.productId);
    const selectedProduct = products.get(item?.productId);
    const dosingMaterial = selectedProduct
        ? { ...(item?.materialSnapshot?.id === selectedProduct.id ? item.materialSnapshot : {}), ...selectedProduct }
        : material;
    const unitOptions = contentVersion === 2 && dosingMaterial ? getMaterialDoseUnits(dosingMaterial) : options(UNIT_LABELS);
    const productOptions = productionMaterialOptions([...products.values()], { contentVersion, environment }).map(option => {
        const incompatible = proposalLocked && products.get(option.value)?.category !== proposed.category?.toUpperCase();
        return incompatible ? { ...option, disabled: true, title: 'Đề xuất đã gửi duyệt được giữ để đối chiếu. Chỉ chọn catalog cùng loại.' } : option;
    });
    return <div className={styles.item}>
        <div className={styles.itemRow}>
            <Badge className={styles.dot} color={OPERATION_COLORS[item?.operationType]} />
            <span className={styles.productAvatar}><ExperimentOutlined /></span>
            <div className={styles.itemName}><strong>{products.get(item?.productId)?.name || item?.recommendedProductName || 'Chọn vật tư / hoạt động'}</strong>
                <small>{OPERATION_LABELS[item?.operationType]}</small></div>
            <Form.Item name={[field.name, 'doseValue']} rules={required}><InputNumber size="small" stringMode min="0.0001" aria-label={`Liều hạng mục ${index + 1}`} /></Form.Item>
            <Form.Item name={[field.name, 'doseUnit']} rules={required}><Select size="small" className={styles.itemUnit} options={unitOptions} aria-label={`Đơn vị hạng mục ${index + 1}`} /></Form.Item>
            <Form.Item name={[field.name, 'doseBasis']} rules={required}><Select size="small" className={styles.itemBasis} options={doseOptions} aria-label={`Cơ sở liều hạng mục ${index + 1}`} /></Form.Item>
            <Space size={0} className={styles.actions}>
                <Action title={`Sửa chi tiết hạng mục ${index + 1}`} icon={<EditOutlined />} onClick={() => setExpanded((value) => !value)} disabled={busy} />
                <Action title={`Xóa hạng mục ${index + 1}`} danger icon={<DeleteOutlined />} onClick={() => remove(field.name)} disabled={busy} />
            </Space>
        </div>
        <Form.Item hidden name={[field.name, 'id']}><Input /></Form.Item>
        <Form.Item hidden name={[field.name, 'recommendedCategory']}><Input /></Form.Item>
        <div className={`${styles.itemAdvanced} ${!expanded ? 'hidden!' : ''}`} hidden={!expanded}>
            <Form.Item label="Hoạt động" name={[field.name, 'operationType']} rules={required}>
                <Select disabled={busy || proposalLocked} options={options(OPERATION_LABELS)} onChange={(value) => {
                    const allowed = doseBases(value);
                    if (!allowed.includes(form.getFieldValue([...prefix, 'doseBasis']))) form.setFieldValue([...prefix, 'doseBasis'], allowed[0]);
                }} /></Form.Item>
            <Form.Item label="Vật tư trang trại" name={[field.name, 'productId']}>
                <Select allowClear showSearch filterOption={false} loading={catalog.loading} options={productOptions}
                    placeholder="Chọn vật tư (tùy chọn)" onSearch={onSearch} onChange={(id) => {
                        const product = products.get(id);
                        if (product) {
                            const operationType = product.category === 'FEED' ? 'FEEDING' : product.category;
                            form.setFieldValue([...prefix, 'operationType'], operationType);
                            const allowed = doseBases(operationType);
                            if (!allowed.includes(form.getFieldValue([...prefix, 'doseBasis'])))
                                form.setFieldValue([...prefix, 'doseBasis'], allowed[0]);
                            form.setFieldValue([...prefix, 'recommendedProductName'], proposalLocked ? proposed.name : product.name);
                            form.setFieldValue([...prefix, 'doseUnit'], productionMaterialDoseUnit(product, contentVersion));
                            form.setFieldValue([...prefix, 'recommendedCategory'], product.category);
                            if (!proposalLocked) {
                                form.setFieldValue([...prefix, 'recommendedProductDetails'], null);
                                form.setFieldValue([...prefix, 'recommendedManufacturerId'], null);
                            }
                        }
                    }} popupRender={(menu) => <>{menu}<Pagination size="small" current={catalog.page} total={catalog.total} pageSize={50} showSizeChanger={false} onChange={onPage} /></>} />
            </Form.Item>
            <Form.Item label="Tên vật tư gợi ý" name={[field.name, 'recommendedProductName']}><Input disabled={Boolean(proposed)} maxLength={255} placeholder="Nhập tên nếu chưa chọn vật tư" /></Form.Item>
            {contentVersion === 2 && <>
                <Space wrap className="col-span-full">
                    <Button size="small" disabled={busy || proposalLocked} onClick={() => setPicker(true)}>Chọn vật tư / lập đề xuất đầy đủ</Button>
                    {material && <Button size="small" onClick={() => setShowMaterial(true)}>Xem hồ sơ vật tư</Button>}
                    {proposed && <Typography.Text type="secondary">{proposalLocked
                        ? 'Đề xuất đã gửi duyệt được giữ để đối chiếu. Chỉ chọn catalog cùng loại.'
                        : 'Chọn vật tư mới sẽ thay đề xuất trong bản nháp này.'}</Typography.Text>}
                </Space>
                <Form.Item label="Áp dụng từ DOC" name={[field.name, 'firstDoc']}><InputNumber min={offset + 1} max={endDoc} precision={0} placeholder={String(offset + 1)} /></Form.Item>
                <Form.Item label="Đến DOC" name={[field.name, 'lastDoc']}><InputNumber min={item?.firstDoc ?? offset + 1} max={endDoc} precision={0} placeholder={String(endDoc)} /></Form.Item>
                <Form.Item label="Tăng liều mỗi ngày" tooltip="Chỉ thức ăn liều cố định hằng ngày đến DOC 29; liều tính theo mốc liều gốc." name={[field.name, 'dailyDoseIncrement']}><InputNumber stringMode min="0" precision={4} placeholder="0" /></Form.Item>
                <Form.Item label="DOC mốc chu kỳ" name={[field.name, 'recurrenceAnchorDoc']}><InputNumber min={1} max={item?.firstDoc ?? offset + 1} precision={0} placeholder={String(item?.firstDoc ?? offset + 1)} /></Form.Item>
                <Form.Item label="DOC mốc liều gốc" name={[field.name, 'doseAnchorDoc']}><InputNumber min={1} max={item?.firstDoc ?? offset + 1} precision={0} placeholder={String(item?.firstDoc ?? offset + 1)} /></Form.Item>
            </>}
            <Form.Item label="Lặp mỗi (ngày)" name={[field.name, 'repeatIntervalDays']} rules={required}><InputNumber min={1} max={30} precision={0} /></Form.Item>
            <Form.Item label="Hướng dẫn" name={[field.name, 'instructions']}><Input.TextArea rows={2} maxLength={4000} /></Form.Item>
            <Space className={styles.actions}>
                <Action title="Đưa hạng mục lên" icon={<UpOutlined />} disabled={!index || busy} onClick={() => move(index, index - 1)} />
                <Action title="Đưa hạng mục xuống" icon={<DownOutlined />} disabled={index === count - 1 || busy} onClick={() => move(index, index + 1)} />
            </Space>
        </div>
        {picker && <ExpertProtocolMaterialPicker farm={farm} manufacturers={manufacturers} environment={environment}
            feedOnly={item?.operationType === 'FEEDING'} initialRecommendation={material && proposed ? material : undefined}
            onClose={() => setPicker(false)} onSelect={(product) => {
                const operationType = product.category === 'FEED' ? 'FEEDING' : product.category;
                form.setFieldValue([...prefix, 'productId'], product.id ?? null);
                form.setFieldValue([...prefix, 'recommendedProductName'], product.name);
                form.setFieldValue([...prefix, 'recommendedCategory'], product.category);
                form.setFieldValue([...prefix, 'operationType'], operationType);
                const allowed = doseBases(operationType);
                if (!allowed.includes(item?.doseBasis)) form.setFieldValue([...prefix, 'doseBasis'], allowed[0]);
                form.setFieldValue([...prefix, 'doseUnit'], productionMaterialDoseUnit(product, contentVersion));
                form.setFieldValue([...prefix, 'recommendedProductDetails'], product.id ? null : { proposed: product });
                form.setFieldValue([...prefix, 'recommendedManufacturerId'], product.id ? null : product.manufacturerId ?? null);
                onMaterialSelected(product); setPicker(false);
            }} />}
        {showMaterial && material && <ProtocolMaterialDetail product={material} manufacturers={manufacturers} onClose={() => setShowMaterial(false)} />}
    </div>;
};

const ExpertProductionProtocolForm = ({ seasonId, season, detail, onClose, onSaved, onReload }) => {
    const [form] = Form.useForm();
    const { modal, message } = App.useApp();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    const [conflict, setConflict] = useState(false);
    const [search, setSearch] = useState('');
    const [productPage, setProductPage] = useState(1);
    const [catalog, setCatalog] = useState({ rows: [], cache: [], total: 0, loading: false, error: null });
    const [catalogRetry, setCatalogRetry] = useState(0);
    const [templates, setTemplates] = useState({ rows: [], loading: true });
    const [templateSearch, setTemplateSearch] = useState('');
    const [templatePage, setTemplatePage] = useState(1);
    const [templateId, setTemplateId] = useState(detail?.sourceTemplateId || null);
    const [templateLoading, setTemplateLoading] = useState(false);
    const [templateVersionNo, setTemplateVersionNo] = useState(detail?.sourceTemplateVersionNo);
    const [referencePostCount, setReferencePostCount] = useState(detail?.sourceTemplateSnapshot?.referencePostCount);
    const [materialOptions, setMaterialOptions] = useState({ manufacturers: [] });
    const [materialRetry, setMaterialRetry] = useState(0);
    const locked = busy || templateLoading;
    const [templateRetry, setTemplateRetry] = useState(0);
    const dirty = useRef(false);
    const saving = useRef(false);
    const mounted = useRef(true);
    const templateRequest = useRef(null);
    const stages = Form.useWatch('stages', form) || [];
    const overlapError = stageOverlapError(stages);
    const minimumEndDoc = expectedHarvestDoc(season);
    const harvestError = protocolHarvestCoverageError(stages, season);
    const initial = protocolToForm(detail);
    if (!detail) initial.contentVersion = season.authoringVersion ?? 1;
    const contentVersion = Form.useWatch('contentVersion', form) ?? initial.contentVersion;
    const itemCount = stages.reduce((sum, stage) => sum + (stage?.meals || []).reduce((n, meal) => n + (meal?.items?.length || 0), 0), 0);

    useEffect(() => { mounted.current = true; return () => { mounted.current = false; templateRequest.current?.abort(); }; }, []);
    useEffect(() => {
        if (contentVersion !== 2) return;
        const controller = new AbortController();
        expertProtocolTemplateAPI.getCreationOptions(controller.signal)
            .then(value => { if (!controller.signal.aborted) setMaterialOptions(value); })
            .catch(err => { if (!controller.signal.aborted) setMaterialOptions({ manufacturers: [], error: protocolError(err) }); });
        return () => controller.abort();
    }, [contentVersion, materialRetry]);
    useEffect(() => {
        const controller = new AbortController();
        const timer = setTimeout(() => {
            setCatalog((current) => ({ ...current, loading: true, error: null }));
            api.products(seasonId, { search, page: productPage, limit: 50 }, controller.signal)
                .then((response) => { if (!controller.signal.aborted) setCatalog((current) => ({ rows: response.data.data,
                    cache: [...new Map([...current.cache, ...response.data.data].map((product) => [product.id, product])).values()],
                    total: response.data.meta.totalResults, loading: false, error: null })); })
                .catch((err) => { if (!controller.signal.aborted) setCatalog((current) => ({ ...current, loading: false, error: protocolError(err) })); });
        }, 250);
        return () => { clearTimeout(timer); controller.abort(); };
    }, [seasonId, search, productPage, catalogRetry]);
    useEffect(() => {
        const controller = new AbortController();
        const timer = setTimeout(() => {
            setTemplates((value) => ({ ...value, loading: true, error: null }));
            api.templates(seasonId, { search: templateSearch, page: templatePage, limit: 50 }, controller.signal)
                .then((response) => { if (!controller.signal.aborted) setTemplates({ rows: response.data.data, total: response.data.meta.totalResults, applicationMessage: response.data.meta.applicationMessage, loading: false }); })
                .catch((err) => { if (!controller.signal.aborted) setTemplates((value) => ({ ...value, loading: false, error: protocolError(err) })); });
        }, 250);
        return () => { clearTimeout(timer); controller.abort(); };
    }, [seasonId, templateSearch, templatePage, templateRetry]);

    const existingProducts = initial.stages.flatMap((stage) => stage.meals.flatMap((meal) => meal.items.map((item) => item.product))).filter(Boolean);
    const selectedIds = new Set(stages.flatMap((stage) => (stage?.meals || []).flatMap((meal) => (meal?.items || []).map((item) => item.productId))).filter(Boolean));
    const products = new Map([...existingProducts, ...catalog.cache.filter((product) => selectedIds.has(product.id)), ...catalog.rows].map((product) => [product.id, product]));
    const requestClose = () => {
        if (saving.current || locked) return;
        if (!dirty.current) return onClose();
        modal.confirm({ title: 'Bỏ các thay đổi chưa lưu?', content: 'Nội dung đã chỉnh sửa sẽ không được lưu.',
            okText: 'Bỏ thay đổi', cancelText: 'Tiếp tục sửa', onOk: onClose });
    };
    const loadTemplate = (id) => {
        if (!id) { setTemplateId(null); setTemplateVersionNo(undefined); setReferencePostCount(undefined); dirty.current = true; return; }
        const load = async () => {
            templateRequest.current?.abort();
            const controller = new AbortController();
            templateRequest.current = controller;
            setTemplateLoading(true); setError(null);
            try {
                const response = await api.templateDetail(seasonId, id, controller.signal);
                if (controller.signal.aborted || !mounted.current) return;
                const values = templateToForm(response.data.data, form.getFieldValue('title'));
                // Template content has no persistent protocol/item IDs.
                const { stages: templateStages, ...headers } = values;
                form.setFieldsValue(headers);
                form.setFieldValue('stages', templateStages);
                setTemplateId(id); dirty.current = true;
                setTemplateVersionNo(response.data.data.templateVersionNo);
                setReferencePostCount(response.data.data.referencePostCount);
            } catch (err) { if (!controller.signal.aborted && mounted.current) setError(protocolError(err)); }
            finally { if (!controller.signal.aborted && mounted.current) setTemplateLoading(false); }
        };
        if (dirty.current || itemCount) modal.confirm({ title: 'Nạp nội dung từ phác đồ mẫu?', content: 'Các giai đoạn và hạng mục đang soạn sẽ được thay bằng nội dung mẫu.', okText: 'Nạp mẫu', cancelText: 'Quay lại', onOk: load });
        else load();
    };
    const save = async (submitForApproval = false) => {
        if (saving.current || templateLoading) return;
        saving.current = true; setBusy(true); setError(null); setConflict(false);
        try {
            await form.validateFields();
            const body = { ...protocolPayload(form.getFieldsValue(true), detail?.revision, season), templateId,
                ...(templateId && templateVersionNo != null && { templateVersionNo }), submitForApproval };
            const response = detail ? await api.update(seasonId, detail.id, body) : await api.create(seasonId, body);
            if (!mounted.current) return;
            dirty.current = false; message.success(response.data.message); onSaved(response.data.data);
        } catch (err) {
            if (!mounted.current) return;
            if (err.errorFields?.length) form.scrollToField(err.errorFields[0].name, { focus: true });
            else { setError(protocolError(err)); setConflict(err.response?.status === 409); }
        } finally { saving.current = false; if (mounted.current) setBusy(false); }
    };
    const reload = () => modal.confirm({ title: 'Tải dữ liệu mới nhất?', content: 'Các thay đổi chưa lưu trong form sẽ bị bỏ.', okText: 'Tải lại', cancelText: 'Tiếp tục sửa', onOk: () => onReload(detail?.id) });

    return <ConfigProvider theme={PROTOCOL_THEME}><Drawer open width={1080} className={styles.drawer} title={<>
        <div>{detail ? `Chỉnh sửa phác đồ nuôi · v${detail.versionNo}` : 'Soạn phác đồ nuôi'}</div>
        <Typography.Text type="secondary" className="text-xs! font-normal!">{season.name} · Ao {season.pond.name} · {Number(season.pond.volumeM3 || 0).toLocaleString('vi-VN')} m³</Typography.Text>
    </>} onClose={requestClose} maskClosable={!locked} closable={!locked} keyboard={!locked}
        footer={<Flex justify="space-between" align="center" wrap gap={12}>
            <Space size={16} className="text-xs! text-[#6a7994]!"><span>{stages.length} giai đoạn</span><span>{itemCount} hạng mục</span></Space>
            <Space wrap><Button disabled={locked} onClick={requestClose}>Hủy</Button>
                <Button icon={<SaveOutlined />} loading={busy} disabled={locked || Boolean(overlapError || harvestError)} onClick={() => save(false)}>Lưu nháp</Button>
                <Button type="primary" className={PROTOCOL_PRIMARY_BUTTON} icon={<SendOutlined />} loading={busy} disabled={locked || Boolean(overlapError || harvestError)} onClick={() => save(true)}>Lưu & gửi duyệt</Button></Space>
        </Flex>}>
        {error && <Alert className="mb-4!" type="error" showIcon message={error} action={conflict && <Button size="small" onClick={reload}>Tải dữ liệu mới</Button>} />}
        {catalog.error && <Alert className="mb-4!" type="warning" message={catalog.error} action={<Button size="small" onClick={() => setCatalogRetry((value) => value + 1)}>Tải lại vật tư</Button>} />}
        {materialOptions.error && <Alert className="mb-4!" type="warning" message={materialOptions.error} action={<Button size="small" onClick={() => setMaterialRetry(value => value + 1)}>Tải lại nhà sản xuất</Button>} />}
        <Form form={form} layout="vertical" initialValues={initial} disabled={locked} onValuesChange={() => { dirty.current = true; }}>
            <div className={styles.formTop}>
                <Form.Item label="Tên phác đồ" name="title" rules={required}><Input maxLength={500} placeholder="VD: Phác đồ nuôi A1 — v1" autoFocus /></Form.Item>
                <Form.Item label="Sai lệch cho phép (%)" tooltip="Mức sai lệch liều lượng mà kỹ thuật viên được cho phép so với phác đồ." name="allowedVariancePct" rules={required}><InputNumber stringMode min="0" max="100" className="w-full!" /></Form.Item>
                <div className={styles.rollingInfo}><Typography.Paragraph>Lịch cuộn do hệ thống quản lý</Typography.Paragraph><Typography.Text className="text-xs!">Sau khi chủ trại duyệt, hệ thống sinh lịch cho KTV và kiểm tra dữ liệu đầu vào; không giữ chỗ hay trừ kho trước.</Typography.Text></div>
            </div>
            <div className={styles.formSecondary}>
                <Form.Item label="Nạp từ phác đồ mẫu (tùy chọn)" tooltip="Chỉ hiện mẫu của trang trại này và đúng loài tôm" extra={templates.applicationMessage}><Select showSearch allowClear filterOption={false} value={templateId || undefined}
                    loading={templates.loading || templateLoading} placeholder="Chọn mẫu để điền nhanh" options={templates.rows.map((row) => ({ value: row.id, label: row.title, title: row.applicationMessage || undefined, disabled: row.canApply === false }))}
                    onSearch={(value) => { setTemplateSearch(value); setTemplatePage(1); }} onChange={loadTemplate}
                    popupRender={(menu) => <>{menu}<Pagination size="small" current={templatePage} total={templates.total || 0} pageSize={50} showSizeChanger={false} onChange={setTemplatePage} /></>} />
                    {templates.error && <Typography.Text type="danger">{templates.error} <Button type="link" size="small" onClick={() => setTemplateRetry((value) => value + 1)}>Thử lại</Button></Typography.Text>}
                </Form.Item>
                <Form.Item label="Ghi chú cho chủ trại (tùy chọn)" name="summary"><Input maxLength={4000} placeholder="Mục tiêu, lý do điều chỉnh…" /></Form.Item>
            </div>
            <Form.Item hidden name="rollingWindowDays"><InputNumber /></Form.Item>
            <Form.Item hidden name="contentVersion"><InputNumber /></Form.Item>
            {contentVersion === 1 && season.authoringVersion === 2 && <Button className="mb-4!" onClick={() => {
                form.setFieldValue('contentVersion', 2); dirty.current = true;
            }}>Bổ sung hồ sơ vật tư và ngày áp dụng riêng</Button>}
            {referencePostCount != null && <Alert className="mb-4!" type="info" showIcon message={`Mẫu tham chiếu ${Number(referencePostCount).toLocaleString('vi-VN')} post · Vụ thả ${season.initialQuantity == null ? 'chưa xác định' : Number(season.initialQuantity).toLocaleString('vi-VN')} con.`}
                description="Liều được giữ nguyên khi nạp mẫu. Hãy đối chiếu quy mô và chỉnh từng liều trước khi gửi duyệt; hệ thống không tự nhân liều theo post." />}
            {season.approvedProductionProtocol && <Alert type="info" showIcon className="mb-4! rounded-[14px]!" message="Phiên bản này sẽ thay thế phác đồ đang áp dụng khi được duyệt." />}
            {minimumEndDoc != null && <Alert type={harvestError && stages.length ? 'error' : 'info'} showIcon className="mb-4!"
                message={harvestError || `Phác đồ đã đạt mốc dự kiến thu hoạch của vụ nuôi: DOC ${minimumEndDoc}.`} />}
            {overlapError && <Alert type="error" showIcon role="alert" className="mb-4!" message={overlapError} />}
            <Form.List name="stages">{(stageFields, stageActions) => <>
                {!stageFields.length && <div className={`${styles.formEmpty} mb-4`}><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có giai đoạn nào" /></div>}
                {stageFields.map((stageField, stageIndex) => <section key={stageField.key} className={styles.stage}>
                    <div className={styles.stageHeading}><strong>Giai đoạn {stageIndex + 1}</strong>
                        <Space size={6}><span className="text-xs">DOC</span>
                            <Form.Item name={[stageField.name, 'startDoc']} rules={required}><InputNumber size="small" min={1} precision={0} aria-label="DOC bắt đầu" /></Form.Item><span>→</span>
                            <Form.Item name={[stageField.name, 'endDoc']} rules={required}><InputNumber size="small" min={1} precision={0} aria-label="DOC kết thúc" /></Form.Item>
                            <span className="text-xs text-[#6a7994]">({Math.max(0, (stages[stageIndex]?.endDoc || 0) - (stages[stageIndex]?.startDoc || 0) + 1)} ngày)</span></Space>
                        <Tag className="rounded-full! border-0! text-[10px]!">{stages[stageIndex]?.meals?.filter((meal) => meal.mealNumber != null).length || 0} cữ/ngày</Tag>
                        <Space size={0} className={styles.actions}>
                            <Action title="Đưa giai đoạn lên" icon={<UpOutlined />} disabled={!stageIndex || locked} onClick={() => stageActions.move(stageIndex, stageIndex - 1)} />
                            <Action title="Đưa giai đoạn xuống" icon={<DownOutlined />} disabled={stageIndex === stageFields.length - 1 || locked} onClick={() => stageActions.move(stageIndex, stageIndex + 1)} />
                            <Action title="Thêm cữ vào giai đoạn" icon={<PlusOutlined />} disabled={locked} onClick={() => { const path = ['stages', stageField.name, 'meals']; const meals = form.getFieldValue(path) || []; form.setFieldValue(path, [...meals, emptyMeal(meals.filter((meal) => meal.mealNumber != null).length)]); dirty.current = true; }} />
                            <Action title="Nhân bản giai đoạn" icon={<CopyOutlined />} disabled={locked} onClick={() => stageActions.add(cloneGroup(form.getFieldValue(['stages', stageField.name])), stageIndex + 1)} />
                            <Action title="Xóa giai đoạn" danger icon={<DeleteOutlined />} disabled={locked} onClick={() => stageActions.remove(stageField.name)} />
                        </Space>
                    </div>
                    <Form.Item hidden name={[stageField.name, 'id']}><Input /></Form.Item>
                    <Form.List name={[stageField.name, 'meals']}>{(mealFields, mealActions) => <>
                        {mealFields.map((mealField, mealIndex) => {
                            const meal = stages[stageIndex]?.meals?.[mealIndex];
                            return <div key={mealField.key} className={`${styles.meal} ${meal?.mealNumber == null ? styles.environment : ''}`}>
                                <div className={styles.mealSide}>
                                    <Typography.Text strong className={meal?.mealNumber == null ? styles.environmentLabel : 'text-xs!'}>{meal?.mealNumber == null ? 'Môi trường' : `Cữ ${meal.mealNumber}`}</Typography.Text>
                                    <Form.Item name={[mealField.name, 'plannedTime']}
                                        getValueProps={(value) => ({ value: value ? dayjs(`1970-01-01T${value}`) : null })}
                                        getValueFromEvent={(value) => value ? value.format('HH:mm') : null}>
                                        <TimePicker size="small" format="HH:mm" placeholder="HH:mm" needConfirm={false}
                                            showNow={false} allowClear suffixIcon={<ClockCircleOutlined className="text-[#b8c2d2]" />}
                                            aria-label={`Giờ thực hiện giai đoạn ${stageIndex + 1}, ${meal?.mealNumber == null ? 'xử lý môi trường' : `cữ ${meal.mealNumber}`}`} />
                                    </Form.Item>
                                    <Form.Item name={[mealField.name, 'mealNumber']}><InputNumber size="small" min={1} max={32767} precision={0} placeholder="Ngoài cữ" aria-label="Số cữ (trống: môi trường)" /></Form.Item>
                                    <Form.Item hidden name={[mealField.name, 'id']}><Input /></Form.Item>
                                </div>
                                <div><Form.List name={[mealField.name, 'items']}>{(fields, actions) => <>
                                    {fields.map((field, index) => <ItemEditor key={field.key} field={field} index={index} item={meal?.items?.[field.name]}
                                        prefix={['stages', stageField.name, 'meals', mealField.name, 'items', field.name]} offset={(stages[stageIndex]?.startDoc || 1) - 1}
                                        endDoc={stages[stageIndex]?.endDoc} environment={meal?.mealNumber == null} contentVersion={contentVersion}
                                        preserveProposal={Boolean(detail?.submittedAt) || detail?.status === 'REJECTED'}
                                        farm={season.pond.farm} manufacturers={materialOptions.manufacturers ?? []}
                                        onMaterialSelected={product => { dirty.current = true; if (product.id) setCatalog(current => ({ ...current, cache: [...current.cache.filter(row => row.id !== product.id), product] })); }}
                                        form={form} products={products} catalog={{ ...catalog, page: productPage }}
                                        onSearch={(value) => { setSearch(value); setProductPage(1); }} onPage={setProductPage} remove={actions.remove} move={actions.move} count={fields.length} busy={locked} />)}
                                    <Button type="link" size="small" icon={<PlusOutlined />} onClick={() => actions.add({ ...emptyItem(), operationType: meal?.mealNumber == null ? 'CHEMICAL' : fields.length ? 'MEDICINE' : 'FEEDING' })}>
                                        {meal?.mealNumber == null ? 'Thêm xử lý môi trường' : 'Thêm thức ăn / thuốc / bổ sung'}</Button>
                                </>}</Form.List></div>
                                <Space wrap size={0} className={styles.actions}>
                                    <Action title="Đưa cữ lên" icon={<UpOutlined />} disabled={!mealIndex || locked} onClick={() => mealActions.move(mealIndex, mealIndex - 1)} />
                                    <Action title="Đưa cữ xuống" icon={<DownOutlined />} disabled={mealIndex === mealFields.length - 1 || locked} onClick={() => mealActions.move(mealIndex, mealIndex + 1)} />
                                    <Action title="Nhân bản cữ" icon={<CopyOutlined />} disabled={locked} onClick={() => mealActions.add(cloneGroup(form.getFieldValue(['stages', stageField.name, 'meals', mealField.name])), mealIndex + 1)} />
                                    <Action title="Xóa cữ" danger icon={<DeleteOutlined />} disabled={locked} onClick={() => mealActions.remove(mealField.name)} />
                                </Space>
                            </div>;
                        })}
                        <Flex wrap gap={8} className="px-4 py-2"><Button size="small" type="link" icon={<PlusOutlined />} onClick={() => mealActions.add(emptyMeal(mealFields.length))}>Thêm cữ</Button>
                            <Button size="small" type="link" className="text-[#0f9b8e]!" icon={<PlusOutlined />} onClick={() => mealActions.add({ ...emptyMeal(), mealNumber: null })}>Thêm xử lý môi trường · không theo cữ</Button></Flex>
                    </>}</Form.List>
                </section>)}
                <Button type="dashed" className={styles.addStage} icon={<PlusOutlined />} onClick={() => stageActions.add(emptyStage())}>Thêm giai đoạn</Button>
            </>}</Form.List>
        </Form>
    </Drawer></ConfigProvider>;
};

export default ExpertProductionProtocolForm;
