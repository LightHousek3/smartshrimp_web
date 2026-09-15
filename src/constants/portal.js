export const ACCOUNT_ROLES = Object.freeze({
    ADMIN: 'ADMIN',
    EXPERT: 'EXPERT',
});

export const WEB_ROLES = Object.freeze([ACCOUNT_ROLES.ADMIN, ACCOUNT_ROLES.EXPERT]);

export const ROLE_LABELS = Object.freeze({
    [ACCOUNT_ROLES.ADMIN]: 'Quản trị viên',
    [ACCOUNT_ROLES.EXPERT]: 'Chuyên gia thủy sản',
});

export const ROLE_HOME_PATHS = Object.freeze({
    [ACCOUNT_ROLES.ADMIN]: '/admin',
    [ACCOUNT_ROLES.EXPERT]: '/expert',
});

export const getRoleHomePath = (role) => ROLE_HOME_PATHS[role] || '/unauthorized';

export const BRAND_LOGO_URL =
    'https://res.cloudinary.com/dmv1uhpq/image/upload/v1789054756/logo.png';
