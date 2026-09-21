import { useEffect, useState } from 'react';
import { App, Form } from 'antd';
import { SafetyOutlined, SendOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../../apis';
import { PROFILE_RULES, validatePassword } from '../../utils/profileRules';
import {
    FlowHeader,
    FormPanel,
    OtpVerificationStep,
    PasswordStrength,
    SubmitButton,
    VerificationForm,
    VerificationInput,
    VerificationPasswordInput,
    VerificationShell,
} from '../../components';
import { fieldValidator, getApiErrorMessage } from '../../utils/formUtils';

const EMAIL_MAX_LENGTH = 320;
const RESEND_DELAY_SECONDS = 60;
const STEP_LABELS = ['Email', 'OTP', 'Mật khẩu'];
const CARD_HEIGHTS = [480, 480, 523];

const FORGOT_PASSWORD_STEPS = Object.freeze({
    EMAIL: 0,
    OTP: 1,
    NEW_PASSWORD: 2,
});

const isExpiredVerification = (message) =>
    /phiên xác thực không hợp lệ|mã otp.*hết hạn|mã otp.*vô hiệu hóa/i.test(message);

const EmailStep = ({ form, loading, onBack, onSubmit }) => (
    <>
        <FlowHeader
            title="Quên mật khẩu"
            description="Nhập địa chỉ email đã đăng ký. Hệ thống sẽ gửi mã xác thực 6 chữ số để bạn đặt lại mật khẩu."
            backDisabled={loading}
            onBack={onBack}
            currentStep={FORGOT_PASSWORD_STEPS.EMAIL}
            stepLabels={STEP_LABELS}
        />

        <FormPanel>
            <VerificationForm
                form={form}
                layout="vertical"
                requiredMark={false}
                disabled={loading}
                onFinish={onSubmit}
            >
                <Form.Item
                    name="email"
                    label="Địa chỉ email"
                    className="mb-4!"
                    validateFirst
                    normalize={(value) => value?.trim().toLowerCase()}
                    rules={[
                        { required: true, message: 'Vui lòng nhập địa chỉ email.' },
                        { type: 'email', message: 'Email không hợp lệ.' },
                        {
                            max: EMAIL_MAX_LENGTH,
                            message: `Email không được vượt quá ${EMAIL_MAX_LENGTH} ký tự.`,
                        },
                    ]}
                >
                    <VerificationInput
                        placeholder="ban@trangtrai.vn"
                        autoComplete="email"
                        inputMode="email"
                        autoCapitalize="none"
                        spellCheck={false}
                        maxLength={EMAIL_MAX_LENGTH}
                        autoFocus
                    />
                </Form.Item>

                <SubmitButton icon={<SendOutlined />} loading={loading}>
                    Gửi mã xác thực
                </SubmitButton>
            </VerificationForm>
        </FormPanel>
    </>
);

const NewPasswordStep = ({ form, loading, onBack, onSubmit }) => {
    const password = Form.useWatch('password', form) || '';

    return (
        <>
            <FlowHeader
                title="Đặt mật khẩu mới"
                description={`Tạo mật khẩu mới tối thiểu ${PROFILE_RULES.passwordMinLength} ký tự cho tài khoản của bạn.`}
                backDisabled={loading}
                onBack={onBack}
                currentStep={FORGOT_PASSWORD_STEPS.NEW_PASSWORD}
                stepLabels={STEP_LABELS}
            />

            <FormPanel>
                <VerificationForm
                    form={form}
                    layout="vertical"
                    requiredMark={false}
                    disabled={loading}
                    onFinish={onSubmit}
                >
                    <Form.Item
                        name="password"
                        label="Mật khẩu mới"
                        className="mb-4!"
                        validateFirst
                        extra={`Tối thiểu ${PROFILE_RULES.passwordMinLength} ký tự.`}
                        rules={[
                            { required: true, message: 'Vui lòng nhập mật khẩu mới.' },
                            { validator: fieldValidator(validatePassword) },
                        ]}
                    >
                        <VerificationPasswordInput
                            placeholder="123456"
                            autoComplete="new-password"
                            autoFocus
                            className="font-['JetBrains_Mono']!"
                        />
                    </Form.Item>

                    <Form.Item
                        name="confirmPassword"
                        label="Xác nhận mật khẩu mới"
                        className="mb-4!"
                        dependencies={['password']}
                        rules={[
                            { required: true, message: 'Vui lòng xác nhận mật khẩu mới.' },
                            ({ getFieldValue }) => ({
                                validator: (_, value) =>
                                    !value || getFieldValue('password') === value
                                        ? Promise.resolve()
                                        : Promise.reject(
                                              new Error('Mật khẩu xác nhận không khớp.'),
                                          ),
                            }),
                        ]}
                    >
                        <VerificationPasswordInput
                            placeholder="••••••••"
                            autoComplete="new-password"
                        />
                    </Form.Item>

                    <PasswordStrength password={password} className="mb-4" />

                    <SubmitButton icon={<SafetyOutlined />} loading={loading}>
                        Xác nhận mật khẩu mới
                    </SubmitButton>
                </VerificationForm>
            </FormPanel>
        </>
    );
};

const ForgotPassword = () => {
    const [step, setStep] = useState(FORGOT_PASSWORD_STEPS.EMAIL);
    const [email, setEmail] = useState('');
    const [actionToken, setActionToken] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const [resendSeconds, setResendSeconds] = useState(0);
    const [emailForm] = Form.useForm();
    const [otpForm] = Form.useForm();
    const [passwordForm] = Form.useForm();
    const navigate = useNavigate();
    const { message } = App.useApp();

    useEffect(() => {
        if (step !== FORGOT_PASSWORD_STEPS.OTP || resendSeconds <= 0) return undefined;

        const timer = window.setTimeout(
            () => setResendSeconds((current) => Math.max(0, current - 1)),
            1000,
        );
        return () => window.clearTimeout(timer);
    }, [resendSeconds, step]);

    const requestOtp = async ({ email: submittedEmail }) => {
        const normalizedEmail = submittedEmail.trim().toLowerCase();
        setSubmitting(true);

        try {
            const response = await authAPI.requestPasswordResetOtp(normalizedEmail);
            setEmail(normalizedEmail);
            setActionToken('');
            setResendSeconds(RESEND_DELAY_SECONDS);
            otpForm.resetFields();
            passwordForm.resetFields();
            setStep(FORGOT_PASSWORD_STEPS.OTP);
            message.success(response.data?.message || 'Nếu email hợp lệ, mã OTP đã được gửi.');
        } catch (error) {
            emailForm.setFields([
                {
                    name: 'email',
                    errors: [
                        getApiErrorMessage(
                            error,
                            'Không thể gửi mã xác thực. Vui lòng thử lại.',
                        ),
                    ],
                },
            ]);
        } finally {
            setSubmitting(false);
        }
    };

    const verifyOtp = async ({ code }) => {
        setSubmitting(true);

        try {
            const response = await authAPI.verifyPasswordResetOtp(email, code);
            const verifiedActionToken = response.data?.data?.actionToken;
            if (!verifiedActionToken) throw new Error('Phản hồi xác thực OTP không hợp lệ.');

            setActionToken(verifiedActionToken);
            passwordForm.resetFields();
            setStep(FORGOT_PASSWORD_STEPS.NEW_PASSWORD);
        } catch (error) {
            const errorMessage = getApiErrorMessage(
                error,
                'Không thể xác thực mã OTP. Vui lòng thử lại.',
            );
            otpForm.setFields([{ name: 'code', errors: [errorMessage] }]);
            if (isExpiredVerification(errorMessage)) setResendSeconds(0);
        } finally {
            setSubmitting(false);
        }
    };

    const resendOtp = async () => {
        setResendLoading(true);

        try {
            const response = await authAPI.requestPasswordResetOtp(email);
            otpForm.resetFields();
            setResendSeconds(RESEND_DELAY_SECONDS);
            message.success(response.data?.message || 'Nếu email hợp lệ, mã OTP đã được gửi.');
        } catch (error) {
            message.error(
                getApiErrorMessage(error, 'Không thể gửi lại mã OTP. Vui lòng thử lại.'),
            );
        } finally {
            setResendLoading(false);
        }
    };

    const restartFlow = () => {
        setActionToken('');
        setResendSeconds(0);
        otpForm.resetFields();
        passwordForm.resetFields();
        setStep(FORGOT_PASSWORD_STEPS.EMAIL);
    };

    const resetPassword = async ({ password }) => {
        setSubmitting(true);

        try {
            const response = await authAPI.resetPassword({ actionToken, password });
            message.success(response.data?.message || 'Đặt lại mật khẩu thành công.');
            navigate('/login', { replace: true });
        } catch (error) {
            const errorMessage = getApiErrorMessage(
                error,
                'Không thể đặt lại mật khẩu. Vui lòng thử lại.',
            );

            if (isExpiredVerification(errorMessage)) {
                message.error(errorMessage);
                restartFlow();
            } else if (/mật khẩu|password/i.test(errorMessage)) {
                passwordForm.setFields([{ name: 'password', errors: [errorMessage] }]);
            } else {
                message.error(errorMessage);
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <VerificationShell minHeight={CARD_HEIGHTS[step]}>
            {step === FORGOT_PASSWORD_STEPS.EMAIL ? (
                <EmailStep
                    form={emailForm}
                    loading={submitting}
                    onBack={() => navigate('/login')}
                    onSubmit={requestOtp}
                />
            ) : null}

            {step === FORGOT_PASSWORD_STEPS.OTP ? (
                <OtpVerificationStep
                    email={email}
                    form={otpForm}
                    loading={submitting}
                    resendLoading={resendLoading}
                    resendSeconds={resendSeconds}
                    onBack={restartFlow}
                    onResend={resendOtp}
                    onSubmit={verifyOtp}
                    currentStep={FORGOT_PASSWORD_STEPS.OTP}
                    stepLabels={STEP_LABELS}
                />
            ) : null}

            {step === FORGOT_PASSWORD_STEPS.NEW_PASSWORD ? (
                <NewPasswordStep
                    form={passwordForm}
                    loading={submitting}
                    onBack={restartFlow}
                    onSubmit={resetPassword}
                />
            ) : null}
        </VerificationShell>
    );
};

export default ForgotPassword;
