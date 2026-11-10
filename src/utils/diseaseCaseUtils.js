/** Missing measurements or policy must not be presented as a normal reading. */
export const waterWarning = (raw, threshold) => {
    if (raw == null || raw === '' || !threshold || !Number.isFinite(Number(raw))) return null;
    const value = Number(raw);
    return (threshold.min != null && value < threshold.min)
        || (threshold.max != null && value > threshold.max);
};

export const responseAttachment = attachment => {
    const entry = typeof attachment === 'string' ? { fileUrl: attachment } : attachment;
    const url = entry?.fileUrl ?? entry?.url ?? entry?.filePath ?? entry?.link;
    // Uploaded URLs are external content; never turn executable schemes into links.
    if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) return null;
    return {
        url,
        label: entry.caption || entry.fileName || 'Tệp đính kèm',
        isImage: (entry.mediaType ?? entry.fileType)?.startsWith('image/')
            || /\.(jpg|jpeg|png|webp|gif)(?:[?#]|$)/i.test(url),
    };
};

export const caseResolutionBlock = (status, protocols = [], holds = []) => {
    if (holds.length) return 'Cần gỡ giữ phác đồ nuôi bằng chỉ dẫn trong ca trước khi khép chuyên môn.';
    if (status === 'WAITING_FOR_INFO') return 'Cần xử lý yêu cầu thông tin đang chờ trước khi khép ca.';
    if (status === 'IN_TREATMENT' || protocols.some(protocol => ['APPROVED', 'ACTIVE'].includes(protocol.status))) {
        return 'Còn phác đồ đã duyệt chưa có kết quả kết thúc điều trị. Số lịch đã sinh không phản ánh toàn bộ liệu trình.';
    }
    if (protocols.some(protocol => ['DRAFT', 'REJECTED', 'PENDING_APPROVAL'].includes(protocol.status))) {
        return 'Cần xử lý hết bản nháp, bị từ chối hoặc đang chờ duyệt trước khi khép ca.';
    }
    return null;
};
