import { Form } from 'antd';
import { SafetyOutlined, SendOutlined } from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
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
import { fieldValidator } from '../../utils/formUtils';
import { useVerificationFlow } from '../../hooks/useVerificationFlow';
import { VerificationSuccess, VerificationGuidance } from '../../components/VerificationResult';

const EMAIL_MAX_LENGTH = 320;
const STEP_LABELS = ['Email', 'OTP', 'Mật khẩu'];
const CARD_HEIGHTS = [480, 480, 523];

const FORGOT_PASSWORD_STEPS = Object.freeze({
    EMAIL: 0,
    OTP: 1,
    NEW_PASSWORD: 2,
});

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
                requiredMark
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
                    requiredMark
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

const ForgotPasswordFlow = () => {
    const [emailForm] = Form.useForm();
    const [otpForm] = Form.useForm();
    const [detailsForm] = Form.useForm();
    const navigate = useNavigate();
    const flow = useVerificationFlow({ activation: false, emailForm, otpForm, detailsForm });
    return <VerificationShell minHeight={CARD_HEIGHTS[flow.step] || 480}>
        {flow.step === 0 && <EmailStep form={emailForm} loading={flow.submitting}
            onBack={() => navigate('/login')} onSubmit={flow.requestOtp} />}
        {flow.step === 1 && <OtpVerificationStep email={flow.email} form={otpForm}
            loading={flow.submitting} resendLoading={flow.resendLoading} resendSeconds={flow.resendSeconds}
            onBack={flow.backToEmail} onResend={flow.resendOtp} onSubmit={flow.verifyOtp}
            currentStep={1} stepLabels={STEP_LABELS} />}
        {flow.step === 2 && <NewPasswordStep form={detailsForm} loading={flow.submitting}
            onBack={flow.backToEmail} onSubmit={flow.complete} />}
        {flow.step === 3 && <VerificationSuccess activation={false} email={flow.email} />}
        <VerificationGuidance code={flow.errorCode} email={flow.email} />
    </VerificationShell>;
};
const ForgotPassword = () => {
    const location = useLocation();
    return <ForgotPasswordFlow key={location.search} />;
};
export default ForgotPassword;
