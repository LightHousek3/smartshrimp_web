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

/** Only link to implemented expert screens; indirect references must be resolved by the API. */
export const getNotificationDestination = (notification) => {
    if (!notification) return null;
    const { type, referenceId } = notification;
    if (type === 'ACCOUNT_STATUS_CHANGED') {
        return { path: '/expert/profile', label: 'Xem hồ sơ' };
    }
    if (!referenceId?.trim()) return null;
    const reference = notification.referenceType?.trim().toLowerCase();
    const seasonPath = referencePath('/expert/seasons', referenceId);
    const casePath = referencePath('/expert/disease-cases', referenceId);
    switch (reference) {
        case 'disease_case_material':
            return { path: `${casePath}?tab=treatment`, label: 'Xem phác đồ điều trị' };
        case 'disease_case':
            return type?.startsWith('TREATMENT_')
                ? { path: `${casePath}?tab=treatment`, label: 'Xem phác đồ điều trị' }
                : { path: casePath, label: 'Xem ca bệnh' };
        case 'production_protocol_template':
            return { path: referencePath('/expert/protocols', referenceId), label: 'Xem phác đồ mẫu' };
        case 'season_protocol_material':
            return { path: `${seasonPath}?tab=protocols`, label: 'Xem phác đồ liên quan' };
        case 'season':
        case 'aquaculture_season': {
            if (type?.startsWith('TREATMENT_')) {
                return { path: `${seasonPath}?tab=diseases`, label: 'Xem ca bệnh của vụ nuôi' };
            }
            const protocols = type?.startsWith('PRODUCTION_') ||
                type?.startsWith('OPERATION_') || type === 'SCHEDULE_GENERATION_FAILED';
            return {
                path: protocols ? `${seasonPath}?tab=protocols` : seasonPath,
                label: protocols ? 'Xem phác đồ của vụ nuôi' : 'Xem vụ nuôi',
            };
        }
        case 'product':
        case 'inventory_product':
        case 'protocol':
        case 'production_protocol':
        case 'treatment_protocol':
            return { needsContext: true, label: 'Xem phác đồ liên quan' };
        case 'operation_schedule':
        case 'operation_execution':
            return { needsContext: true, label: 'Xem phác đồ của vụ nuôi' };
        case 'pond':
        case 'water_log':
        case 'water_quality_log':
        case 'biomass_sampling':
            return { needsContext: true, label: 'Xem vụ nuôi' };
        default:
            return null;
    }
};

/** Expand a scoped reference into one or more destinations without inventing IDs or fallback pages. */
export const getNotificationTargets = (notification, context = {}) => {
    const destination = getNotificationDestination(notification);
    if (!destination) return [];
    if (!destination.needsContext) return [destination];
    const reference = notification.referenceType?.trim().toLowerCase();
    if (reference === 'product' || reference === 'inventory_product') {
        return (context.relatedSeasons || []).map((season) => ({
            path: `${referencePath('/expert/seasons', season.seasonId)}?tab=${season.tab}`,
            label: `${season.name} — ${season.tab === 'diseases' ? 'Ca bệnh & điều trị' : 'Phác đồ nuôi'}`,
            description: [season.pondName, season.farmName].filter(Boolean).join(' · '),
        }));
    }
    if (context.diseaseCaseId) {
        return [{
            path: `${referencePath('/expert/disease-cases', context.diseaseCaseId)}?tab=treatment`,
            label: 'Xem phác đồ điều trị',
        }];
    }
    const path = referencePath('/expert/seasons', context.seasonId);
    if (!path) return [];
    const protocols = ['protocol', 'production_protocol', 'treatment_protocol',
        'operation_schedule', 'operation_execution'].includes(reference);
    return [{ path: protocols ? `${path}?tab=protocols` : path, label: destination.label }];
};

/** Validate the extra context independently of notification content and display text. */
export const parseNotificationReferenceContext = (payload) => {
    const context = payload?.data;
    const validId = value => typeof value === 'string' && value.trim().length > 0;
    if (!context || typeof context !== 'object' || Array.isArray(context) ||
        ['seasonId', 'diseaseCaseId'].some(key => Object.hasOwn(context, key) && !validId(context[key])) ||
        (Object.hasOwn(context, 'relatedSeasons') &&
            (!Array.isArray(context.relatedSeasons) || !context.relatedSeasons.every(season =>
                season && validId(season.seasonId) && validId(season.name) &&
                validId(season.pondName) && validId(season.farmName) &&
                ['protocols', 'diseases'].includes(season.tab))))) {
        throw new Error('Dữ liệu liên kết thông báo không hợp lệ.');
    }
    return context;
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
