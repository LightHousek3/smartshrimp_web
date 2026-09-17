import {
    DashboardOutlined,
    ExperimentOutlined,
    UserOutlined,
    ProfileOutlined,
    AlertOutlined,
} from '@ant-design/icons';
import PortalLayout from './PortalLayout';
import ExpertNotificationBell from './ExpertNotificationBell';

const expertMenuItems = [
    {
        path: '/expert',
        label: 'Tổng quan',
        icon: <DashboardOutlined />,
        section: 'CHỨC NĂNG',
    },
    { path: '/expert/seasons', label: 'Vụ nuôi', icon: <ExperimentOutlined /> },
    { path: '/expert/disease-cases', label: 'Ca bệnh', icon: <AlertOutlined /> },
    { path: '/expert/protocols', label: 'Phác đồ mẫu', icon: <ProfileOutlined /> },
    { path: '/expert/profile', label: 'Hồ sơ', icon: <UserOutlined />, section: 'TÀI KHOẢN' },
];

const ExpertLayout = () => (
    <PortalLayout
        portalLabel="EXPERT PORTAL"
        menuItems={expertMenuItems}
        headerAction={<ExpertNotificationBell />}
        accountSubtitle="Chuyên gia thủy sản"
    />
);

export default ExpertLayout;
