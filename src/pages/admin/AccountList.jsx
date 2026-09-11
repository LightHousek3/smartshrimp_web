import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    App,
    Avatar,
    Badge,
    Button,
    Descriptions,
    Divider,
    Drawer,
    Empty,
    Flex,
    Form,
    Input,
    Modal,
    Radio,
    Select,
    Skeleton,
    Space,
    Table,
    Tag,
    Typography,
} from 'antd';
import {
    PlusOutlined,
    ReloadOutlined,
    SearchOutlined,
    SendOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { adminAccountAPI } from '../../apis';
import { formatDate } from '../../utils/dateUtils';

const { Text, Title } = Typography;

const PAGE_SIZE = 10;

const ACCOUNT_ROLES = Object.freeze({
    ADMIN: 'ADMIN',
    FARM_OWNER: 'FARM_OWNER',
    TECHNICIAN: 'TECHNICIAN',
    EXPERT: 'EXPERT',
});

const ACCOUNT_STATUSES = Object.freeze({
    PENDING_ACTIVATION: 'PENDING_ACTIVATION',
    ACTIVE: 'ACTIVE',
    INACTIVE: 'INACTIVE',
    BLOCKED: 'BLOCKED',
});

const ROLE_LABELS = Object.freeze({
    [ACCOUNT_ROLES.ADMIN]: 'Quản trị viên',
    [ACCOUNT_ROLES.FARM_OWNER]: 'Chủ trang trại',
    [ACCOUNT_ROLES.TECHNICIAN]: 'Kỹ thuật viên',
    [ACCOUNT_ROLES.EXPERT]: 'Chuyên gia',
});

const STATUS_LABELS = Object.freeze({
    [ACCOUNT_STATUSES.PENDING_ACTIVATION]: 'Chờ kích hoạt',
    [ACCOUNT_STATUSES.ACTIVE]: 'Hoạt động',
    [ACCOUNT_STATUSES.INACTIVE]: 'Không hoạt động',
    [ACCOUNT_STATUSES.BLOCKED]: 'Đã khóa',
});

const ROLE_COLORS = Object.freeze({
    [ACCOUNT_ROLES.ADMIN]: 'geekblue',
    [ACCOUNT_ROLES.FARM_OWNER]: 'purple',
    [ACCOUNT_ROLES.TECHNICIAN]: 'blue',
    [ACCOUNT_ROLES.EXPERT]: 'cyan',
});

const STATUS_COLORS = Object.freeze({
    [ACCOUNT_STATUSES.PENDING_ACTIVATION]: 'warning',
    [ACCOUNT_STATUSES.ACTIVE]: 'success',
    [ACCOUNT_STATUSES.INACTIVE]: 'default',
    [ACCOUNT_STATUSES.BLOCKED]: 'error',
});

const NEXT_STATUSES = Object.freeze({
    [ACCOUNT_STATUSES.ACTIVE]: [ACCOUNT_STATUSES.INACTIVE, ACCOUNT_STATUSES.BLOCKED],
    [ACCOUNT_STATUSES.INACTIVE]: [ACCOUNT_STATUSES.ACTIVE, ACCOUNT_STATUSES.BLOCKED],
    [ACCOUNT_STATUSES.BLOCKED]: [ACCOUNT_STATUSES.ACTIVE, ACCOUNT_STATUSES.INACTIVE],
});

const CREATABLE_ROLE_OPTIONS = [
    { value: ACCOUNT_ROLES.FARM_OWNER, label: ROLE_LABELS[ACCOUNT_ROLES.FARM_OWNER] },
    { value: ACCOUNT_ROLES.TECHNICIAN, label: ROLE_LABELS[ACCOUNT_ROLES.TECHNICIAN] },
    { value: ACCOUNT_ROLES.EXPERT, label: ROLE_LABELS[ACCOUNT_ROLES.EXPERT] },
];

const ROLE_FILTER_OPTIONS = [
    { value: '', label: 'Tất cả vai trò' },
    ...CREATABLE_ROLE_OPTIONS,
];

const STATUS_FILTER_OPTIONS = [
    { value: '', label: 'Tất cả trạng thái' },
    ...[
        ACCOUNT_STATUSES.ACTIVE,
        ACCOUNT_STATUSES.PENDING_ACTIVATION,
        ACCOUNT_STATUSES.INACTIVE,
        ACCOUNT_STATUSES.BLOCKED,
    ].map((status) => ({
        value: status,
        label: STATUS_LABELS[status],
    })),
];

const TABLE_FILTER_DROPDOWN_PROPS = {
    rootClassName: 'account-table-filter-dropdown',
};

const isManagedStaffRole = (role) =>
    role === ACCOUNT_ROLES.TECHNICIAN || role === ACCOUNT_ROLES.EXPERT;

const getInitial = (account) => {
    const source = account?.fullName?.trim().split(/\s+/).pop() || account?.email || '?';
    return source.charAt(0).toUpperCase();
};

const formatDateTime = (value) => (value ? formatDate(value, 'HH:mm dd/MM/yyyy') || '—' : '—');

const API_ERROR_MESSAGES = Object.freeze({
    'Email is already in use': 'Email này đã được sử dụng.',
    'Managing owner must be a farm owner': 'Chủ quản phải là tài khoản Chủ trang trại.',
    'Managing owner must be active': 'Chủ quản phải đang ở trạng thái hoạt động.',
    'Account not found': 'Không tìm thấy tài khoản.',
    'Please wait before resending the activation email':
        'Vui lòng đợi trước khi gửi lại email kích hoạt.',
    'Only pending accounts can receive an activation email':
        'Chỉ tài khoản chờ kích hoạt mới có thể nhận email này.',
    'Unable to send the activation email': 'Không thể gửi email kích hoạt lúc này.',
    'New status must be different from the current status':
        'Trạng thái mới phải khác trạng thái hiện tại.',
    'Pending accounts must be activated through email verification':
        'Tài khoản chờ kích hoạt phải được kích hoạt qua email.',
    'Admin account status cannot be changed here': 'Không thể đổi trạng thái tài khoản Admin.',
    'Assigned staff must be replaced before deactivation':
        'Nhân sự đang được phân công phải được thay thế trước khi vô hiệu hóa.',
    'Owner staff must be disabled or transferred before deactivation':
        'Cần vô hiệu hóa hoặc chuyển nhân sự của chủ trại trước.',
    'Owner with an open season cannot be deactivated':
        'Không thể vô hiệu hóa chủ trại đang có vụ nuôi mở.',
});

const getErrorMessage = (error, fallback) => {
    const apiMessage = error?.response?.data?.message;
    return API_ERROR_MESSAGES[apiMessage] || apiMessage || error?.message || fallback;
};

const RoleTag = ({ role }) => (
    <Tag className="account-tag" color={ROLE_COLORS[role] || 'default'}>
        {ROLE_LABELS[role] || role}
    </Tag>
);

const StatusTag = ({ status }) => (
    <Tag className="account-tag" color={STATUS_COLORS[status] || 'default'}>
        {STATUS_LABELS[status] || status}
    </Tag>
);

const AccountDetailDrawer = ({ accountId, open, onClose, onStatusChange }) => {
    const { message } = App.useApp();
    const [account, setAccount] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [resending, setResending] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);

    const loadAccount = useCallback(async () => {
        if (!accountId) return;

        setLoading(true);
        setError('');

        try {
            const response = await adminAccountAPI.getAccount(accountId);
            setAccount(response.data?.data || null);
        } catch (requestError) {
            setAccount(null);
            setError(getErrorMessage(requestError, 'Không thể tải chi tiết tài khoản.'));
        } finally {
            setLoading(false);
        }
    }, [accountId]);

    useEffect(() => {
        if (!open) return undefined;

        const timeoutId = window.setTimeout(loadAccount, 0);
        return () => window.clearTimeout(timeoutId);
    }, [loadAccount, open]);

    useEffect(() => {
        if (resendCooldown <= 0) return undefined;

        const intervalId = window.setInterval(
            () => setResendCooldown((seconds) => Math.max(0, seconds - 1)),
            1000,
        );
        return () => window.clearInterval(intervalId);
    }, [resendCooldown]);

    const handleResendActivation = async () => {
        if (!account || resending || resendCooldown > 0) return;

        setResending(true);
        try {
            const response = await adminAccountAPI.resendActivation(account.id);
            const availableAt = response.data?.data?.resendAvailableAt;
            const seconds = availableAt
                ? Math.max(1, Math.ceil(dayjs(availableAt).diff(dayjs(), 'second', true)))
                : 60;
            setResendCooldown(seconds);
            message.success('Đã gửi lại email kích hoạt.');
        } catch (requestError) {
            message.error(getErrorMessage(requestError, 'Không thể gửi lại email kích hoạt.'));
        } finally {
            setResending(false);
        }
    };

    const drawerTitle = account ? (
        <Flex align="center" gap={12} className="account-drawer-title">
            <Avatar className="account-avatar-small" size={40} src={account.avatarUrl || undefined}>
                {getInitial(account)}
            </Avatar>
            <div className="account-drawer-heading">
                <Text strong className={!account.fullName ? 'pending-account-name' : ''}>
                    {account.fullName || 'Chưa kích hoạt'}
                </Text>
                <Space size={4} wrap>
                    <RoleTag role={account.role} />
                    <StatusTag status={account.status} />
                </Space>
            </div>
        </Flex>
    ) : (
        'Chi tiết tài khoản'
    );

    return (
        <Drawer
            className="account-detail-drawer"
            title={drawerTitle}
            open={open}
            onClose={onClose}
            width={440}
            destroyOnClose
            footer={
                account &&
                account.role !== ACCOUNT_ROLES.ADMIN &&
                account.status !== ACCOUNT_STATUSES.PENDING_ACTIVATION ? (
                    <Button block onClick={() => onStatusChange(account)}>
                        Thay đổi trạng thái tài khoản
                    </Button>
                ) : null
            }
        >
            {loading && <Skeleton active paragraph={{ rows: 7 }} />}

            {!loading && error && (
                <Alert
                    type="error"
                    showIcon
                    message={error}
                    action={
                        <Button size="small" icon={<ReloadOutlined />} onClick={loadAccount}>
                            Thử lại
                        </Button>
                    }
                />
            )}

            {!loading && !error && account && (
                <>
                    <div className="account-email-block">
                        <Text type="secondary">Email</Text>
                        <Text className="account-email" copyable>
                            {account.email}
                        </Text>
                    </div>

                    <Descriptions className="account-descriptions" column={1} size="small" colon={false}>
                        <Descriptions.Item label="ID">{account.id}</Descriptions.Item>
                        <Descriptions.Item label="Số điện thoại">
                            {account.phone || '—'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Chủ quản">
                            {account.managedByOwner?.fullName ||
                                account.managedByOwner?.email ||
                                '—'}
                        </Descriptions.Item>
                        {account.role === ACCOUNT_ROLES.FARM_OWNER && (
                            <Descriptions.Item label="Nhân sự quản lý">
                                {account.managedStaffCount ?? 0} tài khoản
                            </Descriptions.Item>
                        )}
                        <Descriptions.Item label="Ngày tạo">
                            {formatDateTime(account.createdAt)}
                        </Descriptions.Item>
                        <Descriptions.Item label="Kích hoạt lúc">
                            {formatDateTime(account.activatedAt)}
                        </Descriptions.Item>
                        <Descriptions.Item label="Đăng nhập gần nhất">
                            {formatDateTime(account.lastLoginAt)}
                        </Descriptions.Item>
                    </Descriptions>

                    {account.statusReason && (
                        <Alert
                            className="account-status-reason"
                            type={account.status === ACCOUNT_STATUSES.BLOCKED ? 'error' : 'info'}
                            showIcon
                            message="Lý do thay đổi trạng thái"
                            description={account.statusReason}
                        />
                    )}

                    {account.status === ACCOUNT_STATUSES.PENDING_ACTIVATION && (
                        <>
                            <Divider className="account-drawer-divider" />
                            <div className="activation-resend-panel">
                                <Text type="secondary">
                                    Tài khoản đang chờ kích hoạt. Gửi lại lời mời nếu người dùng
                                    chưa nhận được email.
                                </Text>
                                <Button
                                    className="account-primary-button"
                                    type="primary"
                                    block
                                    icon={
                                        resendCooldown > 0 ? <ReloadOutlined /> : <SendOutlined />
                                    }
                                    loading={resending}
                                    disabled={resendCooldown > 0}
                                    onClick={handleResendActivation}
                                >
                                    {resendCooldown > 0
                                        ? `Gửi lại sau ${resendCooldown}s`
                                        : 'Gửi lại email kích hoạt'}
                                </Button>
                            </div>
                        </>
                    )}
                </>
            )}
        </Drawer>
    );
};

const ChangeStatusModal = ({ account, open, onClose, onChanged }) => {
    const [form] = Form.useForm();
    const { message } = App.useApp();
    const [submitting, setSubmitting] = useState(false);
    const selectedStatus = Form.useWatch('status', form);
    const options = account ? NEXT_STATUSES[account.status] || [] : [];

    const handleClose = () => {
        if (submitting) return;
        form.resetFields();
        onClose();
    };

    const handleSubmit = async () => {
        if (!account) return;

        try {
            const values = await form.validateFields();
            setSubmitting(true);
            const response = await adminAccountAPI.updateStatus(account.id, {
                status: values.status,
                reason: values.reason.trim(),
            });
            message.success('Đã thay đổi trạng thái tài khoản.');
            form.resetFields();
            onClose();
            onChanged(response.data?.data);
        } catch (requestError) {
            if (!requestError?.errorFields) {
                message.error(getErrorMessage(requestError, 'Không thể thay đổi trạng thái.'));
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal
            className="change-status-modal"
            title="Thay đổi trạng thái tài khoản"
            open={open}
            onCancel={handleClose}
            width={470}
            centered
            maskClosable={!submitting}
            footer={
                <Flex justify="flex-end" gap={8}>
                    <Button onClick={handleClose} disabled={submitting}>
                        Hủy
                    </Button>
                    <Button
                        className="account-primary-button"
                        type="primary"
                        loading={submitting}
                        onClick={handleSubmit}
                    >
                        Xác nhận
                    </Button>
                </Flex>
            }
        >
            {account && (
                <>
                    <div className="status-account-summary">
                        <div>
                            <Text type="secondary">Tài khoản: </Text>
                            <Text strong>{account.fullName || account.email}</Text>
                        </div>
                        <Flex align="center" gap={7}>
                            <StatusTag status={account.status} />
                            <Text type="secondary">→</Text>
                            {selectedStatus && <StatusTag status={selectedStatus} />}
                        </Flex>
                    </div>

                    <Form
                        form={form}
                        layout="vertical"
                        initialValues={{ status: options[0] }}
                        className="change-status-form"
                    >
                        <Form.Item
                            name="status"
                            label="Trạng thái mới"
                            rules={[{ required: true, message: 'Vui lòng chọn trạng thái mới.' }]}
                        >
                            <Radio.Group className="status-radio-group">
                                {options.map((nextStatus) => (
                                    <Radio
                                        className="status-radio-option"
                                        key={nextStatus}
                                        value={nextStatus}
                                    >
                                        <StatusTag status={nextStatus} />
                                        <Text type="secondary">
                                            {STATUS_LABELS[nextStatus]}
                                        </Text>
                                    </Radio>
                                ))}
                            </Radio.Group>
                        </Form.Item>
                        <Form.Item
                            name="reason"
                            className="change-status-reason-item"
                            label="Lý do thay đổi"
                            rules={[
                                { required: true, whitespace: true, message: 'Vui lòng nhập lý do.' },
                                { min: 5, message: 'Lý do cần có ít nhất 5 ký tự.' },
                                { max: 500, message: 'Lý do không được vượt quá 500 ký tự.' },
                            ]}
                        >
                            <Input.TextArea
                                rows={3}
                                showCount
                                maxLength={500}
                                placeholder="Nhập lý do thay đổi trạng thái"
                            />
                        </Form.Item>
                    </Form>
                </>
            )}
        </Modal>
    );
};

const CreateAccountModal = ({ open, onClose, onCreated }) => {
    const [form] = Form.useForm();
    const { message } = App.useApp();
    const selectedRole = Form.useWatch('role', form);
    const [submitting, setSubmitting] = useState(false);
    const [owners, setOwners] = useState([]);
    const [ownersLoading, setOwnersLoading] = useState(false);
    const [ownersLoaded, setOwnersLoaded] = useState(false);
    const [ownersError, setOwnersError] = useState('');

    const loadOwners = useCallback(async () => {
        setOwnersLoading(true);
        setOwnersError('');

        try {
            const response = await adminAccountAPI.getAccounts({
                limit: 100,
                role: ACCOUNT_ROLES.FARM_OWNER,
                status: ACCOUNT_STATUSES.ACTIVE,
            });
            setOwners(response.data?.data || []);
        } catch (requestError) {
            setOwners([]);
            setOwnersError(getErrorMessage(requestError, 'Không thể tải danh sách chủ quản.'));
        } finally {
            setOwnersLoaded(true);
            setOwnersLoading(false);
        }
    }, []);

    const handleRoleChange = (role) => {
        form.setFieldValue('managedByOwnerId', undefined);

        if (isManagedStaffRole(role) && !ownersLoaded && !ownersLoading) {
            loadOwners();
        }
    };

    const handleClose = () => {
        if (submitting) return;
        form.resetFields();
        setOwners([]);
        setOwnersLoaded(false);
        setOwnersError('');
        onClose();
    };

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            const payload = {
                email: values.email.trim().toLowerCase(),
                role: values.role,
                ...(isManagedStaffRole(values.role) && {
                    managedByOwnerId: values.managedByOwnerId,
                }),
            };

            setSubmitting(true);
            const response = await adminAccountAPI.createAccount(payload);
            message.success('Tạo tài khoản thành công.');
            form.resetFields();
            onClose();
            onCreated(response.data?.data);
        } catch (requestError) {
            if (!requestError?.errorFields) {
                message.error(getErrorMessage(requestError, 'Không thể tạo tài khoản.'));
            }
        } finally {
            setSubmitting(false);
        }
    };

    const ownerOptions = owners.map((owner) => ({
        value: owner.id,
        label: owner.fullName || owner.email,
        searchText: `${owner.fullName || ''} ${owner.email}`.toLowerCase(),
        owner,
    }));

    return (
        <Modal
            className="create-account-modal"
            title="Tạo tài khoản mới"
            open={open}
            onCancel={handleClose}
            width={500}
            centered
            maskClosable={!submitting}
            footer={
                <Flex justify="flex-end" gap={8}>
                    <Button onClick={handleClose} disabled={submitting}>
                        Hủy
                    </Button>
                    <Button
                        className="account-primary-button"
                        type="primary"
                        icon={<SendOutlined />}
                        loading={submitting}
                        onClick={handleSubmit}
                    >
                        Tạo & Gửi email kích hoạt
                    </Button>
                </Flex>
            }
        >
            <Form
                form={form}
                layout="vertical"
                requiredMark
                onFinish={handleSubmit}
                className="create-account-form"
            >
                <Form.Item
                    name="email"
                    label="Email"
                    normalize={(value) => value?.trimStart()}
                    rules={[
                        { required: true, whitespace: true, message: 'Vui lòng nhập email.' },
                        { type: 'email', message: 'Email không hợp lệ.' },
                        { max: 320, message: 'Email không được vượt quá 320 ký tự.' },
                    ]}
                >
                    <Input placeholder="user@example.com" autoComplete="off" maxLength={320} />
                </Form.Item>

                <Form.Item
                    name="role"
                    label="Vai trò"
                    rules={[{ required: true, message: 'Vui lòng chọn vai trò.' }]}
                >
                    <Select
                        placeholder="Chọn vai trò"
                        options={CREATABLE_ROLE_OPTIONS}
                        onChange={handleRoleChange}
                    />
                </Form.Item>

                {isManagedStaffRole(selectedRole) && (
                    <Form.Item
                        name="managedByOwnerId"
                        label="Chủ quản"
                        extra={
                            ownersError ? (
                                <Button type="link" size="small" onClick={loadOwners}>
                                    {ownersError} Tải lại
                                </Button>
                            ) : null
                        }
                        rules={[{ required: true, message: 'Vui lòng chọn chủ quản.' }]}
                    >
                        <Select
                            showSearch
                            loading={ownersLoading}
                            placeholder="Tìm tên hoặc email chủ quản"
                            optionFilterProp="searchText"
                            filterOption={(input, option) =>
                                option?.searchText?.includes(input.trim().toLowerCase())
                            }
                            options={ownerOptions}
                            optionRender={(option) => (
                                <div className="owner-option">
                                    <Text strong>{option.data.owner.fullName || 'Chưa cập nhật tên'}</Text>
                                    <Text type="secondary">{option.data.owner.email}</Text>
                                </div>
                            )}
                            notFoundContent={
                                ownersLoading ? null : (
                                    <Empty
                                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                                        description="Không có Chủ trang trại đang hoạt động"
                                    />
                                )
                            }
                        />
                    </Form.Item>
                )}
            </Form>
        </Modal>
    );
};

const AccountList = () => {
    const [accounts, setAccounts] = useState([]);
    const [meta, setMeta] = useState({ totalResults: 0, hasNextPage: false });
    const [summary, setSummary] = useState({ total: 0, pending: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [page, setPage] = useState(1);
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [role, setRole] = useState('');
    const [status, setStatus] = useState('');
    const [pageRoles, setPageRoles] = useState([]);
    const [pageStatuses, setPageStatuses] = useState([]);
    const [identitySortOrder, setIdentitySortOrder] = useState(null);
    const [detailId, setDetailId] = useState(null);
    const [detailOpen, setDetailOpen] = useState(false);
    const [createOpen, setCreateOpen] = useState(false);
    const [statusTarget, setStatusTarget] = useState(null);
    const [statusOpen, setStatusOpen] = useState(false);
    const requestIdRef = useRef(0);
    const pageCacheRef = useRef({ key: '', pages: {}, cursors: { 1: null } });

    useEffect(() => {
        const timeoutId = window.setTimeout(() => setSearch(searchInput.trim()), 350);
        return () => window.clearTimeout(timeoutId);
    }, [searchInput]);

    const query = useMemo(
        () => ({
            ...(search && { search }),
            ...(role && { role }),
            ...(status && { status }),
            ...(identitySortOrder && {
                sortBy: 'identity',
                sortOrder: identitySortOrder === 'descend' ? 'desc' : 'asc',
            }),
        }),
        [identitySortOrder, role, search, status],
    );
    const queryKey = useMemo(() => JSON.stringify(query), [query]);

    const requestAccountPage = useCallback(
        async (cursor) => {
            const response = await adminAccountAPI.getAccounts({
                ...query,
                limit: PAGE_SIZE,
                ...(cursor && { cursor }),
            });
            return {
                accounts: response.data?.data || [],
                meta: response.data?.meta || {
                    limit: PAGE_SIZE,
                    totalResults: 0,
                    hasNextPage: false,
                    nextCursor: null,
                },
            };
        },
        [query],
    );

    const loadPage = useCallback(
        async (targetPage, { force = false } = {}) => {
            const requestId = ++requestIdRef.current;
            setLoading(true);
            setError('');

            if (pageCacheRef.current.key !== queryKey) {
                pageCacheRef.current = { key: queryKey, pages: {}, cursors: { 1: null } };
            }

            const cache = pageCacheRef.current;

            try {
                let resolvedPage = targetPage;

                for (let pageNumber = 1; pageNumber <= targetPage; pageNumber += 1) {
                    const shouldFetch = !cache.pages[pageNumber] || (force && pageNumber === targetPage);

                    if (shouldFetch) {
                        const result = await requestAccountPage(cache.cursors[pageNumber]);
                        cache.pages[pageNumber] = result;

                        if (result.meta.hasNextPage && result.meta.nextCursor) {
                            cache.cursors[pageNumber + 1] = result.meta.nextCursor;
                        } else {
                            delete cache.cursors[pageNumber + 1];
                        }
                    }

                    if (pageNumber < targetPage && !cache.pages[pageNumber].meta.hasNextPage) {
                        resolvedPage = pageNumber;
                        break;
                    }
                }

                if (requestId !== requestIdRef.current) return;

                const result = cache.pages[resolvedPage];
                setAccounts(result.accounts);
                setMeta(result.meta);
                setPage(resolvedPage);
            } catch (requestError) {
                if (requestId !== requestIdRef.current) return;
                setAccounts([]);
                setMeta({ totalResults: 0, hasNextPage: false });
                setError(getErrorMessage(requestError, 'Không thể tải danh sách tài khoản.'));
            } finally {
                if (requestId === requestIdRef.current) setLoading(false);
            }
        },
        [queryKey, requestAccountPage],
    );

    const loadSummary = useCallback(async () => {
        try {
            const [allResponse, pendingResponse] = await Promise.all([
                adminAccountAPI.getAccounts({ limit: 1 }),
                adminAccountAPI.getAccounts({
                    limit: 1,
                    status: ACCOUNT_STATUSES.PENDING_ACTIVATION,
                }),
            ]);
            setSummary({
                total: allResponse.data?.meta?.totalResults || 0,
                pending: pendingResponse.data?.meta?.totalResults || 0,
            });
        } catch {
            // The table request still provides a useful filtered total when this summary fails.
        }
    }, []);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => loadPage(1, { force: true }), 0);
        return () => window.clearTimeout(timeoutId);
    }, [loadPage]);

    useEffect(() => {
        const timeoutId = window.setTimeout(loadSummary, 0);
        return () => window.clearTimeout(timeoutId);
    }, [loadSummary]);

    const openDetail = useCallback((account) => {
        setDetailId(account.id);
        setDetailOpen(true);
    }, []);

    const openStatusModal = useCallback((account) => {
        setDetailOpen(false);
        setStatusTarget(account);
        setStatusOpen(true);
    }, []);

    const handleCreated = async () => {
        pageCacheRef.current = { key: '', pages: {}, cursors: { 1: null } };
        await Promise.all([loadPage(1, { force: true }), loadSummary()]);
    };

    const handleStatusChanged = async () => {
        pageCacheRef.current = { key: '', pages: {}, cursors: { 1: null } };
        await Promise.all([loadPage(1, { force: true }), loadSummary()]);
    };

    const columns = useMemo(
        () => [
            {
                title: 'Tên / Email',
                key: 'identity',
                width: 270,
                fixed: 'left',
                sorter: true,
                sortOrder: identitySortOrder,
                sortDirections: ['ascend', 'descend'],
                render: (_, account) => (
                    <Flex align="center" gap={10} className="account-identity">
                        <Avatar
                            className="account-avatar-small"
                            size={34}
                            src={account.avatarUrl || undefined}
                        >
                            {getInitial(account)}
                        </Avatar>
                        <div className="account-identity-copy">
                            <Text
                                strong={Boolean(account.fullName)}
                                className={!account.fullName ? 'pending-account-name' : ''}
                            >
                                {account.fullName || 'Chưa kích hoạt'}
                            </Text>
                            <Text type="secondary" title={account.email}>
                                {account.email}
                            </Text>
                        </div>
                    </Flex>
                ),
            },
            {
                title: 'Vai trò',
                dataIndex: 'role',
                width: 150,
                filters: ROLE_FILTER_OPTIONS.filter((option) => option.value).map((option) => ({
                    text: option.label,
                    value: option.value,
                })),
                filteredValue: pageRoles.length ? pageRoles : null,
                filterMultiple: true,
                filterDropdownProps: TABLE_FILTER_DROPDOWN_PROPS,
                onFilter: (value, account) => account.role === value,
                render: (value) => <RoleTag role={value} />,
            },
            {
                title: 'Trạng thái',
                dataIndex: 'status',
                width: 160,
                filters: STATUS_FILTER_OPTIONS.filter((option) => option.value).map((option) => ({
                    text: option.label,
                    value: option.value,
                })),
                filteredValue: pageStatuses.length ? pageStatuses : null,
                filterMultiple: true,
                filterDropdownProps: TABLE_FILTER_DROPDOWN_PROPS,
                onFilter: (value, account) => account.status === value,
                render: (value) => <StatusTag status={value} />,
            },
            {
                title: 'Chủ quản',
                key: 'managedByOwnerId',
                width: 170,
                render: (_, account) => (
                    <Text
                        className="account-owner-name"
                        type={!account.managedByOwner ? 'secondary' : undefined}
                    >
                        {account.managedByOwner?.fullName || '—'}
                    </Text>
                ),
            },
            {
                title: 'Số điện thoại',
                dataIndex: 'phone',
                key: 'phone',
                width: 130,
                render: (value) => (
                    <Text className="account-date" type={!value ? 'secondary' : undefined}>
                        {value || '—'}
                    </Text>
                ),
            },
            {
                title: 'Đăng nhập gần nhất',
                dataIndex: 'lastLoginAt',
                width: 175,
                render: (value) => <Text className="account-date">{formatDateTime(value)}</Text>,
            },
            {
                title: '',
                key: 'actions',
                width: 92,
                fixed: 'right',
                align: 'right',
                render: (_, account) => (
                    <Button
                        size="small"
                        onClick={(event) => {
                            event.stopPropagation();
                            openDetail(account);
                        }}
                    >
                        Chi tiết
                    </Button>
                ),
            },
        ],
        [
            openDetail,
            identitySortOrder,
            pageRoles,
            pageStatuses,
        ],
    );

    const handleTableChange = (_pagination, filters, sorter) => {
        setPageRoles(filters.role || []);
        setPageStatuses(filters.status || []);
        setIdentitySortOrder(sorter?.columnKey === 'identity' ? sorter.order || null : null);
    };

    const hasGlobalFilters = Boolean(search || role || status);
    const hasPageFilters = Boolean(pageRoles.length || pageStatuses.length);
    const hasActiveFilters = hasGlobalFilters || hasPageFilters;
    const visibleTotal = hasGlobalFilters ? meta.totalResults : summary.total || meta.totalResults;
    const pendingTotal = summary.pending;

    return (
        <section className="account-page">
            <Flex className="account-page-header" justify="space-between" align="flex-start" gap={16}>
                <div>
                    <Title level={3}>Quản lý tài khoản</Title>
                    <Text type="secondary">
                        {summary.total || meta.totalResults} tài khoản trong hệ thống
                        {pendingTotal > 0 && (
                            <>
                                {' · '}
                                <Badge className="pending-count" count={pendingTotal} size="small" />{' '}
                                chờ kích hoạt
                            </>
                        )}
                    </Text>
                </div>
                <Button
                    className="account-primary-button create-account-button"
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setCreateOpen(true)}
                >
                    Tạo tài khoản
                </Button>
            </Flex>

            <Flex className="account-filters" gap={10} wrap="wrap">
                <Input
                    className="account-search"
                    prefix={<SearchOutlined />}
                    placeholder="Tìm tên, email, số điện thoại"
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    allowClear
                    maxLength={255}
                />
                <Select
                    className="account-filter-select"
                    value={role}
                    onChange={setRole}
                    options={ROLE_FILTER_OPTIONS}
                    aria-label="Lọc theo vai trò"
                />
                <Select
                    className="account-filter-select account-status-filter"
                    value={status}
                    onChange={setStatus}
                    options={STATUS_FILTER_OPTIONS}
                    aria-label="Lọc theo trạng thái"
                />
            </Flex>

            {error && (
                <Alert
                    className="account-list-alert"
                    type="error"
                    showIcon
                    message={error}
                    action={
                        <Button size="small" icon={<ReloadOutlined />} onClick={() => loadPage(page, { force: true })}>
                            Thử lại
                        </Button>
                    }
                />
            )}

            <div className="account-table-shell">
                <Table
                    dataSource={accounts}
                    columns={columns}
                    rowKey="id"
                    size="middle"
                    loading={loading}
                    scroll={{ x: 1120 }}
                    locale={{
                        filterConfirm: 'OK',
                        filterReset: 'Reset',
                        emptyText: (
                            <Empty
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                description={hasActiveFilters ? 'Không có tài khoản phù hợp' : 'Chưa có tài khoản'}
                            />
                        ),
                    }}
                    pagination={{
                        current: page,
                        pageSize: PAGE_SIZE,
                        total: visibleTotal,
                        showSizeChanger: false,
                        showLessItems: true,
                        responsive: true,
                        size: 'small',
                        showTotal: (total, range) =>
                            `${range[0]}–${range[1]} / ${total} tài khoản`,
                        onChange: (nextPage) => loadPage(nextPage),
                    }}
                    onChange={handleTableChange}
                    onRow={(account) => ({
                        onClick: () => openDetail(account),
                    })}
                />
            </div>

            <AccountDetailDrawer
                key={detailId}
                accountId={detailId}
                open={detailOpen}
                onClose={() => setDetailOpen(false)}
                onStatusChange={openStatusModal}
            />

            <CreateAccountModal
                open={createOpen}
                onClose={() => setCreateOpen(false)}
                onCreated={handleCreated}
            />

            <ChangeStatusModal
                key={statusTarget?.id}
                account={statusTarget}
                open={statusOpen}
                onClose={() => setStatusOpen(false)}
                onChanged={handleStatusChanged}
            />
        </section>
    );
};

export default AccountList;
