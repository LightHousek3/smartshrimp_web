import { useCallback, useEffect, useMemo, useState } from 'react';
import { authAPI } from '../apis';
import { deviceId, clearAccessToken, setAccessToken } from '../config';
import { WEB_ROLES } from '../constants/portal';
import { AuthContext } from './useAuth';

let bootstrapAuthPromise = null;

export const AuthProvider = ({ children }) => {
    const [account, setAccount] = useState(null);
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
                const { accessToken, account: restoredAccount } = response.data?.data || {};

                if (!mounted) return;

                if (!accessToken || !restoredAccount) {
                    throw new Error('Không thể khôi phục phiên đăng nhập.');
                }

                if (!WEB_ROLES.includes(restoredAccount.role)) {
                    await authAPI.logout();
                    throw new Error('Vai trò không được phép truy cập.');
                }

                setAccessToken(accessToken);
                setAccount(restoredAccount);
            } catch {
                if (mounted) {
                    clearAccessToken();
                    setAccount(null);
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
        const { account: authenticatedAccount, tokens } = response.data?.data || {};

        if (!authenticatedAccount || !tokens?.accessToken) {
            throw new Error('Phản hồi đăng nhập không hợp lệ.');
        }

        if (!WEB_ROLES.includes(authenticatedAccount.role)) {
            await authAPI.logout().catch(() => undefined);
            clearAccessToken();
            throw new Error('Tài khoản không có quyền truy cập cổng này.');
        }

        setAccessToken(tokens.accessToken);
        setAccount(authenticatedAccount);
        return authenticatedAccount;
    }, []);

    const clearSession = useCallback(() => {
        clearAccessToken();
        setAccount(null);
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
            account,
            loading,
            login,
            logout,
            clearSession,
            isAuthenticated: Boolean(account),
        }),
        [account, clearSession, loading, login, logout],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
