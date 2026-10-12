import PortalLayout from './PortalLayout';

const sidebarIcon = (name, size = 17) => <span
    className="inline-block bg-current align-middle"
    style={{ width: size, height: size, mask: `url(/assets/rag/list/${name}.svg) center / contain no-repeat` }}
    aria-hidden="true"
/>;

const adminMenuItems = [
    { path: '/admin', label: 'Tổng quan', icon: sidebarIcon('imgIconReact') },
    { path: '/admin/accounts', label: 'Tài khoản', icon: sidebarIcon('imgIconReact1') },
    { path: '/admin/rag/documents', label: 'Kho tài liệu AI', icon: sidebarIcon('imgIconReact2') },
];

const AdminLayout = () => {
    return <PortalLayout portalLabel="ADMIN PORTAL" menuItems={adminMenuItems}
        brandLogo="/assets/rag/list/imgSidebar.png"
        logoutIcon={sidebarIcon('imgIconReact3', 13)}
        />;
};

export default AdminLayout;
