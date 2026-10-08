import { useState } from 'react';
import {
    AlertOutlined,
    BellOutlined,
    DashboardOutlined,
    ExperimentOutlined,
    ProfileOutlined,
    SafetyCertificateOutlined,
    UserOutlined,
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
    {
        path: '/expert/notifications',
        label: 'Thông báo',
        icon: <BellOutlined />,
        section: 'TÀI KHOẢN',
    },
    { path: '/expert/profile', label: 'Hồ sơ', icon: <UserOutlined />, section: 'TÀI KHOẢN' },
];

const ExpertLayout = () => {
    const [unreadCount, setUnreadCount] = useState(0);
    const menuItems = expertMenuItems.map((item) => item.path === '/expert/notifications'
        ? { ...item, badge: unreadCount }
        : item);

    return (
        <PortalLayout
            portalLabel="CỔNG CHUYÊN GIA"
            portalIcon={<SafetyCertificateOutlined />}
            menuItems={menuItems}
            headerAction={<ExpertNotificationBell onUnreadCountChange={setUnreadCount} />}
            accountSubtitle="Chuyên gia thủy sản"
        />
    );
};

export default ExpertLayout;
