import { Button, Card, Form, Input, Steps, Typography } from 'antd';
import { ArrowLeftOutlined, CheckOutlined } from '@ant-design/icons';
import OtpInput from './OtpInput';
import { getPasswordStrength } from '../utils/profileRules';

const { Text, Title } = Typography;

const STRENGTH_STYLES = Object.freeze({
    'too-short': { bar: 'bg-[#e44861]', text: 'text-[#d53c55]' },
    medium: { bar: 'bg-[#ffb900]', text: 'text-[#d98314]' },
    'fairly-strong': { bar: 'bg-[#19a7a0]', text: 'text-[#0f918b]' },
    strong: { bar: 'bg-[#15945d]', text: 'text-[#117a4e]' },
});

const FIELD_INPUT_CLASS = 'h-[43px]! rounded-xl! px-3.5! text-[14px]! text-[#0f1c2e]! shadow-none!';

const AUTH_FORM_CLASS =
    '[&_.ant-form-item-label]:pb-1.5! [&_.ant-form-item-label>label]:h-[18px]! [&_.ant-form-item-label>label]:text-[12px]! [&_.ant-form-item-label>label]:font-semibold! [&_.ant-form-item-label>label]:text-[#3a4a63]! [&_.ant-form-item-explain-error]:text-[11px]! [&_.ant-form-item-explain-error]:leading-[16px]! [&_.ant-form-item-extra]:min-h-0! [&_.ant-form-item-extra]:pt-1! [&_.ant-form-item-extra]:text-[11px]! [&_.ant-form-item-extra]:leading-[17px]! [&_.ant-form-item-extra]:text-[#6a7994]!';

export const VerificationForm = ({ className = '', ...props }) => (
    <Form {...props} className={`${AUTH_FORM_CLASS} ${className}`} />
);

export const VerificationInput = ({ className = '', ...props }) => (
    <Input {...props} className={`${FIELD_INPUT_CLASS} ${className}`} />
);

export const VerificationPasswordInput = ({ className = '', ...props }) => (
    <Input.Password {...props} className={`${FIELD_INPUT_CLASS} ${className}`} />
);

const FlowProgress = ({ current, labels }) => (
    <div className="shrink-0 pt-1" aria-label={`Bước ${current + 1} trên ${labels.length}`}>
        <Steps
            size="small"
            current={current}
            responsive={false}
            labelPlacement="vertical"
            items={labels.map((label) => ({ title: label }))}
            className="[&_.ant-steps-item-container]:flex! [&_.ant-steps-item-container]:flex-col! [&_.ant-steps-item-container]:items-center! [&_.ant-steps-item-content]:mt-1! [&_.ant-steps-item-content]:min-h-0! [&_.ant-steps-item-content]:w-16! [&_.ant-steps-item-title]:block! [&_.ant-steps-item-title]:max-w-16! [&_.ant-steps-item-title]:truncate! [&_.ant-steps-item-title]:p-0! [&_.ant-steps-item-title]:text-center! [&_.ant-steps-item-title]:text-[10.5px]! [&_.ant-steps-item-title]:leading-3.5! [&_.ant-steps-item-title]:font-semibold! [&_.ant-steps-item-icon]:m-0! [&_.ant-steps-item-icon]:size-5.5! [&_.ant-steps-item-icon]:leading-5! [&_.ant-steps-icon]:text-[10px]! [&_.ant-steps-item-tail]:top-2.75! [&_.ant-steps-item-tail]:ml-8.75!"
        />
    </div>
);

export const VerificationShell = ({ children, minHeight = 480 }) => (
    <main className="min-h-dvh overflow-y-auto bg-[linear-gradient(to_top,#fff1eb_0%,#ace0f9_100%)] px-4">
        <section className="mx-auto flex min-h-dvh w-full items-center justify-center">
            <Card
                variant="borderless"
                style={{ minHeight }}
                styles={{ body: { padding: '32px 24px' } }}
                className="w-full max-w-105 overflow-hidden rounded-3xl! border border-white/70! bg-white/88! shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)]! backdrop-blur-lg"
            >
                {children}
            </Card>
        </section>
    </main>
);

export const FlowHeader = ({
    title,
    description,
    onBack,
    backDisabled = false,
    currentStep,
    stepLabels,
    completed = false,
}) => (
    <header className="mb-5">
        <div className={`flex items-start justify-between ${completed ? 'h-14' : 'h-11.5'}`}>
            {completed ? (
                <span className="flex size-11 items-center justify-center rounded-2xl bg-[#e2f6f3] text-[20px] text-[#0f9b8e]">
                    <CheckOutlined />
                </span>
            ) : (
                <Button
                    type="text"
                    icon={<ArrowLeftOutlined />}
                    disabled={backDisabled}
                    onClick={onBack}
                    className="h-7.5! rounded-full! bg-white/70! px-2! text-[12px]! font-semibold! text-[#3a4a63]!"
                >
                    Quay lại
                </Button>
            )}
            <FlowProgress current={currentStep} labels={stepLabels} />
        </div>

        <Title
            level={1}
            className="mb-0! font-['Sora']! text-[22px]! leading-8.25! font-extrabold! tracking-[-0.55px]! text-[#0f1c2e]!"
        >
            {title}
        </Title>
        <Text className="block wrap-break-word pt-1 text-[13px]! leading-5.25! text-[#3a4a63]! [&_strong]:font-semibold [&_strong]:text-[#0f1c2e]">
            {description}
        </Text>
    </header>
);

export const FormPanel = ({ children, className = '' }) => (
    <div
        className={`rounded-[18px] border border-[#e5e8f0] bg-white p-5 shadow-[0_1px_1px_rgba(15,28,46,0.04),0_8px_12px_rgba(15,28,46,0.35)] ${className}`}
    >
        {children}
    </div>
);

export const SubmitButton = ({ children, icon, loading, disabled = false }) => (
    <Button
        type="primary"
        htmlType="submit"
        icon={icon}
        loading={loading}
        disabled={disabled}
        className="btn-grad m-0! flex! h-11.25! w-full! items-center! justify-center! rounded-xl! p-0! text-[14px]! font-semibold! normal-case! shadow-[0_1px_2px_rgba(0,0,0,0.1)]!"
    >
        {children}
    </Button>
);

export const OtpVerificationStep = ({
    email,
    form,
    loading,
    resendLoading,
    resendSeconds,
    onBack,
    onResend,
    onSubmit,
    currentStep,
    stepLabels,
}) => (
    <>
        <FlowHeader
            title="Xác thực email"
            description={
                <>
                    Nhập mã 6 chữ số đã được gửi tới <strong>{email}</strong>.
                </>
            }
            backDisabled={loading || resendLoading}
            onBack={onBack}
            currentStep={currentStep}
            stepLabels={stepLabels}
        />

        <FormPanel>
            <VerificationForm
                form={form}
                layout="vertical"
                requiredMark={false}
                disabled={loading || resendLoading}
                onFinish={onSubmit}
            >
                <Form.Item
                    name="code"
                    className="mb-4!"
                    validateFirst
                    rules={[
                        { required: true, message: 'Vui lòng nhập mã OTP.' },
                        { pattern: /^\d{6}$/, message: 'Mã OTP phải gồm đúng 6 chữ số.' },
                    ]}
                >
                    <OtpInput autoFocus disabled={loading || resendLoading} />
                </Form.Item>

                <SubmitButton icon={<CheckOutlined />} loading={loading}>
                    Xác nhận mã
                </SubmitButton>
            </VerificationForm>

            <div className="mt-5 text-center text-[12.5px] leading-4.75 font-semibold">
                {resendSeconds > 0 ? (
                    <Text className="text-[12.5px]! text-[#6a7994]!">
                        Gửi lại mã sau {resendSeconds}s
                    </Text>
                ) : (
                    <Button
                        type="link"
                        disabled={resendLoading || loading}
                        loading={resendLoading}
                        onClick={onResend}
                        className="h-auto! p-0! text-[12.5px]! font-semibold! text-[#0f66b7]!"
                    >
                        Không nhận được mã? Gửi lại
                    </Button>
                )}
            </div>
        </FormPanel>
    </>
);

export const PasswordStrength = ({ password, className = '' }) => {
    if (!password) return null;

    const strength = getPasswordStrength(password);
    const style = STRENGTH_STYLES[strength.key];

    return (
        <div className={`text-[11px] font-semibold ${style.text} ${className}`}>
            <div className="mb-1.5 grid h-1.5 grid-cols-4 gap-1.5">
                {Array.from({ length: 4 }, (_, index) => (
                    <span
                        key={index}
                        className={`rounded-full ${
                            index < strength.level ? style.bar : 'bg-[#f1f5f9]'
                        }`}
                    />
                ))}
            </div>
            {strength.label}
        </div>
    );
};
