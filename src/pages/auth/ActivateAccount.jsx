import { useEffect, useState } from 'react';
import { App, Form } from 'antd';
import { CheckOutlined, SendOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../../apis';
import {
    PROFILE_RULES,
    normalizeFullName,
    normalizeVietnamesePhone,
    validateFullName,
    validatePassword,
    validateVietnamesePhone,
} from '../../utils/profileRules';
import {
    FlowHeader,
    FormPanel,
    OtpVerificationStep,
    SubmitButton,
    VerificationForm,
    VerificationInput,
    VerificationPasswordInput,
    VerificationShell,
} from '../../components';
import { fieldValidator, getApiErrorMessage } from '../../utils/formUtils';

const EMAIL_MAX_LENGTH = 320;
const RESEND_DELAY_SECONDS = 60;
const STEP_LABELS = ['Email', 'OTP', 'Hồ sơ'];
const CARD_HEIGHTS = [480, 480, 675];

const ACTIVATION_STEPS = Object.freeze({
    EMAIL: 0,
    OTP: 1,
    PROFILE: 2,
});

const isExpiredVerification = (message) =>
    /phiên xác thực không hợp lệ|mã otp.*hết hạn|mã otp.*vô hiệu hóa/i.test(message);

const EmailStep = ({ form, loading, onBack, onSubmit }) => (
    <>
        <FlowHeader
            title="Kích hoạt tài khoản"
            description="Nhập email đã đăng ký cho tài khoản của bạn. Hệ thống sẽ gửi mã xác thực 6 chữ số đến hộp thư của bạn."
            backDisabled={loading}
            onBack={onBack}
            currentStep={ACTIVATION_STEPS.EMAIL}
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
                    label="Email tài khoản"
                    className="mb-4!"
                    validateFirst
                    normalize={(value) => value?.trim().toLowerCase()}
                    rules={[
                        { required: true, message: 'Vui lòng nhập email tài khoản.' },
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
                    Gửi mã kích hoạt
                </SubmitButton>
            </VerificationForm>
        </FormPanel>
    </>
);

const ProfileStep = ({ email, form, loading, onSubmit }) => (
    <>
        <FlowHeader
            title="Hoàn tất hồ sơ"
            description={
                <>
                    Email <strong>{email}</strong> đã xác thực. Bổ sung thông tin và đặt mật khẩu để
                    hoàn tất.
                </>
            }
            currentStep={ACTIVATION_STEPS.PROFILE}
            stepLabels={STEP_LABELS}
            completed
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
                    name="fullName"
                    label="Họ và tên"
                    className="mb-4!"
                    validateFirst
                    rules={[
                        { required: true, message: 'Vui lòng nhập họ và tên.' },
                        { validator: fieldValidator(validateFullName) },
                    ]}
                >
                    <VerificationInput
                        placeholder="VD: Trần Quốc Bảo"
                        autoComplete="name"
                        maxLength={PROFILE_RULES.fullNameMaxLength}
                        autoFocus
                    />
                </Form.Item>

                <Form.Item
                    name="phone"
                    label="Số điện thoại"
                    className="mb-4!"
                    validateFirst
                    rules={[{ validator: fieldValidator(validateVietnamesePhone) }]}
                >
                    <VerificationInput
                        placeholder="09xx xxx xxx"
                        autoComplete="tel"
                        inputMode="tel"
                        maxLength={20}
                    />
                </Form.Item>

                <Form.Item
                    name="password"
                    label="Mật khẩu"
                    className="mb-4!"
                    validateFirst
                    extra={`Tối thiểu ${PROFILE_RULES.passwordMinLength} ký tự.`}
                    rules={[
                        { required: true, message: 'Vui lòng nhập mật khẩu.' },
                        {
                            validator: fieldValidator((value) =>
                                validatePassword(value, { label: 'Mật khẩu' }),
                            ),
                        },
                    ]}
                >
                    <VerificationPasswordInput placeholder="••••••••" autoComplete="new-password" />
                </Form.Item>

                <Form.Item
                    name="confirmPassword"
                    label="Nhập lại mật khẩu"
                    className="mb-4!"
                    dependencies={['password']}
                    rules={[
                        { required: true, message: 'Vui lòng nhập lại mật khẩu.' },
                        ({ getFieldValue }) => ({
                            validator: (_, value) =>
                                !value || getFieldValue('password') === value
                                    ? Promise.resolve()
                                    : Promise.reject(new Error('Mật khẩu nhập lại không khớp.')),
                        }),
                    ]}
                >
                    <VerificationPasswordInput placeholder="••••••••" autoComplete="new-password" />
                </Form.Item>

                <SubmitButton icon={<CheckOutlined />} loading={loading}>
                    Hoàn tất &amp; kích hoạt
                </SubmitButton>
            </VerificationForm>
        </FormPanel>
    </>
);

const ActivateAccount = () => {
    const [step, setStep] = useState(ACTIVATION_STEPS.EMAIL);
    const [email, setEmail] = useState('');
    const [actionToken, setActionToken] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const [resendSeconds, setResendSeconds] = useState(0);
    const [emailForm] = Form.useForm();
    const [otpForm] = Form.useForm();
    const [profileForm] = Form.useForm();
    const navigate = useNavigate();
    const { message } = App.useApp();

    useEffect(() => {
        if (step !== ACTIVATION_STEPS.OTP || resendSeconds <= 0) return undefined;

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
            const response = await authAPI.requestActivationOtp(normalizedEmail);
            setEmail(normalizedEmail);
            setActionToken('');
            setResendSeconds(RESEND_DELAY_SECONDS);
            otpForm.resetFields();
            profileForm.resetFields();
            setStep(ACTIVATION_STEPS.OTP);
            message.success(response.data?.message || 'Nếu email hợp lệ, mã OTP đã được gửi.');
        } catch (error) {
            emailForm.setFields([
                {
                    name: 'email',
                    errors: [
                        getApiErrorMessage(error, 'Không thể gửi mã kích hoạt. Vui lòng thử lại.'),
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
            const response = await authAPI.verifyActivationOtp(email, code);
            const verifiedActionToken = response.data?.data?.actionToken;
            if (!verifiedActionToken) throw new Error('Phản hồi xác thực OTP không hợp lệ.');

            setActionToken(verifiedActionToken);
            profileForm.resetFields();
            setStep(ACTIVATION_STEPS.PROFILE);
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
            const response = await authAPI.requestActivationOtp(email);
            otpForm.resetFields();
            setResendSeconds(RESEND_DELAY_SECONDS);
            message.success(response.data?.message || 'Nếu email hợp lệ, mã OTP đã được gửi.');
        } catch (error) {
            message.error(getApiErrorMessage(error, 'Không thể gửi lại mã OTP. Vui lòng thử lại.'));
        } finally {
            setResendLoading(false);
        }
    };

    const backToEmail = () => {
        setActionToken('');
        setResendSeconds(0);
        otpForm.resetFields();
        profileForm.resetFields();
        setStep(ACTIVATION_STEPS.EMAIL);
    };

    const completeActivation = async ({ fullName, phone, password }) => {
        setSubmitting(true);

        try {
            const response = await authAPI.activateAccount({
                actionToken,
                fullName: normalizeFullName(fullName),
                phone: phone ? normalizeVietnamesePhone(phone) : null,
                password,
            });

            message.success(response.data?.message || 'Kích hoạt tài khoản thành công.');
            navigate('/login', { replace: true });
        } catch (error) {
            const errorMessage = getApiErrorMessage(
                error,
                'Không thể hoàn tất kích hoạt tài khoản. Vui lòng thử lại.',
            );

            if (isExpiredVerification(errorMessage)) {
                message.error(errorMessage);
                setActionToken('');
                setResendSeconds(0);
                otpForm.resetFields();
                profileForm.resetFields();
                setStep(ACTIVATION_STEPS.OTP);
            } else if (/họ và tên|fullname/i.test(errorMessage)) {
                profileForm.setFields([{ name: 'fullName', errors: [errorMessage] }]);
            } else if (/số điện thoại|phone/i.test(errorMessage)) {
                profileForm.setFields([{ name: 'phone', errors: [errorMessage] }]);
            } else if (/mật khẩu|password/i.test(errorMessage)) {
                profileForm.setFields([{ name: 'password', errors: [errorMessage] }]);
            } else {
                message.error(errorMessage);
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <VerificationShell minHeight={CARD_HEIGHTS[step]}>
            {step === ACTIVATION_STEPS.EMAIL ? (
                <EmailStep
                    form={emailForm}
                    loading={submitting}
                    onBack={() => navigate('/login')}
                    onSubmit={requestOtp}
                />
            ) : null}

            {step === ACTIVATION_STEPS.OTP ? (
                <OtpVerificationStep
                    email={email}
                    form={otpForm}
                    loading={submitting}
                    resendLoading={resendLoading}
                    resendSeconds={resendSeconds}
                    onBack={backToEmail}
                    onResend={resendOtp}
                    onSubmit={verifyOtp}
                    currentStep={ACTIVATION_STEPS.OTP}
                    stepLabels={STEP_LABELS}
                />
            ) : null}

            {step === ACTIVATION_STEPS.PROFILE ? (
                <ProfileStep
                    email={email}
                    form={profileForm}
                    loading={submitting}
                    onSubmit={completeActivation}
                />
            ) : null}
        </VerificationShell>
    );
};

export default ActivateAccount;
