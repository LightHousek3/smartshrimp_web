import { RAG_DOCUMENT_MESSAGES, RAG_DOCUMENT_RULES } from '../constants/ragDocument.js';

/**
 * Validate the selected file's name, extension and size before uploading.
 * Return the first validation message, or an empty string when valid.
 * File contents are checked by the backend during document processing.
 */
export const validateRagDocument = (file) => {
    if (!file) return RAG_DOCUMENT_MESSAGES.fileRequired;

    // Count Unicode code points and reject path separators, control characters
    // and the replacement character that can indicate a corrupted filename.
    const name = file.name;
    if (
        typeof name !== 'string' ||
        !name.trim() ||
        Array.from(name).length > RAG_DOCUMENT_RULES.maxNameLength ||
        name.includes('\uFFFD') ||
        Array.from(name).some((char) =>
            '/\\'.includes(char) || char.codePointAt(0) < 32 || char.codePointAt(0) === 127,
        )
    ) {
        return RAG_DOCUMENT_MESSAGES.invalidName;
    }

    // Match path.extname on the backend, including hidden files such as ".pdf".
    const dotIndex = name.lastIndexOf('.');
    const extension = dotIndex > 0 ? name.slice(dotIndex).toLowerCase() : '';
    if (!RAG_DOCUMENT_RULES.extensions.includes(extension)) {
        return RAG_DOCUMENT_MESSAGES.unsupported;
    }
    if (file.size > RAG_DOCUMENT_RULES.maxFileBytes) return RAG_DOCUMENT_MESSAGES.tooLarge;
    if (!Number.isFinite(file.size) || file.size <= 0) return RAG_DOCUMENT_MESSAGES.empty;
    return '';
};

/**
 * Parse either a queued document response or the legacy ingestion result.
 * Verify the expected filename and required fields before accepting success;
 * an invalid response leaves the upload outcome unconfirmed.
 */
export const parseRagDocumentResponse = (envelope, expectedName) => {
    const data = envelope?.data;
    // Queued documents may still be processing or failed; readiness is separate
    // from successfully confirming that the backend accepted the document.
    if (envelope?.success === true && typeof data?.id === 'string' && data.originalFilename === expectedName
        && ['PENDING', 'PROCESSING', 'READY', 'FAILED'].includes(data.status) && Number.isInteger(data.chunkCount)) {
        return data;
    }
    // Legacy ingestion completes synchronously and must report at least one chunk.
    if (
        envelope?.success !== true ||
        data?.sourceFile !== expectedName ||
        !Number.isInteger(data?.chunksCount) ||
        data.chunksCount < 1
    ) {
        throw new Error(RAG_DOCUMENT_MESSAGES.invalidResponse);
    }
    return {
        sourceFile: data.sourceFile,
        chunksCount: data.chunksCount,
        message: typeof envelope.message === 'string' && envelope.message.trim()
            ? envelope.message
            : RAG_DOCUMENT_MESSAGES.created,
    };
};

/**
 * Convert an upload error into a display message and recovery guidance.
 * Prefer the backend message and flag uncertain outcomes so callers can warn
 * that the document may already have been accepted before another upload.
 */
export const getRagDocumentError = (error) => {
    const status = error?.response?.status;
    const backendMessage = error?.response?.data?.message;
    // A timeout, network failure or malformed success response does not prove
    // that processing failed on the server.
    const uncertain = status === 504 || ['ECONNABORTED', 'ETIMEDOUT', 'ERR_NETWORK'].includes(error?.code)
        || error?.message === RAG_DOCUMENT_MESSAGES.invalidResponse;
    let description = 'Bạn có thể thử lại hoặc chọn tài liệu khác.';

    if (uncertain) {
        description = 'Chưa thể xác nhận kết quả. Tài liệu có thể vẫn đang được xử lý. '
            + 'Hãy kiểm tra với quản trị hệ thống trước khi gửi lại; nếu lần thử lại báo trùng tên, '
            + 'tài liệu có thể đã được lưu. Không đổi tên file để gửi lại khi chưa xác nhận.';
    } else if (status === 409) {
        description = 'Chọn tài liệu khác. Hệ thống không ghi đè tài liệu đã có trong kho kiến thức.';
    } else if (status === 401 || status === 403) {
        description = 'Tính năng yêu cầu tài khoản Quản trị viên đang hoạt động. Vui lòng kiểm tra phiên đăng nhập và quyền truy cập.';
    } else if (status === 400) {
        description = 'Kiểm tra nội dung và định dạng file. Với PDF scan, hãy nhận dạng văn bản (OCR) trước khi tải lên.';
    }

    return {
        message: typeof backendMessage === 'string' && backendMessage.trim()
            ? backendMessage
            : uncertain ? 'Chưa thể xác nhận kết quả thêm tài liệu.' : RAG_DOCUMENT_MESSAGES.unavailable,
        description,
        uncertain,
    };
};
