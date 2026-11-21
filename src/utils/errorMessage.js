export const ERROR_MESSAGES = Object.freeze({
    unavailable: 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.',
    connection: 'Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối và thử lại.',
    timeout: 'Kết nối mất quá nhiều thời gian. Vui lòng thử lại.',
    unexpected: 'Không thể hiển thị nội dung. Vui lòng thử lại.',
    request: 'Dữ liệu gửi lên không hợp lệ. Vui lòng kiểm tra lại.',
    session: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
    forbidden: 'Bạn không có quyền thực hiện thao tác này.',
    missing: 'Nội dung không còn tồn tại hoặc bạn không có quyền truy cập.',
    conflict: 'Dữ liệu đã thay đổi. Vui lòng tải lại và kiểm tra trước khi tiếp tục.',
    tooLarge: 'Dữ liệu tải lên quá lớn. Vui lòng kiểm tra dung lượng tệp.',
    rateLimit: 'Bạn thao tác quá nhanh. Vui lòng chờ một lúc rồi thử lại.',
});

const statusMessages = {
    400: ERROR_MESSAGES.request,
    401: ERROR_MESSAGES.session,
    403: ERROR_MESSAGES.forbidden,
    404: ERROR_MESSAGES.missing,
    409: ERROR_MESSAGES.conflict,
    413: ERROR_MESSAGES.tooLarge,
    422: ERROR_MESSAGES.request,
    429: ERROR_MESSAGES.rateLimit,
};

// Operational messages may contain product names, but must not expose diagnostics.
const diagnostics = /prisma|\b(?:TypeError|ReferenceError|SyntaxError|ECONN\w*|EMAXCONNSESSION|SQLSTATE)\b|\bstack\s*:|\bat\s+\S+\s*\([^\n]*:\d+|\b(?:select|insert|update|delete)\b[\s\S]*\b(?:from|into|where|set)\b|[a-z]:\\|<\/?(?:html|body|script|!doctype)\b|\bmust be\b|\binvalid .*invocation\b/i;

export const safeMessage = (value, fallback = ERROR_MESSAGES.unexpected) => {
    if (typeof value !== 'string') return fallback;
    const message = value.trim();
    return message.length > 0 && message.length <= 2000 && /[À-ỹĐđ]/u.test(message)
        && !diagnostics.test(message) ? message : fallback;
};

/** Preserve business errors; translate transport failures and hide server diagnostics. */
export const getErrorMessage = (error, fallback = ERROR_MESSAGES.unexpected) => {
    const status = Number(error?.response?.status);
    if (status === 504 || ['ECONNABORTED', 'ETIMEDOUT'].includes(error?.code)) {
        return ERROR_MESSAGES.timeout;
    }
    if (status >= 500) return ERROR_MESSAGES.unavailable;
    const defaultMessage = statusMessages[status] || safeMessage(fallback);
    if (error?.response) return safeMessage(error.response.data?.message, defaultMessage);
    if (error?.isAxiosError || error?.code === 'ERR_NETWORK') return ERROR_MESSAGES.connection;
    return safeMessage(error?.message, defaultMessage);
};

/** Normalize once at the API boundary without adding a second UI notification. */
export const normalizeApiError = (error) => {
    if (!error || error.code === 'ERR_CANCELED') return error;
    const message = getErrorMessage(error);
    error.message = message;
    if (error.response) {
        const data = error.response.data;
        error.response.data = {
            ...(data && typeof data === 'object' && !Array.isArray(data) ? data : {}),
            message,
        };
        delete error.response.data.stack;
        delete error.response.data.error;
    }
    return error;
};
