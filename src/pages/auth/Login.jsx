import { useState } from 'react';
import { App, Button, Form, Input } from 'antd';
import { CheckOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { BRAND_LOGO_URL, getRoleHomePath } from '../../constants/portal';

const passwordByteLength = (value) => new TextEncoder().encode(value || '').length;

const Login = () => {
    const [submitting, setSubmitting] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();
    const { message } = App.useApp();

    const showPendingFeature = (feature) => {
        message.info(`${feature} sẽ được triển khai trong hạng mục xác thực tiếp theo.`);
    };

    const onFinish = async (values) => {
        setSubmitting(true);

        try {
            const user = await login(values);

            message.success('Đăng nhập thành công!');
            navigate(getRoleHomePath(user.role), { replace: true });
        } catch (error) {
            const errorMessage =
                error.response?.data?.message ||
                error.message ||
                'Đăng nhập thất bại. Vui lòng thử lại!';
            message.error(errorMessage);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <main className="login-page">
            <section className="login-shell" aria-labelledby="login-title">
                <div className="login-brand">
                    <img src={BRAND_LOGO_URL} alt="SmartShrimp" className="login-logo" />
                    <p>Nền tảng vận hành &amp; tư vấn kỹ thuật nuôi tôm thông minh</p>
                </div>

                <div className="login-card">
                    <h1 id="login-title">Đăng nhập</h1>

                    <Form
                        name="smartshrimp-login"
                        layout="vertical"
                        autoComplete="on"
                        requiredMark={false}
                        onFinish={onFinish}
                        disabled={submitting}
                    >
                        <Form.Item
                            name="email"
                            label="Email"
                            normalize={(value) => value?.trim().toLowerCase()}
                            rules={[
                                { required: true, message: 'Vui lòng nhập email!' },
                                { type: 'email', message: 'Email không hợp lệ!' },
                                { max: 320, message: 'Email không được vượt quá 320 ký tự!' },
                            ]}
                        >
                            <Input
                                prefix={<MailOutlined />}
                                placeholder="ban@trangtrai.vn"
                                autoComplete="email"
                                inputMode="email"
                                autoCapitalize="none"
                                spellCheck={false}
                                maxLength={320}
                            />
                        </Form.Item>

                        <Form.Item
                            name="password"
                            label="Mật khẩu"
                            rules={[
                                { required: true, message: 'Vui lòng nhập mật khẩu!' },
                                {
                                    validator: (_, value) =>
                                        passwordByteLength(value) <= 72
                                            ? Promise.resolve()
                                            : Promise.reject(
                                                  new Error(
                                                      'Mật khẩu không được vượt quá 72 byte!',
                                                  ),
                                              ),
                                },
                            ]}
                        >
                            <Input.Password
                                prefix={<LockOutlined />}
                                placeholder="Nhập mật khẩu"
                                autoComplete="current-password"
                            />
                        </Form.Item>

                        <Form.Item className="login-submit-row">
                            <Button
                                type="primary"
                                htmlType="submit"
                                className="btn-grad login-submit"
                                icon={<CheckOutlined style={{ marginRight: '12px' }} />}
                                loading={submitting}
                            >
                                Đăng nhập
                            </Button>
                        </Form.Item>
                    </Form>

                    <div className="login-actions">
                        <button
                            type="button"
                            onClick={() => showPendingFeature('Kích hoạt tài khoản')}
                        >
                            Kích hoạt tài khoản
                        </button>
                        <button type="button" onClick={() => showPendingFeature('Quên mật khẩu')}>
                            Quên mật khẩu?
                        </button>
                    </div>
                </div>

                <p className="login-audience">
                    Dành cho Chuyên gia thủy sản &amp; Quản trị hệ thống.
                </p>
            </section>
        </main>
    );
};

export default Login;
