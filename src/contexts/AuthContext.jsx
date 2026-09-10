import { useCallback, useEffect, useMemo, useState, useContext, createContext } from 'react';
import { authAPI } from '../apis';
import { deviceId, clearAccessToken, setAccessToken } from '../config';
import { WEB_ROLES } from '../constants/portal';

const AuthContext = createContext(null);
let bootstrapAuthPromise = null;

export const useAuth = () => {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }

    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        const restoreSession = async () => {
            try {
                if (!bootstrapAuthPromise) {
                    bootstrapAuthPromise = authAPI.refreshToken().finally(() => {
                        bootstrapAuthPromise = null;
                    });
                }

                const response = await bootstrapAuthPromise;
                const { accessToken, user: restoredUser } = response.data?.data || {};

                if (!mounted) return;

                if (!accessToken || !restoredUser) {
                    throw new Error('Không thể khôi phục phiên đăng nhập.');
                }

                if (!WEB_ROLES.includes(restoredUser.role)) {
                    await authAPI.logout();
                    throw new Error('Vai trò không được phép truy cập.');
                }

                setAccessToken(accessToken);
                setUser(restoredUser);
            } catch {
                if (mounted) {
                    clearAccessToken();
                    setUser(null);
                }
            } finally {
                if (mounted) setLoading(false);
            }
        };

        restoreSession();
        return () => {
            mounted = false;
        };
    }, []);

    const login = useCallback(async (credentials) => {
        const response = await authAPI.login({ deviceId, ...credentials });
        const { user: authenticatedUser, tokens } = response.data?.data || {};

        if (!authenticatedUser || !tokens?.accessToken) {
            throw new Error('Phản hồi đăng nhập không hợp lệ.');
        }

        if (!WEB_ROLES.includes(authenticatedUser.role)) {
            await authAPI.logout().catch(() => undefined);
            clearAccessToken();
            throw new Error('Tài khoản này không có quyền truy cập cổng Expert và Admin.');
        }

        setAccessToken(tokens.accessToken);
        setUser(authenticatedUser);
        return authenticatedUser;
    }, []);

    const clearSession = useCallback(() => {
        clearAccessToken();
        setUser(null);
    }, []);

    const logout = useCallback(async () => {
        try {
            await authAPI.logout();
        } finally {
            clearSession();
        }
    }, [clearSession]);

    const value = useMemo(
        () => ({
            user,
            loading,
            login,
            logout,
            clearSession,
            isAuthenticated: Boolean(user),
        }),
        [clearSession, loading, login, logout, user],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
