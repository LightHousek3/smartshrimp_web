import {
    BellOutlined,
    CalendarOutlined,
    CheckSquareOutlined,
    ExperimentOutlined,
    InboxOutlined,
    MedicineBoxOutlined,
    SafetyOutlined,
    TeamOutlined,
    WarningOutlined,
} from '@ant-design/icons';
import { formatDate } from './dateUtils';

export const getNotificationKind = (type = '') => {
    if (type.startsWith('TASK_')) {
        return { key: 'task', label: 'Nhiệm vụ', icon: <CheckSquareOutlined />, color: 'blue' };
    }
    if (type.startsWith('DISEASE_') || type.startsWith('EMERGENCY_')) {
        return { key: 'disease', label: 'Ca bệnh', icon: <SafetyOutlined />, color: 'rose' };
    }
    if (type.startsWith('TREATMENT_') || type.startsWith('PRODUCTION_')) {
        return { key: 'protocol', label: 'Phác đồ', icon: <MedicineBoxOutlined />, color: 'violet' };
    }
    if (type.startsWith('SEASON_') || type === 'HARVEST_DUE' ||
        type === 'SEASON_COMPLETED') {
        return { key: 'season', label: 'Vụ nuôi & phân công', icon: <ExperimentOutlined />, color: 'teal' };
    }
    if (type.startsWith('OPERATION_')) {
        return { key: 'operation', label: 'Vận hành', icon: <CalendarOutlined />, color: 'amber' };
    }
    if (type === 'WATER_THRESHOLD_EXCEEDED' || type === 'SCHEDULE_GENERATION_FAILED') {
        return { key: 'warning', label: 'Cảnh báo khẩn', icon: <WarningOutlined />, color: 'rose' };
    }
    if (type.startsWith('INVENTORY_')) {
        return { key: 'inventory', label: 'Kho vật tư', icon: <InboxOutlined />, color: 'amber' };
    }
    if (type === 'MANAGED_ACCOUNT_ACTIVATED' || type === 'ACCOUNT_STATUS_CHANGED') {
        return { key: 'personnel', label: 'Nhân sự', icon: <TeamOutlined />, color: 'blue' };
    }
    return { key: 'system', label: 'Hệ thống', icon: <BellOutlined />, color: 'slate' };
};

export const formatNotificationTime = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
    if (minutes >= 0 && minutes < 1) return 'Vừa xong';
    if (minutes >= 1 && minutes < 60) return `${minutes} phút trước`;
    if (minutes >= 60 && minutes < 1440) return `${Math.floor(minutes / 60)} giờ trước`;
    return formatDate(value, 'HH:mm dd/MM/yyyy');
};
