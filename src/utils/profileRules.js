export const PROFILE_RULES = Object.freeze({
    fullNameMinLength: 2,
    fullNameMaxLength: 50,
    passwordMinLength: 6,
    passwordMaxBytes: 72,
});

const FULL_NAME_PATTERN = /^\p{L}[\p{L}\p{M}]*\.?(?: \p{L}[\p{L}\p{M}]*\.?)*$/u;
const VIETNAMESE_MOBILE_PATTERN = /^0(?:3[2-9]|5[25689]|7[06789]|8[1-9]|9[0-46-9])\d{7}$/;

const characterCount = (value) => Array.from(value).length;
const utf8ByteLength = (value) => new TextEncoder().encode(value).length;

export const normalizeFullName = (value = '') =>
    value.normalize('NFC').trim().replace(/\s+/gu, ' ');

export const validateFullName = (value = '') => {
    const normalized = normalizeFullName(value);
    const length = characterCount(normalized);

    if (length < PROFILE_RULES.fullNameMinLength) {
        return `Họ và tên phải có ít nhất ${PROFILE_RULES.fullNameMinLength} ký tự.`;
    }
    if (length > PROFILE_RULES.fullNameMaxLength) {
        return `Họ và tên không được vượt quá ${PROFILE_RULES.fullNameMaxLength} ký tự.`;
    }
    if (!FULL_NAME_PATTERN.test(normalized)) {
        return 'Họ và tên chỉ được chứa chữ cái, khoảng trắng và dấu chấm cuối từ.';
    }
    return null;
};

export const normalizeVietnamesePhone = (value = '') => {
    const compact = value.trim().replace(/[\s.()-]/g, '');
    return compact.startsWith('+84') ? `0${compact.slice(3)}` : compact;
};

export const validateVietnamesePhone = (value = '') => {
    const normalized = normalizeVietnamesePhone(value);
    if (!normalized) return null;
    return VIETNAMESE_MOBILE_PATTERN.test(normalized)
        ? null
        : 'Số điện thoại không đúng định dạng Việt Nam.';
};

export const validatePassword = (value = '') => {
    if (characterCount(value) < PROFILE_RULES.passwordMinLength) {
        return `Mật khẩu mới cần ít nhất ${PROFILE_RULES.passwordMinLength} ký tự.`;
    }
    if (utf8ByteLength(value) > PROFILE_RULES.passwordMaxBytes) {
        return `Mật khẩu quá dài. Vui lòng sử dụng mật khẩu ngắn hơn.`;
    }
    return null;
};

export const validateCurrentPassword = (value = '') => {
    if (!value) return 'Vui lòng nhập mật khẩu hiện tại.';
    if (utf8ByteLength(value) > PROFILE_RULES.passwordMaxBytes) {
        return `Mật khẩu quá dài. Vui lòng sử dụng mật khẩu ngắn hơn.`;
    }
    return null;
};

export const getPasswordStrength = (password = '') => {
    const length = characterCount(password);
    if (length < PROFILE_RULES.passwordMinLength) {
        return { level: 1, key: 'too-short', label: 'Quá ngắn' };
    }

    const groups = [
        /[a-z]/.test(password),
        /[A-Z]/.test(password),
        /\d/.test(password),
        /[^A-Za-z0-9]/.test(password),
    ].filter(Boolean).length;

    if (length >= 12 && groups === 4) {
        return { level: 4, key: 'strong', label: 'Mạnh' };
    }
    if (length >= 8 && groups >= 3) {
        return { level: 3, key: 'fairly-strong', label: 'Khá mạnh' };
    }
    return { level: 2, key: 'medium', label: 'Trung bình' };
};
