import { DashboardOutlined, TeamOutlined } from '@ant-design/icons';
import PortalLayout from './PortalLayout';

const adminMenuItems = [
    { path: '/admin', label: 'Tổng quan', icon: <DashboardOutlined /> },
    { path: '/admin/accounts', label: 'Tài khoản', icon: <TeamOutlined /> },
];

const AdminLayout = () => <PortalLayout portalLabel="ADMIN PORTAL" menuItems={adminMenuItems} />;

export default AdminLayout;
