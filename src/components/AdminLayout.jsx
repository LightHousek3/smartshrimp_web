import { useState } from 'react';
import { RightOutlined } from '@ant-design/icons';
import PortalLayout from './PortalLayout';
import AdminProfileModal from './AdminProfileModal';

const sidebarIcon = (name, size = 17) => <span
    className="inline-block bg-current align-middle"
    style={{ width: size, height: size, mask: `url(/assets/rag/list/${name}.svg) center / contain no-repeat` }}
    aria-hidden="true"
/>;

const adminMenuItems = [
    { path: '/admin', label: 'Tổng quan', icon: sidebarIcon('imgIconReact') },
    { path: '/admin/accounts', label: 'Tài khoản', icon: sidebarIcon('imgIconReact1'), badge: 2, badgeColor: '#d98314' },
    { path: '/admin/rag/documents', label: 'Kho tài liệu AI', icon: sidebarIcon('imgIconReact2') },
];

const AdminLayout = () => {
    const [profileOpen, setProfileOpen] = useState(false);

    return (
        <>
            <PortalLayout
                portalLabel="ADMIN PORTAL"
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
