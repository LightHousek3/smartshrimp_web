import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Alert,
    App,
    Avatar,
    Button,
    Card,
    Col,
    Divider,
    Flex,
    Form,
    Input,
    Modal,
    Progress,
    Row,
    Spin,
    Statistic,
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
    LockOutlined,
    MailOutlined,
    PhoneOutlined,
    TeamOutlined,
    TrophyOutlined,
    UserOutlined,
} from '@ant-design/icons';
import { cloudinaryAPI, profileAPI } from '../../apis';
import Loading from '../../components/Loading';
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

const { Paragraph, Text, Title } = Typography;

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

const cardClassName =
    'w-full! min-w-0! rounded-[14px]! border! border-[#e5e8f0]! bg-white! shadow-[0_1px_1px_rgba(15,28,46,0.04)]!';
const actionClassName =
    'h-9! rounded-[10px]! border-[#e5e8f0]! text-[13px]! font-medium! text-[#3a4a63]! shadow-none! hover:border-[#69b3cc]! hover:text-[#1788b0]!';
const modalButtonClassName = 'm-0! h-9! rounded-[10px]! px-4! py-0! text-[13px]!';
const primaryButtonClassName = [
    modalButtonClassName,
    'min-h-9! border-0! text-white! normal-case! shadow-none!',
    'bg-[linear-gradient(to_right,#77a1d3_0%,#79cbca_51%,#77a1d3_100%)]!',
    'bg-size-[200%_auto]! bg-position-[left_center]! transition-[background-position]! duration-500!',
    'hover:bg-position-[right_center]! focus-visible:bg-position-[right_center]!',
].join(' ');
const formClassName = [
    '[&_.ant-form-item]:min-h-22.25! [&_.ant-form-item]:mb-0!',
    '[&_.ant-form-item-label]:h-7.25! [&_.ant-form-item-label]:p-0!',
    '[&_.ant-form-item-label>label]:h-5! [&_.ant-form-item-label>label]:text-[12px]!',
    '[&_.ant-form-item-label>label]:font-normal! [&_.ant-form-item-label>label]:leading-5!',
    '[&_.ant-form-item-label>label]:text-[#3a4a63]!',
    '[&_.ant-form-item-required::before]:text-[#d43b57]!',
    '[&_.ant-form-item-required::before]:text-[13px]!',
    '[&_.ant-input-affix-wrapper]:h-9! [&_.ant-input-affix-wrapper]:rounded-[10px]!',
    '[&_.ant-input-affix-wrapper]:px-2.75! [&_.ant-input-affix-wrapper]:py-1.5!',
    '[&_.ant-input-affix-wrapper]:text-[13px]! [&_input]:text-[13px]!',
    '[&_.ant-input-prefix]:mr-1! [&_.ant-input-prefix]:text-[13px]!',
    '[&_.ant-input-prefix]:text-[#6a7994]!',
    '[&_.ant-form-item-explain-error]:text-[13px]!',
    '[&_.ant-form-item-explain-error]:leading-5.25!',
    '[&_.ant-form-item-explain-error]:text-[#d43b57]!',
    '[&_.ant-form-item-additional]:min-h-6!',
].join(' ');
const modalClassNames = {
    content:
        'rounded-2xl! px-6! py-5! shadow-[0_1px_1px_rgba(15,28,46,0.04),0_8px_12px_rgba(15,28,46,0.25)]! max-[600px]:px-4!',
    header:
        'mb-0! [&_.ant-modal-title]:text-[14px]! [&_.ant-modal-title]:font-semibold! [&_.ant-modal-title]:leading-5.5! [&_.ant-modal-title]:text-[rgba(15,28,46,0.88)]!',
    body: 'p-0!',
    footer:
        'mt-0! flex! min-h-12! items-center! justify-end! gap-2! pt-3! max-[600px]:flex-wrap! [&_.ant-btn]:ms-0!',
};
const statTone = {
    teal: 'bg-[rgba(15,155,142,0.12)]! text-[#0f9b8e]!',
    blue: 'bg-[rgba(29,122,214,0.1)]! text-[#1d7ad6]!',
    amber: 'bg-[rgba(217,134,11,0.12)]! text-[#d9860b]!',
};
const passwordTone = {
    'too-short': { stroke: '#e44861', text: 'text-[#d53c55]!' },
    medium: { stroke: '#e0a000', text: 'text-[#c88d00]!' },
    'fairly-strong': { stroke: '#19a7a0', text: 'text-[#0f918b]!' },
    strong: { stroke: '#15945d', text: 'text-[#117a4e]!' },
};
const passwordPercent = [0, 20, 50, 75, 100];

const ProfileInfoRow = ({ icon, label, value, locked = false }) => (
    <Flex align="start" gap={10} className="min-h-9.5! min-w-0!">
        <Avatar
            size={22}
            shape="square"
            icon={icon}
            className="shrink-0! border-0! bg-transparent! text-[14px]! text-[#6a7994]!"
        />
        <Flex vertical gap={0} className="min-w-0! flex-1!">
            <Text className="text-[10px]! font-semibold! tracking-[0.03em]! leading-4.25! text-[#6a7994]! uppercase!">
                {label}
            </Text>
            <Flex align="center" gap={5} className="min-w-0!">
                <Text
                    ellipsis={{ tooltip: value }}
                    className="min-w-0! text-[13px]! font-medium! leading-5.25! text-[rgba(15,28,46,0.88)]!"
                >
                    {value}
                </Text>
                {locked && <LockOutlined className="shrink-0 text-[11px] text-[#6a7994]" />}
            </Flex>
        </Flex>
    </Flex>
);

const ExpertStatCard = ({ tone, icon, label, value, subtitle }) => (
    <Card
        className={`${cardClassName} min-h-25.25! [&>.ant-card-body]:p-4!`}
        variant="borderless"
    >
        <Flex align="start" gap={12}>
            <Avatar
                size={44}
                shape="square"
                icon={icon}
                className={`shrink-0! rounded-xl! text-[20px]! ${statTone[tone]}`}
            />
            <Flex vertical gap={0} className="min-w-0! flex-1!">
                <Statistic
                    title={
                        <Text className="block! truncate! text-[10px]! font-bold! tracking-[0.04em]! leading-4! text-[#6a7994]!">
                            {label}
                        </Text>
                    }
                    value={value}
                    formatter={() => value}
                    className="[&_.ant-statistic-title]:mb-0! [&_.ant-statistic-content]:truncate! [&_.ant-statistic-content]:font-['Sora','Plus_Jakarta_Sans',sans-serif]! [&_.ant-statistic-content]:text-[24px]! [&_.ant-statistic-content]:font-extrabold! [&_.ant-statistic-content]:leading-7.25! [&_.ant-statistic-content]:text-[#0f1c2e]!"
                />
                <Text
                    ellipsis={{ tooltip: subtitle }}
                    className="text-[11px]! leading-4.25! text-[#6a7994]!"
                >
                    {subtitle}
                </Text>
            </Flex>
        </Flex>
    </Card>
);

const PasswordStrength = ({ password }) => {
    if (!password) return null;

    const strength = getPasswordStrength(password);
    const tone = passwordTone[strength.key];

    return (
        <Flex vertical gap={4} className="min-h-7.5!" role="status" aria-live="polite">
            <Progress
                percent={passwordPercent[strength.level]}
                showInfo={false}
                size={{ height: 6 }}
                strokeColor={tone.stroke}
                trailColor="#e5e8f0"
                className="m-0! block! leading-none! [&_.ant-progress-inner]:block!"
                aria-label="Độ mạnh mật khẩu"
            />
            <Text className={`text-[11px]! font-normal! leading-4.5! ${tone.text}`}>
                {strength.label}
            </Text>
        </Flex>
    );
};

const ProfileModal = ({ title, open, saving, onCancel, afterClose, onSubmit, submitText, children }) => (
    <Modal
        title={title}
        open={open}
        width={460}
        centered
        onCancel={onCancel}
        afterClose={afterClose}
        onOk={onSubmit}
        confirmLoading={saving}
        okText={submitText}
        cancelText="Hủy"
        okButtonProps={{ className: primaryButtonClassName }}
        cancelButtonProps={{ disabled: saving, className: modalButtonClassName }}
        classNames={modalClassNames}
        className="max-[600px]:mx-auto! max-[600px]:my-2.5! max-[600px]:max-w-[calc(100vw-20px)]! [&_.ant-modal-close]:top-2.25! [&_.ant-modal-close]:right-2.25! [&_.ant-modal-close]:size-9! [&_.ant-modal-close]:text-[15px]! [&_.ant-modal-close]:text-[#6a7994]!"
    >
        {children}
    </Modal>
);

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

    const heading = (
        <Flex vertical gap={0} className="w-full! min-w-0!">
            <Title level={1} className="m-0! font-['Sora','Plus_Jakarta_Sans',sans-serif]! text-[22px]! leading-6.875! font-bold! text-[#0f1c2e]!">
                Hồ sơ cá nhân
            </Title>
            <Paragraph className="mb-0! mt-1! text-[13px]! leading-5.25! text-[#6a7994]!">
                Quản lý hồ sơ của bạn
            </Paragraph>
        </Flex>
    );

    if (loading) {
        return (
            <Flex vertical gap={0} className="w-full! min-w-0!">
                {heading}
                <Loading className="min-h-90! w-full!" tip="Đang tải hồ sơ cá nhân" />
            </Flex>
        );
    }

    if (loadError || !profile) {
        return (
            <Flex vertical gap={0} className="w-full! min-w-0!">
                {heading}
                <Alert
                    className="mt-5!"
                    type="error"
                    showIcon
                    message="Không thể tải hồ sơ"
                    description={loadError}
                    action={<Button onClick={loadProfile}>Thử lại</Button>}
                />
            </Flex>
        );
    }

    return (
        <Flex vertical gap={0} className="w-full! min-w-0!">
            {heading}
            <Row gutter={[16, 16]} align="top" className="mt-5!">
                <Col xs={24} lg={9} xl={8}>
                    <Card
                        className={`${cardClassName} [&>.ant-card-body]:p-5! max-[650px]:[&>.ant-card-body]:px-4!`}
                        variant="borderless"
                    >
                        <Flex vertical align="center" gap={8}>
                            <Upload
                                accept={AVATAR_RULES.acceptedMimeTypes.join(',')}
                                beforeUpload={beforeAvatarUpload}
                                customRequest={uploadAvatar}
                                disabled={uploadingAvatar}
                                maxCount={1}
                                showUploadList={false}
                                className="inline-block! size-18! [&_.ant-upload]:inline-block! [&_.ant-upload]:size-18!"
                            >
                                <Button
                                    type="text"
                                    className="group relative! block! size-18! min-w-18! overflow-hidden! rounded-full! border-0! bg-transparent! p-0! disabled:cursor-wait!"
                                    disabled={uploadingAvatar}
                                    aria-label="Thay đổi ảnh đại diện"
                                >
                                    <Avatar
                                        size={72}
                                        src={profile.avatarUrl}
                                        className="flex! items-center! justify-center! bg-[rgba(15,155,142,0.15)]! font-['Sora','Plus_Jakarta_Sans',sans-serif]! text-[24px]! font-bold! text-[#119c98]!"
                                    >
                                        {getInitials(profile)}
                                    </Avatar>
                                    <Flex
                                        vertical
                                        align="center"
                                        justify="center"
                                        gap={2}
                                        className="absolute! inset-0! rounded-full! bg-[rgba(15,28,46,0.58)]! text-white! opacity-0! transition-opacity duration-200 group-hover:opacity-100! group-focus-visible:opacity-100! group-disabled:opacity-100!"
                                    >
                                        {uploadingAvatar ? (
                                            <Spin size="small" className="text-white! [&_.ant-spin-dot-item]:bg-white!" />
                                        ) : <CameraOutlined className="text-[16px]" />}
                                        <Text className="text-[11px]! font-semibold! leading-3.5! text-white!">
                                            {uploadingAvatar ? `${avatarUploadProgress}%` : 'Đổi ảnh'}
                                        </Text>
                                    </Flex>
                                </Button>
                            </Upload>
                            <Title
                                level={3}
                                ellipsis={{ tooltip: profile.fullName || profile.email }}
                                className="m-0! max-w-full! font-['Sora','Plus_Jakarta_Sans',sans-serif]! text-[16px]! font-semibold! leading-6! text-[rgba(15,28,46,0.88)]!"
                            >
                                {profile.fullName || profile.email}
                            </Title>
                            <Tag
                                color="cyan"
                                className="m-0! h-5! rounded-full! border-[#b5f5ec]! bg-[#e6fffb]! px-2! py-0! text-[11px]! leading-4.5! text-[#0f9b8e]!"
                            >
                                {roleLabel}
                            </Tag>
                        </Flex>

                        <Divider className="mt-5! mb-3.75! border-[#e5e8f0]!" />
                        <Flex vertical gap={13}>
                            <ProfileInfoRow icon={<MailOutlined />} label="EMAIL" value={profile.email} locked />
                            <ProfileInfoRow
                                icon={<PhoneOutlined />}
                                label="SỐ ĐIỆN THOẠI"
                                value={profile.phone || 'Chưa cập nhật'}
                            />
                            <ProfileInfoRow
                                icon={<TeamOutlined />}
                                label="CHỦ TRANG TRẠI PHỤ TRÁCH"
                                value={profile.managedByOwner?.fullName || profile.managedByOwner?.email || 'Chưa phân công'}
                            />
                            <ProfileInfoRow
                                icon={<CalendarOutlined />}
                                label="THAM GIA HỆ THỐNG TỪ"
                                value={formatJoinedAt(profile.activatedAt || profile.createdAt)}
                            />
                        </Flex>
                        <Divider className="my-4! border-[#e5e8f0]!" />
                        <Flex vertical gap={16}>
                            <Button className={actionClassName} icon={<EditOutlined />} onClick={openEditModal}>
                                Chỉnh sửa hồ sơ
                            </Button>
                            <Button className={actionClassName} icon={<LockOutlined />} onClick={openPasswordModal}>
                                Đổi mật khẩu
                            </Button>
                        </Flex>
                    </Card>
                </Col>
                <Col xs={24} lg={15} xl={16}>
                    <Row gutter={[16, 16]}>
                        <Col xs={24} sm={12}>
                            <ExpertStatCard
                                tone="teal" icon={<ExperimentOutlined />} label="VỤ NUÔI THAM GIA"
                                value={displayKpi(seasonsParticipated)} subtitle="Tổng số vụ được phân công"
                            />
                        </Col>
                        <Col xs={24} sm={12}>
                            <ExpertStatCard
                                tone="blue" icon={<AlertOutlined />} label="CA BỆNH ĐƯỢC GIAO"
                                value={displayKpi(diseaseCasesHandled)} subtitle="Tổng số ca tiếp nhận"
                            />
                        </Col>
                        <Col xs={24} sm={12}>
                            <ExpertStatCard
                                tone="teal" icon={<CheckCircleOutlined />} label="CA ĐÃ GIẢI QUYẾT"
                                value={displayKpi(diseaseCasesResolved)}
                                subtitle={Number.isFinite(diseaseCasesResolved) && Number.isFinite(diseaseCasesHandled)
                                    ? `${diseaseCasesResolved}/${diseaseCasesHandled} ca` : 'Chưa có dữ liệu'}
                            />
                        </Col>
                        <Col xs={24} sm={12}>
                            <ExpertStatCard
                                tone="amber" icon={<ClockCircleOutlined />} label="THỜI GIAN XỬ LÝ TB"
                                value={displayKpi(avgResolutionHours, ' giờ')} subtitle="Trung bình mỗi ca giải quyết"
                            />
                        </Col>
                    </Row>
                    <Card
                        className={`${cardClassName} mt-4! min-h-28.25! [&>.ant-card-body]:px-5! [&>.ant-card-body]:py-4!`}
                        variant="borderless"
                    >
                        <Flex align="center" justify="space-between" gap={8}>
                            <Flex align="center" gap={8} className="min-w-0! flex-1!">
                                <TrophyOutlined className="shrink-0 text-[14px] text-[#d9860b]" />
                                <Text
                                    ellipsis
                                    className="min-w-0! text-[12px]! font-bold! tracking-[0.04em]! text-[#3a4a63]!"
                                >
                                    TỶ LỆ GIẢI QUYẾT CA BỆNH
                                </Text>
                            </Flex>
                            <Text className="shrink-0! font-['Sora','Plus_Jakarta_Sans',sans-serif]! text-[24px]! font-extrabold! leading-7.25! text-[#0f9b8e]!">
                                {resolutionRate === null ? '—' : `${resolutionRate}%`}
                            </Text>
                        </Flex>
                        <Progress
                            percent={resolutionRate || 0}
                            showInfo={false}
                            size={{ height: 10 }}
                            strokeColor={{ from: '#79cbca', to: '#0f9b8e', direction: 'to right' }}
                            trailColor="#e5e8f0"
                            className="mt-3! mb-0! block! leading-none! [&_.ant-progress-inner]:block!"
                            aria-label="Tỷ lệ giải quyết ca bệnh"
                        />
                        <Flex align="center" justify="space-between" gap={8} className="mt-2.25!">
                            <Text className="text-[11px]! leading-4.25! text-[#6a7994]!">
                                {Number.isFinite(diseaseCasesResolved) ? `${diseaseCasesResolved} ca đã giải quyết` : 'Chưa có dữ liệu'}
                            </Text>
                            <Text className="text-[11px]! leading-4.25! text-[#6a7994]!">
                                {Number.isFinite(diseaseCasesHandled) ? `${diseaseCasesHandled} ca tổng cộng` : 'Chưa có dữ liệu'}
                            </Text>
                        </Flex>
                    </Card>
                </Col>
            </Row>

            <ProfileModal
                title="Chỉnh sửa hồ sơ" open={editOpen} saving={savingProfile}
                onCancel={() => setEditOpen(false)} afterClose={() => editForm.resetFields()}
                onSubmit={submitProfile} submitText="Lưu thay đổi"
            >
                {editServerError && (
                    <Alert className="mb-4!" type="error" showIcon message={editServerError} />
                )}
                <Form form={editForm} layout="vertical" className={`${formClassName} pt-2!`}>
                    <Form.Item
                        label="Họ và tên" name="fullName" required
                        rules={[{ validator: fieldValidator(validateFullName) }]}
                    >
                        <Input
                            prefix={<UserOutlined />} placeholder="Họ và tên đầy đủ"
                            maxLength={PROFILE_RULES.fullNameMaxLength} autoFocus
                        />
                    </Form.Item>
                    <Form.Item
                        label="Số điện thoại" name="phone"
                        rules={[{ validator: fieldValidator(validateVietnamesePhone) }]}
                    >
                        <Input prefix={<PhoneOutlined />} placeholder="09xx xxx xxx" maxLength={20} />
                    </Form.Item>
                </Form>
            </ProfileModal>

            <ProfileModal
                title="Đổi mật khẩu" open={passwordOpen} saving={savingPassword}
                onCancel={() => setPasswordOpen(false)} afterClose={() => passwordForm.resetFields()}
                onSubmit={submitPassword} submitText="Xác nhận đổi mật khẩu"
            >
                {passwordServerError && (
                    <Alert className="mb-4!" type="error" showIcon message={passwordServerError} />
                )}
                <Form form={passwordForm} layout="vertical" className={`${formClassName} pt-4!`}>
                    <Form.Item
                        label="Mật khẩu hiện tại" name="currentPassword" required
                        rules={[{ validator: fieldValidator(validateCurrentPassword) }]}
                    >
                        <Input.Password
                            prefix={<LockOutlined />} placeholder="Nhập mật khẩu hiện tại"
                            autoComplete="current-password"
                        />
                    </Form.Item>
                    <Form.Item
                        label="Mật khẩu mới" name="newPassword" required
                        rules={[
                            () => ({
                                validator: (_, value) => {
                                    const error = validatePassword(value);
                                    return error ? Promise.reject(new Error(error)) : Promise.resolve();
                                },
                            }),
                        ]}
                    >
                        <Input.Password
                            prefix={<LockOutlined />} placeholder="Tối thiểu 6 ký tự"
                            autoComplete="new-password"
                        />
                    </Form.Item>
                    <PasswordStrength password={newPassword} />
                    <Form.Item
                        label="Xác nhận mật khẩu mới" name="confirmPassword" required
                        dependencies={['newPassword']}
                        className={newPassword ? 'min-h-26.25! pt-4!' : ''}
                        rules={[
                            { required: true, message: 'Vui lòng xác nhận mật khẩu mới.' },
                            ({ getFieldValue }) => ({
                                validator: (_, value) =>
                                    !value || getFieldValue('newPassword') === value
                                        ? Promise.resolve()
                                        : Promise.reject(new Error('Mật khẩu nhập lại không khớp.')),
                            }),
                        ]}
                    >
                        <Input.Password
                            prefix={<LockOutlined />} placeholder="Nhập lại mật khẩu mới"
                            autoComplete="new-password" onPressEnter={submitPassword}
                        />
                    </Form.Item>
                </Form>
            </ProfileModal>
        </Flex>
    );
};

export default Profile;
