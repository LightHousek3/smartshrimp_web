const TASK_TYPES = new Set([
    'TASK_ASSIGNED',
    'TASK_UPDATED',
    'TASK_DUE_SOON',
    'TASK_OVERDUE',
    'TASK_COMPLETED',
]);

const OPERATION_TYPES = new Set(['OPERATION_DUE', 'OPERATION_OVERDUE', 'OPERATION_CANCELLED']);

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

/** Route notices by typed references, leaving missing or unsupported destinations non-navigable. */
export const getNotificationDestination = (notification) => {
    if (!notification) return null;

    const { type, referenceType, referenceId } = notification;
    // Older generation notices carried a protocol ID, which cannot address a season page.
    if (type === 'SCHEDULE_GENERATION_FAILED' && referenceType === 'protocol') return null;
    if (type === 'TREATMENT_SCHEDULE_READY' && referenceType === 'aquaculture_season') {
        return {
            path: referencePath('/expert/seasons', referenceId),
            label: 'Xem vụ nuôi đang điều trị',
        };
    }
    if (type === 'SYSTEM' && referenceType === 'disease_case') {
        return {
            path: referencePath('/expert/disease-cases', referenceId),
            label: 'Xem ca và quyết định chăm sóc',
        };
    }
    if (
        referenceType === 'disease_case' &&
        (DISEASE_CASE_TYPES.has(type) ||
            PROTOCOL_TYPES.has(type) ||
            TREATMENT_SCHEDULE_TYPES.has(type))
    ) {
        return { path: referencePath('/expert/disease-cases', referenceId), label: 'Xem ca bệnh' };
    }
    if (type === 'OPERATION_CANCELLED' && referenceType === 'aquaculture_season') {
        const path = referencePath('/expert/seasons', referenceId);
        return { path: path && `${path}?tab=protocols`, label: 'Xem vụ nuôi bị ảnh hưởng' };
    }
    if (type === 'SYSTEM' && referenceType === 'season_protocol_material') {
        const path = referencePath('/expert/seasons', referenceId);
        return { path: path && `${path}?tab=protocols`, label: 'Xem phác đồ liên quan' };
    }
    if (type === 'SYSTEM' && referenceType === 'disease_case_material') {
        const path = referencePath('/expert/disease-cases', referenceId);
        return { path: path && `${path}?tab=treatment`, label: 'Xem phác đồ điều trị' };
    }
    if (type === 'SYSTEM' && referenceType === 'production_protocol_template') {
        return {
            path: referencePath('/expert/protocols', referenceId),
            label: 'Xem phác đồ mẫu',
        };
    }
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

/** Validate notification rows and cursor metadata before appending them to the loaded list. */
export const parseNotificationPage = (payload) => {
    const items = payload?.data;
    const meta = payload?.meta;
    if (
        !Array.isArray(items) ||
        !items.every(validSummary) ||
        !meta ||
        !Number.isInteger(meta.totalResults) ||
        meta.totalResults < 0 ||
        !Number.isInteger(meta.limit) ||
        meta.limit < 1 ||
        meta.limit > 100 ||
        typeof meta.hasNextPage !== 'boolean' ||
        (meta.hasNextPage &&
            (!items.length || typeof meta.nextCursor !== 'string' || !meta.nextCursor))
    ) {
        throw new Error('Dữ liệu thông báo không hợp lệ.');
    }
    return {
        items,
        totalResults: meta.totalResults,
        hasNextPage: meta.hasNextPage,
        nextCursor: meta.nextCursor ?? null,
    };
};

/** Require the read timestamp and detail content returned by the notification detail endpoint. */
export const parseNotificationDetail = (payload) => {
    const item = payload?.data;
    if (
        !validSummary(item) ||
        typeof item.readAt !== 'string' ||
        !Object.hasOwn(item, 'content') ||
        (item.content !== null && typeof item.content !== 'string')
    ) {
        throw new Error('Dữ liệu chi tiết thông báo không hợp lệ.');
    }
    return item;
};

/** Accept only a valid affected count and timestamp from the bulk read operation. */
export const parseMarkAllNotificationsRead = (payload) => {
    const result = payload?.data;
    if (
        !result ||
        !Number.isInteger(result.updatedCount) ||
        result.updatedCount < 0 ||
        typeof result.readAt !== 'string'
    ) {
        throw new Error('Dữ liệu cập nhật thông báo không hợp lệ.');
    }
    return result;
};
