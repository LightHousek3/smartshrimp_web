const validSummary = (item) =>
    item &&
    typeof item.id === 'string' &&
    item.id.length > 0 &&
    typeof item.title === 'string' &&
    item.title.trim().length > 0 &&
    typeof item.type === 'string' &&
    typeof item.createdAt === 'string' &&
    Object.hasOwn(item, 'readAt') &&
    (item.readAt === null || typeof item.readAt === 'string');

export const parseNotificationPage = (payload) => {
    const items = payload?.data;
    const meta = payload?.meta;
    if (!Array.isArray(items) || !items.every(validSummary) || !meta ||
        !Number.isInteger(meta.totalResults) || meta.totalResults < 0 ||
        !Number.isInteger(meta.limit) || meta.limit < 1 || meta.limit > 100 ||
        typeof meta.hasNextPage !== 'boolean' ||
        (meta.hasNextPage && (!items.length || typeof meta.nextCursor !== 'string' ||
            !meta.nextCursor))) {
        throw new Error('Dữ liệu thông báo không hợp lệ.');
    }
    return {
        items,
        totalResults: meta.totalResults,
        hasNextPage: meta.hasNextPage,
        nextCursor: meta.nextCursor ?? null,
    };
};

export const parseNotificationDetail = (payload) => {
    const item = payload?.data;
    if (!validSummary(item) || typeof item.readAt !== 'string' ||
        !Object.hasOwn(item, 'content') ||
        (item.content !== null && typeof item.content !== 'string')) {
        throw new Error('Dữ liệu chi tiết thông báo không hợp lệ.');
    }
    return item;
};
