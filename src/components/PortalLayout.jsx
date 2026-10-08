import { useState } from 'react';
import { App, Button } from 'antd';
import { CloseOutlined, LogoutOutlined, MenuOutlined } from '@ant-design/icons';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import { BRAND_LOGO_URL, ROLE_LABELS } from '../constants/portal';

const getInitial = (name, email) => (name?.trim()?.[0] || email?.trim()?.[0] || 'S').toUpperCase();
const expertMainClassName = `
    ml-55 min-h-screen w-[calc(100%-220px)] min-w-0 p-0
    bg-[linear-gradient(152.6deg,#eaf4ff_0%,#f0f8ff_40%,#e2f6f3_100%)]
    max-[900px]:ml-0 max-[900px]:w-full
`;
const expertTopbarClassName = `
    flex h-14 shrink-0 items-center justify-between border-b border-[rgba(15,28,46,0.06)]
    bg-[linear-gradient(to_right,#ace0f9,#fff1eb)] px-7 backdrop-blur-sm
    max-[900px]:fixed max-[900px]:inset-x-0 max-[900px]:top-0 max-[900px]:z-[12]
    max-[900px]:pl-18 max-[900px]:pr-5 max-[650px]:pr-3
`;
const expertPageClassName = `
    w-full min-w-0 p-7
    max-[900px]:px-5 max-[900px]:pt-21
    max-[650px]:px-3 max-[650px]:pt-20
`;

const PortalLayout = ({ portalLabel, portalIcon = null, menuItems, accountSubtitle, headerAction }) => {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const { account, logout } = useAuth();
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

    const isPortalRoot = (path) => path === '/admin' || path === '/expert';
    const isActive = (path) =>
        isPortalRoot(path) ? location.pathname === path : location.pathname.startsWith(path);

    const menuGroups = menuItems.reduce((groups, item) => {
        const section = item.section || 'CHỨC NĂNG';
        const currentGroup = groups.at(-1);
        if (!currentGroup || currentGroup.section !== section) {
            groups.push({ section, items: [item] });
        } else {
            currentGroup.items.push(item);
        }
        return groups;
    }, []);

    const isExpertScreen = location.pathname === '/expert' || location.pathname.startsWith('/expert/');
    const pageLabel = menuItems.find((item) => isActive(item.path))?.label
        || (location.pathname.startsWith('/expert/treatments') ? 'Phác đồ điều trị' : '');

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

                <div className="portal-label">
                    {portalIcon ? <span className="portal-label-icon">{portalIcon}</span> : null}
                    <span>{portalLabel}</span>
                </div>

                <nav className="portal-navigation" aria-label="Chức năng chính">
                    {menuGroups.map((group) => (
                        <div className="navigation-group" key={group.section}>
                            <p className="navigation-heading">{group.section}</p>
                            <div className="navigation-list">
                                {group.items.map((item) => (
                                    <NavLink
                                        key={item.path}
                                        to={item.path}
                                        end={isPortalRoot(item.path)}
                                        className={`navigation-item ${isActive(item.path) ? 'is-active' : ''}`}
                                        onClick={() => setMobileOpen(false)}
                                    >
                                        <span className="navigation-icon">{item.icon}</span>
                                        <span>{item.label}</span>
                                    </NavLink>
                                ))}
                            </div>
                        </div>
                    ))}
                </nav>

                <div className="sidebar-account">
                    <div className="account-summary">
                        {account?.avatarUrl ? (
                            <img className="account-avatar" src={account.avatarUrl} alt="" />
                        ) : (
                            <span className="account-avatar account-avatar-fallback">
                                {getInitial(account?.fullName, account?.email)}
                            </span>
                        )}
                        <div className="account-copy">
                            <strong title={account?.fullName || ROLE_LABELS[account?.role]}>
                                {account?.fullName || ROLE_LABELS[account?.role]}
                            </strong>
                            <span title={accountSubtitle || account?.email}>
                                {accountSubtitle || account?.email}
                            </span>
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

            <main className={isExpertScreen
                ? expertMainClassName
                : 'portal-content'}>
                {headerAction && <header className={isExpertScreen
                    ? expertTopbarClassName
                    : 'portal-topbar'}>
                    {isExpertScreen && <div className="flex items-center gap-2.5 text-xs text-[#6a7994]">
                        <span>Cổng chuyên gia</span>
                        <span aria-hidden="true">/</span>
                        <strong className="font-semibold text-[#0f1c2e]">{pageLabel}</strong>
                    </div>}
                    {headerAction}
                </header>}
                {isExpertScreen ? (
                    <div className={expertPageClassName}>
                        <Outlet />
                    </div>
                ) : <Outlet />}
            </main>
        </div>
    );
};

export default PortalLayout;
