
import { getErrorMessage } from '../utils/errorMessage.js';

export const PROTOCOL_TIMING = Object.freeze({
    defaultMinutes: 30,
    minMinutes: 10,
    maxMinutes: 2147483647,
});

export const PROTOCOL_STATUS_LABELS = {
    DRAFT: 'Bản nháp',
    REJECTED: 'Bị từ chối',
    PENDING_APPROVAL: 'Chờ duyệt',
    APPROVED: 'Đã duyệt',
    ACTIVE: 'Đang có hiệu lực',
    PAUSED: 'Tạm hoãn',
    COMPLETED: 'Đã kết thúc',
    SUPERSEDED: 'Đã thay thế',
    CANCELLED: 'Đã hủy',
    ABORTED: 'Đã dừng sớm',
};
export const PROTOCOL_STATUS_COLORS = {
    DRAFT: 'default',
    REJECTED: 'error',
    PENDING_APPROVAL: 'warning',
    APPROVED: 'success',
    ACTIVE: 'processing',
    PAUSED: 'warning',
    COMPLETED: 'default',
    ABORTED: 'error',
};
export const SEASON_STATUS_LABELS = {
    PLANNING: 'Chuẩn bị',
    ACTIVE: 'Đang nuôi',
    COMPLETED: 'Hoàn tất',
    CANCELLED: 'Đã hủy',
};
export const OPERATION_LABELS = {
    FEEDING: 'Thức ăn',
    MEDICINE: 'Thuốc / bổ sung',
    MINERAL: 'Khoáng',
    CHEMICAL: 'Hóa chất / vi sinh',
    OTHER: 'Khác',
};
export const DOSE_LABELS = {
    FIXED_QUANTITY: 'Cố định',
    PER_KG_BIOMASS: '/ kg sinh khối',
    PERCENT_BIOMASS: '% sinh khối',
    PER_M3_WATER: '/ m³ nước',
};
export const UNIT_LABELS = {
    KG: 'kg',
    G: 'g',
    L: 'l',
    ML: 'ml',
    PACK: 'gói',
    BOTTLE: 'chai',
};
export const OPERATION_COLORS = {
    FEEDING: '#1d7ad6',
    MEDICINE: '#d43b57',
    MINERAL: '#0f9b8e',
    CHEMICAL: '#0f9b8e',
    OTHER: '#7b5bd6',
};
export const PROTOCOL_THEME = {
    token: {
        colorPrimary: '#1d7ad6',
        colorText: 'rgba(15,28,46,0.88)',
        colorTextSecondary: '#6a7994',
        colorTextPlaceholder: 'rgba(15,28,46,0.25)',
        colorBorder: '#e5e8f0',
        borderRadius: 10,
        controlHeight: 36,
        controlHeightSM: 27,
        fontSize: 13,
        lineHeight: 21 / 13,
    },
};
export const PROTOCOL_PRIMARY_BUTTON =
    'border-0! bg-[linear-gradient(90deg,#77a1d3,#79cbca)]! font-semibold! text-white! shadow-none! enabled:hover:bg-[linear-gradient(90deg,#5f91cc,#57bdbd)]! enabled:focus-visible:bg-[linear-gradient(90deg,#5f91cc,#57bdbd)]!';
/** Apply culture-day and administration-route rules to zero-based editor offsets. */
export const allowedDoseBases = (operationType, offset, { environment = false } = {}) => {
    if (operationType === 'OTHER') return ['FIXED_QUANTITY'];
    if (
        (operationType === 'FEEDING' && environment) ||
        (operationType === 'CHEMICAL' && !environment)
    )
        return [];
    return [
        'FIXED_QUANTITY',
        ...(environment
            ? ['PER_M3_WATER']
            : offset >= 29
              ? ['PERCENT_BIOMASS', 'PER_KG_BIOMASS']
              : []),
    ];
};
export const protocolError = (error) =>
    getErrorMessage(error, 'Không tải được dữ liệu. Vui lòng thử lại.');
