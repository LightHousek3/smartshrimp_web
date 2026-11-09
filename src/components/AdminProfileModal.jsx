import { useEffect, useState } from 'react';
import { Alert, Avatar, Button, Modal, Spin } from 'antd';
import { CalendarOutlined, CloseOutlined, MailOutlined, PhoneOutlined, UserOutlined } from '@ant-design/icons';
import { profileAPI } from '../apis';
import { useAuth } from '../contexts/useAuth';
import { formatDate } from '../utils/dateUtils';

const profileStateClassName = 'flex min-h-[272px] flex-col items-center justify-center gap-4 text-[13px] text-[#6a7994]';
const profileModalClassName = [
    '[&_.ant-modal-title]:text-sm! [&_.ant-modal-title]:font-semibold! [&_.ant-modal-title]:leading-[22px]! [&_.ant-modal-title]:text-[rgba(15,28,46,0.88)]!',
    '[&_.ant-modal-close]:top-[9px]! [&_.ant-modal-close]:right-[9px]! [&_.ant-modal-close]:size-9!',
].join(' ');
const profileCloseButtonClassName = [
    'h-9! rounded-[10px]! border-[0.8px]! border-transparent! px-4! text-[13px]! font-normal! text-white!',
    'bg-[linear-gradient(90deg,#77a1d3,#79cbca)]! shadow-[0_2px_0_rgba(5,172,255,0.06)]!',
    'enabled:hover:bg-[linear-gradient(90deg,#5f91cc,#57bdbd)]! enabled:focus-visible:bg-[linear-gradient(90deg,#5f91cc,#57bdbd)]!',
].join(' ');

const ProfileDetails = () => {
    const { updateAccount } = useAuth();
    const [result, setResult] = useState({ status: 'loading' });
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        const controller = new AbortController();

        const loadProfile = async () => {
            try {
                const response = await profileAPI.getProfile({ signal: controller.signal });
                if (controller.signal.aborted) return;

                const profile = response.data?.data;
                if (!profile?.id) throw new Error('Không thể tải hồ sơ cá nhân.');

                updateAccount(profile);
                setResult({ status: 'success', profile });
            } catch (error) {
                if (controller.signal.aborted) return;
                setResult({
                    status: 'error',
                    message: error.response?.data?.message || 'Không thể tải hồ sơ cá nhân. Vui lòng thử lại.',
                });
            }
        };

        loadProfile();
        return () => controller.abort();
    }, [attempt, updateAccount]);

    if (result.status === 'loading') {
        return (
            <div className={profileStateClassName} role="status" aria-label="Đang tải hồ sơ cá nhân">
                <Spin />
                <span>Đang tải hồ sơ cá nhân...</span>
            </div>
        );
    }

    if (result.status === 'error') {
        return (
            <div className={profileStateClassName}>
                <Alert type="error" showIcon message={result.message} />
                <Button onClick={() => {
                    setResult({ status: 'loading' });
                    setAttempt((current) => current + 1);
                }}>
                    Thử lại
                </Button>
            </div>
        );
    }

    const { profile } = result;
    const fullName = profile.fullName?.trim() || 'Admin';
    const details = [
        { label: 'Họ và tên', icon: <UserOutlined aria-hidden="true" />, value: fullName },
        { label: 'Tham gia hệ thống từ', icon: <CalendarOutlined aria-hidden="true" />, value: formatDate(profile.createdAt, 'MMMM yyyy') || 'Chưa cập nhật' },
        { label: 'Email', icon: <MailOutlined aria-hidden="true" />, value: profile.email || 'Chưa cập nhật' },
        { label: 'Số điện thoại', icon: <PhoneOutlined aria-hidden="true" />, value: profile.phone || 'Chưa cập nhật', regular: true },
    ];

    return (
        <>
            <div className="flex min-h-[106px] items-center gap-4 rounded-xl border-[0.8px] border-[rgba(211,232,255,0.6)] bg-[linear-gradient(90deg,#eaf4ff,#e2f6f3)] p-5 max-[480px]:p-4">
                <Avatar
                    size={64}
                    src={profile.avatarUrl}
                    className="shrink-0! bg-[linear-gradient(135deg,#77a1d3,#79cbca)]! font-display! text-[25px]! font-semibold! text-white!"
                >
                    {fullName.charAt(0).toUpperCase()}
                </Avatar>
                <div className="min-w-0">
                    <h2 className="m-0 font-display text-xl font-semibold leading-[32.3px] text-[#0f1c2e] [overflow-wrap:anywhere]">{fullName}</h2>
                    <p className="mt-0.5 mb-1.5 text-xs leading-[19.4px] text-[#3a4a63]">Quản trị viên hệ thống</p>
                </div>
            </div>
            <dl className="mt-5 mb-0 grid grid-cols-2 gap-5 rounded-xl border-[0.8px] border-[#eef1f7] p-4 max-[480px]:grid-cols-1 max-[480px]:gap-4">
                {details.map(({ label, icon, value, regular }) => (
                    <div key={label}>
                        <dt className="flex items-center gap-2 text-xs leading-[19.4px] text-[#6a7994] [&_.anticon]:shrink-0">{icon}{label}</dt>
                        <dd className={`mt-1.5 mb-0 ml-0 text-[13px] leading-[21px] text-[#3a4a63] [overflow-wrap:anywhere] ${regular ? 'font-normal' : 'font-semibold'}`}>{value}</dd>
                    </div>
                ))}
            </dl>
        </>
    );
};

const AdminProfileModal = ({ open, onClose }) => (
    <Modal
        open={open}
        centered
        width={520}
        title="Hồ sơ cá nhân"
        className={profileModalClassName}
        classNames={{
            mask: 'bg-black/45!',
            content: 'rounded-2xl! px-6! py-5! shadow-[0_1px_2px_rgba(15,28,46,0.04),0_8px_24px_rgba(15,28,46,0.25)]! max-[480px]:px-5!',
            header: 'mb-4!',
            footer: 'mt-3!',
        }}
        closable={{ 'aria-label': 'Đóng hồ sơ cá nhân' }}
        closeIcon={<CloseOutlined className="text-[15px] text-[#6a7994]" aria-hidden="true" />}
        onCancel={onClose}
        destroyOnHidden
        footer={<Button type="primary" className={profileCloseButtonClassName} onClick={onClose}>Đóng</Button>}
    >
        {open && <ProfileDetails />}
    </Modal>
);

export default AdminProfileModal;
