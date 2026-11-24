import { useState, useEffect, useCallback, useMemo } from 'react';
import { RightOutlined } from '@ant-design/icons';
import PortalLayout from './PortalLayout';
import AdminProfileModal from './AdminProfileModal';
import { adminAccountAPI } from '../apis';

const sidebarIcon = (name, size = 17) => <span
    className="inline-block bg-current align-middle"
    style={{ width: size, height: size, mask: `url(/assets/rag/list/${name}.svg) center / contain no-repeat` }}
    aria-hidden="true"
/>;

const AdminLayout = () => {
    const [profileOpen, setProfileOpen] = useState(false);
    const [pendingCount, setPendingCount] = useState(0);

    const fetchPendingCount = useCallback(async () => {
        try {
            const res = await adminAccountAPI.getAccounts({
                limit: 1,
                status: 'PENDING_ACTIVATION',
            });
            setPendingCount(res.data?.meta?.totalResults || 0);
        } catch {
            // Keep previous or 0
        }
    }, []);

    useEffect(() => {
        const timeoutId = window.setTimeout(fetchPendingCount, 0);

        const handleCountEvent = (e) => {
            if (typeof e.detail === 'number') {
                setPendingCount(e.detail);
            } else {
                fetchPendingCount();
            }
        };

        window.addEventListener('admin-accounts-changed', fetchPendingCount);
        window.addEventListener('admin-accounts-count', handleCountEvent);
        return () => {
            window.clearTimeout(timeoutId);
            window.removeEventListener('admin-accounts-changed', fetchPendingCount);
            window.removeEventListener('admin-accounts-count', handleCountEvent);
        };
    }, [fetchPendingCount]);

    const adminMenuItems = useMemo(
        () => [
            { path: '/admin', label: 'Tổng quan', icon: sidebarIcon('imgIconReact') },
            {
                path: '/admin/accounts',
                label: 'Tài khoản',
                icon: sidebarIcon('imgIconReact1'),
                badge: pendingCount,
                badgeColor: '#d98314',
            },
            { path: '/admin/rag/documents', label: 'Kho tài liệu AI', icon: sidebarIcon('imgIconReact2') },
        ],
        [pendingCount],
    );

    return (
        <>
            <PortalLayout
                portalLabel="CỔNG QUẢN TRỊ VIÊN"
                menuItems={adminMenuItems}
                brandLogo="/assets/rag/list/imgSidebar.png"
                logoutIcon={sidebarIcon('imgIconReact3', 13)}
                onViewProfile={() => setProfileOpen(true)}
                accountActionIcon={<RightOutlined className="shrink-0 text-xs text-[#6a7994]" aria-hidden="true" />}
            />
            <AdminProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
        </>
    );
};

export default AdminLayout;
