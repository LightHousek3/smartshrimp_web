import { Form } from 'antd';
import { CheckOutlined, SendOutlined } from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    PROFILE_RULES,
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
import { fieldValidator } from '../../utils/formUtils';
import { useVerificationFlow } from '../../hooks/useVerificationFlow';
import { VerificationSuccess, VerificationGuidance } from '../../components/VerificationResult';

const EMAIL_MAX_LENGTH = 320;
const STEP_LABELS = ['Email', 'OTP', 'Hồ sơ'];
const CARD_HEIGHTS = [480, 480, 675];

const ACTIVATION_STEPS = Object.freeze({
    EMAIL: 0,
    OTP: 1,
    PROFILE: 2,
});

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
                requiredMark
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
                requiredMark
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

const ActivateAccountFlow = () => {
    const [emailForm] = Form.useForm();
    const [otpForm] = Form.useForm();
    const [detailsForm] = Form.useForm();
    const navigate = useNavigate();
    const flow = useVerificationFlow({ activation: true, emailForm, otpForm, detailsForm });
    return <VerificationShell minHeight={CARD_HEIGHTS[flow.step] || 480}>
        {flow.step === 0 && <EmailStep form={emailForm} loading={flow.submitting}
            onBack={() => navigate('/login')} onSubmit={flow.requestOtp} />}
        {flow.step === 1 && <OtpVerificationStep email={flow.email} form={otpForm}
            loading={flow.submitting} resendLoading={flow.resendLoading} resendSeconds={flow.resendSeconds}
            onBack={flow.backToEmail} onResend={flow.resendOtp} onSubmit={flow.verifyOtp}
            currentStep={1} stepLabels={STEP_LABELS} />}
        {flow.step === 2 && <ProfileStep email={flow.email} form={detailsForm} loading={flow.submitting}
            onBack={flow.backToEmail} onSubmit={flow.complete} />}
        {flow.step === 3 && <VerificationSuccess activation={true} email={flow.email} />}
        <VerificationGuidance code={flow.errorCode} email={flow.email} />
    </VerificationShell>;
};
const ActivateAccount = () => {
    const location = useLocation();
    return <ActivateAccountFlow key={location.search} />;
};
export default ActivateAccount;
