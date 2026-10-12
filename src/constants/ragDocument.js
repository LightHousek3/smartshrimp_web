export const RAG_DOCUMENT_CATEGORIES = Object.freeze(['Kỹ thuật nuôi', 'Bệnh trên tôm', 'Khác']);

export const RAG_DOCUMENT_RULES = Object.freeze({
    extensions: Object.freeze(['.pdf', '.docx', '.md', '.txt']),
    maxFileBytes: 10 * 1024 * 1024,
    maxNameLength: 500,
    uploadTimeoutMs: 90000,
});

export const RAG_DOCUMENT_MESSAGES = Object.freeze({
    fileRequired: 'Vui lòng chọn một tài liệu để thêm vào kho kiến thức.',
    singleFile: 'Chỉ được tải lên một tài liệu mỗi lần.',
    invalidName: 'Tên tài liệu không hợp lệ hoặc vượt quá 500 ký tự.',
    unsupported: 'Chỉ hỗ trợ tài liệu PDF, DOCX, MD và TXT.',
    tooLarge: 'Tài liệu không được vượt quá 10 MiB (10.485.760 byte).',
    empty: 'Tài liệu rỗng. Vui lòng chọn file có nội dung văn bản.',
    invalidResponse: 'Phản hồi nạp tài liệu không hợp lệ. Chưa thể xác nhận kết quả.',
    unavailable: 'Không thể thêm tài liệu. Vui lòng kiểm tra kết nối và thử lại.',
    created: 'Đã thêm tài liệu vào kho kiến thức chatbot.',
});
