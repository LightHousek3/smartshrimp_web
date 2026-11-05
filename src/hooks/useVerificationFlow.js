import { useEffect, useRef, useState } from 'react';
import { App } from 'antd';
import { useLocation } from 'react-router-dom';
import { authAPI } from '../apis';
import { useAuth } from '../contexts/useAuth';
import { getApiErrorMessage } from '../utils/formUtils';
import { normalizeFullName, normalizeVietnamesePhone } from '../utils/profileRules';

export const useVerificationFlow = ({ activation, emailForm, otpForm, detailsForm }) => {
    const [step, setStep] = useState(0);
    const [email, setEmail] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [deadline, setDeadline] = useState(0);
    const [now, setNow] = useState(Date.now);
    const [errorCode, setErrorCode] = useState(null);
    const token = useRef('');
    const cooldowns = useRef(new Map());
    const pending = useRef(false);
    const generation = useRef(0);
    const location = useLocation();
    const { account, clearSession } = useAuth();
    const { message } = App.useApp();

    useEffect(() => {
        generation.current += 1;
        pending.current = false;
        token.current = '';
        const prefill = new URLSearchParams(location.search).get('email') || '';
        emailForm.setFieldsValue({ email: prefill.trim().toLowerCase() });
        return () => { generation.current += 1; token.current = ''; };
    }, [location.search, emailForm]);

    useEffect(() => {
        if (step !== 1 || deadline <= Date.now()) return undefined;
        const timer = window.setInterval(() => {
            setNow(Date.now());
            if (Date.now() >= deadline) window.clearInterval(timer);
        }, 250);
        return () => window.clearInterval(timer);
    }, [deadline, step]);

    const run = async (work) => {
        if (pending.current) return;
        pending.current = true;
        setSubmitting(true);
        const version = generation.current;
        const current = () => generation.current === version;
        try { await work(current); }
        finally {
            if (current()) { pending.current = false; setSubmitting(false); }
        }
    };

    const requestOtp = ({ email: value }) => run(async (current) => {
        const normalized = value.trim().toLowerCase();
        token.current = '';
        try {
            let nextDeadline = cooldowns.current.get(normalized) || 0;
            if (nextDeadline <= Date.now()) {
                const request = activation ? authAPI.requestActivationOtp : authAPI.requestPasswordResetOtp;
                await request(normalized);
                nextDeadline = Date.now() + 60000;
                cooldowns.current.set(normalized, nextDeadline);
            }
            if (!current()) return;
            setEmail(normalized); setDeadline(nextDeadline); setNow(Date.now()); setErrorCode(null);
            otpForm.resetFields(); detailsForm.resetFields(); setStep(1);
            message.success('Nếu email hợp lệ, mã OTP đã được gửi.');
        } catch (error) {
            if (current()) emailForm.setFields([{ name: 'email', errors: [getApiErrorMessage(error, 'Không thể gửi mã. Vui lòng thử lại.')] }]);
        }
    });

    const verifyOtp = ({ code }) => run(async (current) => {
        try {
            const verify = activation ? authAPI.verifyActivationOtp : authAPI.verifyPasswordResetOtp;
            const response = await verify(email, code);
            const actionToken = response.data?.data?.actionToken;
            if (typeof actionToken !== 'string' || !/^[A-Za-z0-9_-]{32,128}$/.test(actionToken)) {
                throw new Error('Phản hồi xác thực không hợp lệ.');
            }
            if (!current()) return;
            token.current = actionToken; setErrorCode(null); detailsForm.resetFields(); setStep(2);
        } catch (error) {
            if (!current()) return;
            setErrorCode(error.response?.data?.errorCode || null);
            otpForm.setFields([{ name: 'code', errors: [getApiErrorMessage(error, 'Không thể xác thực mã OTP. Vui lòng thử lại.')] }]);
        }
    });

    const complete = (values) => run(async (current) => {
        try {
            const payload = { actionToken: token.current, password: values.password };
            if (activation) {
                payload.fullName = normalizeFullName(values.fullName);
                const phone = normalizeVietnamesePhone(values.phone || '');
                payload.phone = phone || null;
            }
            await (activation ? authAPI.activateAccount(payload) : authAPI.resetPassword(payload));
            if (!current()) return;
            if (!activation && account?.email?.toLowerCase() === email) clearSession();
            token.current = ''; detailsForm.resetFields(); setStep(3);
        } catch (error) {
            if (!current()) return;
            const code = error.response?.data?.errorCode;
            setErrorCode(code || null);
            message.error(getApiErrorMessage(error, 'Không thể hoàn tất. Vui lòng thử lại.'));
            if (code === 'AUTH_INVALID_ACTION_TOKEN') {
                token.current = ''; detailsForm.resetFields(); otpForm.resetFields(); setStep(1);
            } else if (error.response?.status === 403) {
                token.current = ''; detailsForm.resetFields(); setStep(1);
            }
        }
    });

    const backToEmail = () => {
        if (pending.current) return;
        token.current = ''; setErrorCode(null); otpForm.resetFields(); detailsForm.resetFields(); setStep(0);
    };
    return { step, email, submitting, resendLoading: submitting, errorCode,
        resendSeconds: Math.max(0, Math.ceil((deadline - now) / 1000)),
        requestOtp, verifyOtp, complete, backToEmail,
        resendOtp: () => requestOtp({ email }),
    };
};
