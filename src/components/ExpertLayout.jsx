import {
    ExperimentOutlined,
    MedicineBoxOutlined,
    ProfileOutlined,
    WarningOutlined,
} from '@ant-design/icons';
import PortalLayout from './PortalLayout';

const expertMenuItems = [
    { path: '/expert/protocols', label: 'Phác đồ nuôi mẫu', icon: <ProfileOutlined /> },
    { path: '/expert/seasons', label: 'Vụ nuôi', icon: <ExperimentOutlined /> },
    { path: '/expert/disease-cases', label: 'Disease Case', icon: <WarningOutlined /> },
    { path: '/expert/treatments', label: 'Phác đồ điều trị', icon: <MedicineBoxOutlined /> },
];

const ExpertLayout = () => <PortalLayout portalLabel="EXPERT PORTAL" menuItems={expertMenuItems} />;

export default ExpertLayout;
