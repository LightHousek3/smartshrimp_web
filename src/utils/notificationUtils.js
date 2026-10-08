const TASK_TYPES = new Set([
    'TASK_ASSIGNED',
    'TASK_UPDATED',
    'TASK_DUE_SOON',
    'TASK_OVERDUE',
    'TASK_COMPLETED',
]);

const OPERATION_TYPES = new Set([
    'OPERATION_DUE',
    'OPERATION_OVERDUE',
    'OPERATION_CANCELLED',
]);

const SEASON_TYPES = new Set([
    'SEASON_ASSIGNMENT_CREATED',
    'SEASON_ASSIGNMENT_REPLACED',
    'SEASON_STATUS_CHANGED',
    'SCHEDULE_GENERATION_FAILED',
    'WATER_THRESHOLD_EXCEEDED',
    'HARVEST_DUE',
    'SEASON_COMPLETED',
]);

const DISEASE_CASE_TYPES = new Set([
    'DISEASE_CASE_CREATED',
    'DISEASE_CASE_RESPONSE',
    'DISEASE_CASE_WAITING_INFO',
    'DISEASE_CASE_MONITORING',
    'DISEASE_CASE_RESOLVED',
    'EMERGENCY_CASE_UPDATE',
]);

const PROTOCOL_TYPES = new Set([
    'PRODUCTION_PROTOCOL_PENDING',
    'PRODUCTION_PROTOCOL_REVIEWED',
    'TREATMENT_PROTOCOL_PENDING',
    'TREATMENT_PROTOCOL_REVIEWED',
    'TREATMENT_PROTOCOL_ABORTED',
]);

const TREATMENT_SCHEDULE_TYPES = new Set([
    'TREATMENT_SCHEDULE_READY',
    'TREATMENT_SCHEDULE_COMPLETED',
]);

export const NOTIFICATION_CHANGED_EVENT = 'smartshrimp:notification-changed';

const validOptionalString = (value) => value === null || typeof value === 'string';

const validSummary = (item) =>
    item &&
    typeof item.id === 'string' &&
    item.id.length > 0 &&
    typeof item.title === 'string' &&
    item.title.trim().length > 0 &&
    typeof item.type === 'string' &&
    typeof item.createdAt === 'string' &&
    (!Object.hasOwn(item, 'content') || validOptionalString(item.content)) &&
    (!Object.hasOwn(item, 'referenceType') || validOptionalString(item.referenceType)) &&
    (!Object.hasOwn(item, 'referenceId') || validOptionalString(item.referenceId)) &&
    Object.hasOwn(item, 'readAt') &&
    (item.readAt === null || typeof item.readAt === 'string');

const referencePath = (basePath, referenceId) => {
    const id = referenceId?.trim();
    return id ? `${basePath}/${encodeURIComponent(id)}` : null;
};

export const getNotificationDestination = (notification) => {
    if (!notification) return null;

    const { type, referenceId } = notification;
    if (TASK_TYPES.has(type)) {
        return { path: referencePath('/expert/tasks', referenceId), label: 'Xem nhiệm vụ' };
    }
    if (OPERATION_TYPES.has(type)) {
        return { path: referencePath('/expert/operations', referenceId), label: 'Xem hoạt động' };
    }
    if (SEASON_TYPES.has(type)) {
        return { path: referencePath('/expert/seasons', referenceId), label: 'Xem vụ nuôi' };
    }
    if (DISEASE_CASE_TYPES.has(type)) {
        return { path: referencePath('/expert/disease-cases', referenceId), label: 'Xem ca bệnh' };
    }
    if (PROTOCOL_TYPES.has(type)) {
        const label = type.endsWith('_PENDING') ? 'Xem và duyệt' : 'Xem phác đồ';
        return { path: referencePath('/expert/protocols', referenceId), label };
    }
    if (TREATMENT_SCHEDULE_TYPES.has(type)) {
        return {
            path: referencePath('/expert/treatments', referenceId),
            label: 'Xem lịch điều trị',
        };
    }
    if (type === 'INVENTORY_LOW' || type === 'INVENTORY_INSUFFICIENT') {
        return { path: referencePath('/expert/inventory', referenceId), label: 'Xem kho vật tư' };
    }
    if (type === 'ACCOUNT_STATUS_CHANGED') {
        return { path: '/expert/profile', label: 'Xem hồ sơ' };
    }
    return null;
};

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

export const parseMarkAllNotificationsRead = (payload) => {
    const result = payload?.data;
    if (!result || !Number.isInteger(result.updatedCount) || result.updatedCount < 0 ||
        typeof result.readAt !== 'string') {
        throw new Error('Dữ liệu cập nhật thông báo không hợp lệ.');
    }
    return result;
};
