import { useState } from 'react';
import { App, Button } from 'antd';
import { CloseOutlined, LogoutOutlined, MenuOutlined } from '@ant-design/icons';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { BRAND_LOGO_URL, ROLE_LABELS } from '../constants/portal';

const getInitial = (name, email) => (name?.trim()?.[0] || email?.trim()?.[0] || 'S').toUpperCase();

const PortalLayout = ({ portalLabel, menuItems }) => {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const { user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const { message } = App.useApp();

    const handleLogout = async () => {
        if (loggingOut) return;

        setLoggingOut(true);
        await logout();
        navigate('/login', { replace: true });

        message.success('Đăng xuất thành công!');
    };

    const isActive = (path) =>
        path === '/admin' ? location.pathname === path : location.pathname.startsWith(path);

    return (
        <div className="portal-layout">
            <button
                type="button"
                className="mobile-menu-button"
                onClick={() => setMobileOpen(true)}
                aria-label="Mở menu"
            >
                <MenuOutlined />
            </button>

            <div
                className={`sidebar-backdrop ${mobileOpen ? 'is-visible' : ''}`}
                onClick={() => setMobileOpen(false)}
                aria-hidden="true"
            />

            <aside className={`portal-sidebar ${mobileOpen ? 'is-open' : ''}`}>
                <button
                    type="button"
                    className="sidebar-close"
                    onClick={() => setMobileOpen(false)}
                    aria-label="Đóng menu"
                >
                    <CloseOutlined />
                </button>

                <div className="sidebar-brand">
                    <img src={BRAND_LOGO_URL} alt="SmartShrimp" className="system-logo" />
                </div>

                <div className="portal-label">{portalLabel}</div>

                <nav className="portal-navigation" aria-label="Chức năng chính">
                    <p className="navigation-heading">CHỨC NĂNG</p>
                    <div className="navigation-list">
                        {menuItems.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                end={item.path === '/admin'}
                                className={`navigation-item ${isActive(item.path) ? 'is-active' : ''}`}
                                onClick={() => setMobileOpen(false)}
                            >
                                <span className="navigation-icon">{item.icon}</span>
                                <span>{item.label}</span>
                            </NavLink>
                        ))}
                    </div>
                </nav>

                <div className="sidebar-account">
                    <div className="account-summary">
                        {user?.avatarUrl ? (
                            <img className="account-avatar" src={user.avatarUrl} alt="" />
                        ) : (
                            <span className="account-avatar account-avatar-fallback">
                                {getInitial(user?.fullName, user?.email)}
                            </span>
                        )}
                        <div className="account-copy">
                            <strong>{user?.fullName || ROLE_LABELS[user?.role]}</strong>
                            <span title={user?.email}>{user?.email}</span>
                        </div>
                    </div>

                    <Button
                        className="logout-button"
                        icon={<LogoutOutlined />}
                        loading={loggingOut}
                        onClick={handleLogout}
                    >
                        Đăng xuất
                    </Button>
                </div>
            </aside>

            <main className="portal-content">
                <Outlet />
            </main>
        </div>
    );
};

export default PortalLayout;
