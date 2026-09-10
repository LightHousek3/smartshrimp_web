export const USER_ROLES = Object.freeze({
    ADMIN: 'ADMIN',
    EXPERT: 'EXPERT',
});

export const WEB_ROLES = Object.freeze([USER_ROLES.ADMIN, USER_ROLES.EXPERT]);

export const ROLE_LABELS = Object.freeze({
    [USER_ROLES.ADMIN]: 'Quản trị viên',
    [USER_ROLES.EXPERT]: 'Chuyên gia thủy sản',
});

export const ROLE_HOME_PATHS = Object.freeze({
    [USER_ROLES.ADMIN]: '/admin',
    [USER_ROLES.EXPERT]: '/expert',
});

export const getRoleHomePath = (role) => ROLE_HOME_PATHS[role] || '/unauthorized';

export const BRAND_LOGO_URL =
    'https://res.cloudinary.com/dmv1uhpq/image/upload/v1789054756/logo.png';
