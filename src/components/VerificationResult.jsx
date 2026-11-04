import { Alert, Button, Result } from 'antd';
import { Link, useNavigate } from 'react-router-dom';

export const VerificationGuidance = ({ code, email }) => {
    const navigate = useNavigate();
    const target = code === 'AUTH_PENDING_ACTIVATION' ? '/activate-account'
        : code === 'AUTH_ACCOUNT_ALREADY_ACTIVATED' ? '/login' : null;
    if (!target) return null;
    return <Alert className="mt-4" type="info" showIcon message={
        <Button type="link" className="h-auto! p-0!"
            onClick={() => navigate(`${target}?email=${encodeURIComponent(email)}`)}>
            {code === 'AUTH_PENDING_ACTIVATION' ? 'Kích hoạt tài khoản' : 'Đăng nhập'}
        </Button>
    } />;
};

export const VerificationSuccess = ({ activation, email }) => <Result status="success"
    title={activation ? 'Kích hoạt tài khoản thành công' : 'Đặt lại mật khẩu thành công'}
    subTitle="Kỹ thuật viên và Chủ trang trại mở ứng dụng SmartShrimp để đăng nhập. Chuyên gia tiếp tục đăng nhập trên Web."
    extra={[
        <Button key="app" href="smartshrimp:///login">Mở ứng dụng</Button>,
        <Link key="web" to={`/login?email=${encodeURIComponent(email)}`}><Button type="primary">Đăng nhập trên Web</Button></Link>,
    ]}
/>;
