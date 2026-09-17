import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Alert,
    App,
    Avatar,
    Button,
    Card,
    Form,
    Input,
    Modal,
    Skeleton,
    Tag,
    Typography,
    Upload,
} from 'antd';
import {
    AlertOutlined,
    CalendarOutlined,
    CameraOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    EditOutlined,
    ExperimentOutlined,
    LoadingOutlined,
    LockOutlined,
    MailOutlined,
    PhoneOutlined,
    TeamOutlined,
    TrophyOutlined,
    UserOutlined,
} from '@ant-design/icons';
import { cloudinaryAPI, profileAPI } from '../../apis';
import { useAuth } from '../../contexts/useAuth';
import {
    PROFILE_RULES,
    getPasswordStrength,
    normalizeFullName,
    normalizeVietnamesePhone,
    validateCurrentPassword,
    validateFullName,
    validatePassword,
    validateVietnamesePhone,
} from '../../utils/profileRules';

const { Text, Title } = Typography;

const AVATAR_RULES = Object.freeze({
    acceptedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxSizeMb: 5,
    urlMaxLength: 2048,
});

const getErrorMessage = (error, fallback) =>
    error?.response?.data?.message ||
    error?.response?.data?.error?.message ||
    error?.message ||
    fallback;

const isPasswordReuseError = (message = '') => {
    const normalized = message.toLowerCase();
    return normalized.includes('không được trùng') || normalized.includes('phải khác');
};

const isCurrentPasswordError = (message = '') => {
    const normalized = message.toLowerCase();
    return normalized.includes('hiện tại');
};

const getInitials = (profile) => {
    const source = profile?.fullName?.trim() || profile?.email || 'S';
    const words = source.split(/\s+/).filter(Boolean);
    if (words.length === 1) return words[0].charAt(0).toUpperCase();
    return `${words[0].charAt(0)}${words.at(-1).charAt(0)}`.toUpperCase();
};

const formatJoinedAt = (value) => {
    if (!value) return 'Chưa có dữ liệu';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Chưa có dữ liệu';
    return `tháng ${date.getMonth() + 1} năm ${date.getFullYear()}`;
};

const fieldValidator = (validator) => (_, value) => {
    const error = validator(value);
    return error ? Promise.reject(new Error(error)) : Promise.resolve();
};

const isHttpUrl = (value) => {
    try {
        const url = new URL(value);
        return ['http:', 'https:'].includes(url.protocol);
    } catch {
        return false;
    }
};

const ProfileInfoRow = ({ icon, label, value, locked = false }) => (
    <div className="expert-profile-info-row">
        <span className="expert-profile-info-icon">{icon}</span>
        <div className="expert-profile-info-copy">
            <Text className="expert-profile-info-label">{label}</Text>
            <span className="expert-profile-info-value">
                {value}
                {locked ? <LockOutlined className="expert-profile-lock" /> : null}
            </span>
        </div>
    </div>
);

const ExpertStatCard = ({ tone, icon, label, value, subtitle }) => (
    <Card className="expert-stat-card" variant="borderless">
        <span className={`expert-stat-icon is-${tone}`}>{icon}</span>
        <div className="expert-stat-copy">
            <span className="expert-stat-label">{label}</span>
            <strong className="expert-stat-value">{value}</strong>
            <span className="expert-stat-subtitle">{subtitle}</span>
        </div>
    </Card>
);

const PasswordStrength = ({ password }) => {
    if (!password) {
        return null;
    }

    const strength = getPasswordStrength(password);
    const widthByLevel = [0, 20, 50, 75, 100];

    return (
        <div
            className={`password-strength password-strength-${strength.key}`}
            role="status"
            aria-live="polite"
        >
            <div className="password-strength-track" aria-hidden="true">
                <span style={{ width: `${widthByLevel[strength.level]}%` }} />
            </div>
            <Text>{strength.label}</Text>
        </div>
    );
};

const Profile = () => {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [editOpen, setEditOpen] = useState(false);
    const [passwordOpen, setPasswordOpen] = useState(false);
    const [savingProfile, setSavingProfile] = useState(false);
    const [savingPassword, setSavingPassword] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [avatarUploadProgress, setAvatarUploadProgress] = useState(0);
    const [editServerError, setEditServerError] = useState('');
    const [passwordServerError, setPasswordServerError] = useState('');
    const [editForm] = Form.useForm();
    const [passwordForm] = Form.useForm();
    const newPassword = Form.useWatch('newPassword', passwordForm) || '';
    const { replaceAccessToken, updateAccount } = useAuth();
    const { message } = App.useApp();

    const loadProfile = useCallback(async () => {
        setLoading(true);
        setLoadError('');
        try {
            const response = await profileAPI.getProfile();
            const data = response.data?.data;
            if (!data) throw new Error('Phản hồi hồ sơ không hợp lệ.');
            setProfile(data);
            updateAccount(data);
        } catch (error) {
            setLoadError(getErrorMessage(error, 'Không thể tải hồ sơ cá nhân.'));
        } finally {
            setLoading(false);
        }
    }, [updateAccount]);

    useEffect(() => {
        const timeoutId = window.setTimeout(loadProfile, 0);
        return () => window.clearTimeout(timeoutId);
    }, [loadProfile]);

    const roleLabel = useMemo(() => {
        if (profile?.role === 'EXPERT') return 'Chuyên gia thủy sản';
        return 'Tài khoản';
    }, [profile?.role]);

    const expertKpi = profile?.expertKpi || {};
    const seasonsParticipated = expertKpi.seasonsParticipated ?? null;
    const diseaseCasesHandled = expertKpi.diseaseCasesHandled ?? null;
    const diseaseCasesResolved = expertKpi.diseaseCasesResolved ?? null;
    const avgResolutionHours = expertKpi.avgResolutionHours ?? null;
    const resolutionRate =
        Number.isFinite(diseaseCasesHandled) &&
        diseaseCasesHandled > 0 &&
        Number.isFinite(diseaseCasesResolved)
            ? Math.min(100, Math.round((diseaseCasesResolved / diseaseCasesHandled) * 100))
            : null;
    const displayKpi = (value, suffix = '') => (Number.isFinite(value) ? `${value}${suffix}` : '—');

    const beforeAvatarUpload = (file) => {
        if (!AVATAR_RULES.acceptedMimeTypes.includes(file.type)) {
            message.error('Ảnh đại diện chỉ hỗ trợ JPG, PNG hoặc WEBP.');
            return Upload.LIST_IGNORE;
        }

        if (file.size / 1024 / 1024 > AVATAR_RULES.maxSizeMb) {
            message.error(`Ảnh đại diện không được vượt quá ${AVATAR_RULES.maxSizeMb}MB.`);
            return Upload.LIST_IGNORE;
        }

        return true;
    };

    const uploadAvatar = async ({ file, onError, onProgress, onSuccess }) => {
        setUploadingAvatar(true);
        setAvatarUploadProgress(0);

        try {
            const uploadResponse = await cloudinaryAPI.uploadImage(
                file,
                'smartshrimp/avatars',
                (percent) => {
                    setAvatarUploadProgress(percent);
                    onProgress?.({ percent });
                },
            );

            const avatarUrl = uploadResponse.data?.secure_url || uploadResponse.data?.url;
            if (!avatarUrl || !isHttpUrl(avatarUrl)) {
                throw new Error('Cloudinary không trả về URL ảnh hợp lệ.');
            }

            if (avatarUrl.length > AVATAR_RULES.urlMaxLength) {
                throw new Error(`URL ảnh đại diện vượt quá ${AVATAR_RULES.urlMaxLength} ký tự.`);
            }

            const profileResponse = await profileAPI.updateProfile({ avatarUrl });
            const updatedProfile = profileResponse.data?.data;
            if (!updatedProfile) throw new Error('Phản hồi cập nhật ảnh đại diện không hợp lệ.');

            setProfile(updatedProfile);
            updateAccount(updatedProfile);
            message.success('Cập nhật ảnh đại diện thành công.');
            onSuccess?.(updatedProfile);
        } catch (error) {
            message.error(getErrorMessage(error, 'Không thể cập nhật ảnh đại diện.'));
            onError?.(error);
        } finally {
            setUploadingAvatar(false);
            setAvatarUploadProgress(0);
        }
    };

    const openEditModal = () => {
        editForm.setFieldsValue({
            fullName: profile?.fullName || '',
            phone: profile?.phone || '',
        });
        setEditServerError('');
        setEditOpen(true);
    };

    const submitProfile = async () => {
        try {
            const values = await editForm.validateFields();
            setSavingProfile(true);
            setEditServerError('');
            const response = await profileAPI.updateProfile({
                fullName: normalizeFullName(values.fullName),
                phone: values.phone ? normalizeVietnamesePhone(values.phone) : null,
            });
            const updatedProfile = response.data?.data;
            if (!updatedProfile) throw new Error('Phản hồi cập nhật hồ sơ không hợp lệ.');
            setProfile(updatedProfile);
            updateAccount(updatedProfile);
            setEditOpen(false);
            message.success('Cập nhật hồ sơ thành công.');
        } catch (error) {
            if (!error?.errorFields) {
                setEditServerError(getErrorMessage(error, 'Không thể cập nhật hồ sơ.'));
            }
        } finally {
            setSavingProfile(false);
        }
    };

    const openPasswordModal = () => {
        passwordForm.resetFields();
        setPasswordServerError('');
        setPasswordOpen(true);
    };

    const submitPassword = async () => {
        try {
            const values = await passwordForm.validateFields();
            setSavingPassword(true);
            setPasswordServerError('');
            const response = await profileAPI.changePassword({
                currentPassword: values.currentPassword,
                newPassword: values.newPassword,
            });
            const tokens = response.data?.data?.tokens;
            replaceAccessToken(tokens?.accessToken);
            setPasswordOpen(false);
            passwordForm.resetFields();
            message.success('Đổi mật khẩu thành công');
        } catch (error) {
            if (error?.errorFields) return;
            const errorMessage = getErrorMessage(error, 'Không thể đổi mật khẩu.');
            if (isPasswordReuseError(errorMessage)) {
                passwordForm.setFields([{ name: 'newPassword', errors: [errorMessage] }]);
            } else if (isCurrentPasswordError(errorMessage)) {
                passwordForm.setFields([{ name: 'currentPassword', errors: [errorMessage] }]);
            } else {
                setPasswordServerError(errorMessage);
            }
        } finally {
            setSavingPassword(false);
        }
    };

    if (loading) {
        return (
            <div className="expert-profile-page">
                <div className="expert-profile-heading">
                    <Title level={2}>Hồ sơ cá nhân</Title>
                    <Text type="secondary">Quản lý hồ sơ của bạn</Text>
                </div>
                <Card className="expert-profile-card">
                    <Skeleton active avatar paragraph={{ rows: 8 }} />
                </Card>
            </div>
        );
    }

    if (loadError || !profile) {
        return (
            <div className="expert-profile-page">
                <Alert
                    type="error"
                    showIcon
                    message="Không thể tải hồ sơ"
                    description={loadError}
                    action={<Button onClick={loadProfile}>Thử lại</Button>}
                />
            </div>
        );
    }

    return (
        <div className="expert-profile-page">
            <div className="expert-profile-heading">
                <Title level={2}>Hồ sơ cá nhân</Title>
                <Text type="secondary">Quản lý hồ sơ của bạn</Text>
            </div>

            <div className="expert-profile-grid">
                <div className="expert-profile-card-column">
                    <Card className="expert-profile-card" variant="borderless">
                        <div className="expert-profile-identity">
                            <Upload
                                accept={AVATAR_RULES.acceptedMimeTypes.join(',')}
                                beforeUpload={beforeAvatarUpload}
                                customRequest={uploadAvatar}
                                disabled={uploadingAvatar}
                                maxCount={1}
                                showUploadList={false}
                            >
                                <button
                                    type="button"
                                    className="expert-avatar-upload"
                                    disabled={uploadingAvatar}
                                    aria-label="Thay đổi ảnh đại diện"
                                >
                                    <Avatar
                                        size={72}
                                        src={profile.avatarUrl}
                                        className="expert-profile-avatar"
                                    >
                                        {getInitials(profile)}
                                    </Avatar>
                                    <span className="expert-avatar-upload-overlay">
                                        {uploadingAvatar ? <LoadingOutlined /> : <CameraOutlined />}
                                        <span>
                                            {uploadingAvatar
                                                ? `${avatarUploadProgress}%`
                                                : 'Đổi ảnh'}
                                        </span>
                                    </span>
                                </button>
                            </Upload>
                            <Title level={3} className="expert-profile-name">
                                {profile.fullName || profile.email}
                            </Title>
                            <Tag color="cyan" className="expert-role-tag">
                                {roleLabel}
                            </Tag>
                        </div>

                        <div className="expert-profile-details">
                            <ProfileInfoRow
                                icon={<MailOutlined />}
                                label="EMAIL"
                                value={profile.email}
                                locked
                            />
                            <ProfileInfoRow
                                icon={<PhoneOutlined />}
                                label="SỐ ĐIỆN THOẠI"
                                value={profile.phone || 'Chưa cập nhật'}
                            />
                            <ProfileInfoRow
                                icon={<TeamOutlined />}
                                label="CHỦ TRANG TRẠI PHỤ TRÁCH"
                                value={
                                    profile.managedByOwner?.fullName ||
                                    profile.managedByOwner?.email ||
                                    'Chưa phân công'
                                }
                            />
                            <ProfileInfoRow
                                icon={<CalendarOutlined />}
                                label="THAM GIA HỆ THỐNG TỪ"
                                value={formatJoinedAt(profile.activatedAt || profile.createdAt)}
                            />
                        </div>

                        <div className="expert-profile-actions">
                            <Button icon={<EditOutlined />} onClick={openEditModal}>
                                Chỉnh sửa hồ sơ
                            </Button>
                            <Button icon={<LockOutlined />} onClick={openPasswordModal}>
                                Đổi mật khẩu
                            </Button>
                        </div>
                    </Card>
                </div>

                <div className="expert-profile-side">
                    <div className="expert-stat-grid">
                        <ExpertStatCard
                            tone="teal"
                            icon={<ExperimentOutlined />}
                            label="VỤ NUÔI THAM GIA"
                            value={displayKpi(seasonsParticipated)}
                            subtitle="Tổng số vụ được phân công"
                        />
                        <ExpertStatCard
                            tone="blue"
                            icon={<AlertOutlined />}
                            label="CA BỆNH ĐƯỢC GIAO"
                            value={displayKpi(diseaseCasesHandled)}
                            subtitle="Tổng số ca tiếp nhận"
                        />
                        <ExpertStatCard
                            tone="teal"
                            icon={<CheckCircleOutlined />}
                            label="CA ĐÃ GIẢI QUYẾT"
                            value={displayKpi(diseaseCasesResolved)}
                            subtitle={
                                Number.isFinite(diseaseCasesResolved) &&
                                Number.isFinite(diseaseCasesHandled)
                                    ? `${diseaseCasesResolved}/${diseaseCasesHandled} ca`
                                    : 'Chưa có dữ liệu'
                            }
                        />
                        <ExpertStatCard
                            tone="amber"
                            icon={<ClockCircleOutlined />}
                            label="THỜI GIAN XỬ LÝ TB"
                            value={displayKpi(avgResolutionHours, ' giờ')}
                            subtitle="Trung bình mỗi ca giải quyết"
                        />
                    </div>

                    <Card className="expert-progress-card" variant="borderless">
                        <div className="expert-progress-heading">
                            <span className="expert-progress-title">
                                <TrophyOutlined />
                                TỶ LỆ GIẢI QUYẾT CA BỆNH
                            </span>
                            <strong>{resolutionRate === null ? '—' : `${resolutionRate}%`}</strong>
                        </div>
                        <div className="expert-progress-track" aria-hidden="true">
                            <span style={{ width: `${resolutionRate || 0}%` }} />
                        </div>
                        <div className="expert-progress-caption">
                            <span>
                                {Number.isFinite(diseaseCasesResolved)
                                    ? `${diseaseCasesResolved} ca đã giải quyết`
                                    : 'Chưa có dữ liệu'}
                            </span>
                            <span>
                                {Number.isFinite(diseaseCasesHandled)
                                    ? `${diseaseCasesHandled} ca tổng cộng`
                                    : 'Chưa có dữ liệu'}
                            </span>
                        </div>
                    </Card>
                </div>
            </div>

            <Modal
                className="expert-profile-modal"
                title="Chỉnh sửa hồ sơ"
                open={editOpen}
                width={460}
                centered
                onCancel={() => setEditOpen(false)}
                afterClose={() => editForm.resetFields()}
                footer={[
                    <Button
                        key="cancel"
                        disabled={savingProfile}
                        onClick={() => setEditOpen(false)}
                    >
                        Hủy
                    </Button>,
                    <Button
                        key="save"
                        className="btn-grad profile-primary-action"
                        loading={savingProfile}
                        onClick={submitProfile}
                    >
                        Lưu thay đổi
                    </Button>,
                ]}
            >
                {editServerError ? (
                    <Alert
                        className="profile-modal-alert"
                        type="error"
                        showIcon
                        message={editServerError}
                    />
                ) : null}
                <Form form={editForm} layout="vertical" className="expert-edit-form">
                    <Form.Item
                        label="Họ và tên"
                        name="fullName"
                        required
                        rules={[{ validator: fieldValidator(validateFullName) }]}
                    >
                        <Input
                            prefix={<UserOutlined />}
                            placeholder="Họ và tên đầy đủ"
                            maxLength={PROFILE_RULES.fullNameMaxLength}
                            autoFocus
                        />
                    </Form.Item>
                    <Form.Item
                        label="Số điện thoại"
                        name="phone"
                        rules={[{ validator: fieldValidator(validateVietnamesePhone) }]}
                    >
                        <Input
                            prefix={<PhoneOutlined />}
                            placeholder="09xx xxx xxx"
                            maxLength={20}
                        />
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                className="expert-profile-modal"
                title="Đổi mật khẩu"
                open={passwordOpen}
                width={460}
                centered
                onCancel={() => setPasswordOpen(false)}
                afterClose={() => passwordForm.resetFields()}
                footer={[
                    <Button
                        key="cancel"
                        disabled={savingPassword}
                        onClick={() => setPasswordOpen(false)}
                    >
                        Hủy
                    </Button>,
                    <Button
                        key="save"
                        className="btn-grad profile-primary-action"
                        loading={savingPassword}
                        onClick={submitPassword}
                    >
                        Xác nhận đổi mật khẩu
                    </Button>,
                ]}
            >
                {passwordServerError ? (
                    <Alert
                        className="profile-modal-alert"
                        type="error"
                        showIcon
                        message={passwordServerError}
                    />
                ) : null}
                <Form form={passwordForm} layout="vertical" className="expert-password-form">
                    <Form.Item
                        label="Mật khẩu hiện tại"
                        name="currentPassword"
                        required
                        rules={[{ validator: fieldValidator(validateCurrentPassword) }]}
                    >
                        <Input.Password
                            prefix={<LockOutlined />}
                            placeholder="Nhập mật khẩu hiện tại"
                            autoComplete="current-password"
                        />
                    </Form.Item>
                    <Form.Item
                        label="Mật khẩu mới"
                        name="newPassword"
                        required
                        rules={[
                            () => ({
                                validator: (_, value) => {
                                    const error = validatePassword(value);
                                    return error
                                        ? Promise.reject(new Error(error))
                                        : Promise.resolve();
                                },
                            }),
                        ]}
                    >
                        <Input.Password
                            prefix={<LockOutlined />}
                            placeholder="Tối thiểu 6 ký tự"
                            autoComplete="new-password"
                        />
                    </Form.Item>
                    <PasswordStrength password={newPassword} />
                    <Form.Item
                        label="Xác nhận mật khẩu mới"
                        name="confirmPassword"
                        required
                        dependencies={['newPassword']}
                        rules={[
                            { required: true, message: 'Vui lòng xác nhận mật khẩu mới.' },
                            ({ getFieldValue }) => ({
                                validator: (_, value) =>
                                    !value || getFieldValue('newPassword') === value
                                        ? Promise.resolve()
                                        : Promise.reject(
                                              new Error('Mật khẩu nhập lại không khớp.'),
                                          ),
                            }),
                        ]}
                    >
                        <Input.Password
                            prefix={<LockOutlined />}
                            placeholder="Nhập lại mật khẩu mới"
                            autoComplete="new-password"
                            onPressEnter={submitPassword}
                        />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default Profile;
