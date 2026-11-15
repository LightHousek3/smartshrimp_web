/** Missing measurements or policy must not be presented as a normal reading. */
export const waterWarning = (raw, threshold) => {
    if (raw == null || raw === '' || !threshold || !Number.isFinite(Number(raw))) return null;
    const value = Number(raw);
    return (threshold.min != null && value < threshold.min)
        || (threshold.max != null && value > threshold.max);
};

/** Read supported attachment shapes while rejecting executable URL schemes. */
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

/** Prefer server resolution guards; retain conservative checks for older detail responses. */
export const caseResolutionBlock = (status, protocols = [], holds = [], resolution) => {
    if (resolution) return resolution.blockedReason || null;
    if (holds.length) return 'Cần gỡ giữ phác đồ nuôi bằng quyết định chăm sóc trước khi khép ca.';
    if (status === 'IN_TREATMENT' || protocols.some(protocol => protocol.status === 'ACTIVE')) {
        return 'Cần kết thúc hoặc dừng phác đồ đang có hiệu lực trước khi khép ca.';
    }
    return null;
};
