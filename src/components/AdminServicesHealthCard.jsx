import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Col, Flex, Row, Spin, Tag } from 'antd';
import {
    CheckCircleOutlined,
    CloseCircleOutlined,
    MessageOutlined,
    MinusCircleOutlined,
    ReloadOutlined,
    RobotOutlined,
} from '@ant-design/icons';
import { adminDashboardAPI } from '../apis/index.js';
import { getErrorMessage } from '../utils/errorMessage.js';

const STATUS_META = {
    UP: {
        label: 'Đang hoạt động',
        color: '#0f9b8e',
        bg: '#e2f6f3',
        icon: <CheckCircleOutlined />,
    },
    DOWN: {
        label: 'Mất kết nối',
        color: '#d43b57',
        bg: '#fbe6ea',
        icon: <CloseCircleOutlined />,
    },
    NOT_CONFIGURED: {
        label: 'Chưa cấu hình',
        color: '#64748b',
        bg: '#eef1f6',
        icon: <MinusCircleOutlined />,
    },
};

const SERVICE_ICONS = {
    ai_diagnosis: { icon: <RobotOutlined />, color: '#1d7ad6', bg: '#eaf4ff' },
    rag: { icon: <MessageOutlined />, color: '#0f9b8e', bg: '#e2f6f3' },
};

const formatCheckedTime = (iso) => {
    if (!iso) return null;
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
};

const AdminServicesHealthCard = () => {
    const [services, setServices] = useState([]);
    const [checkedAt, setCheckedAt] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [attempt, setAttempt] = useState(0);

    const refresh = useCallback(() => {
        setLoading(true);
        setError(null);
        setAttempt((value) => value + 1);
    }, []);

    useEffect(() => {
        let isMounted = true;
        const controller = new AbortController();

        adminDashboardAPI
            .getServicesHealth(controller.signal)
            .then((data) => {
                if (!isMounted) return;
                setServices(Array.isArray(data?.services) ? data.services : []);
                setCheckedAt(data?.checkedAt || null);
            })
            .catch((err) => {
                if (!isMounted || err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return;
                setError(getErrorMessage(err, 'Không thể kiểm tra trạng thái dịch vụ AI.'));
            })
            .finally(() => {
                if (isMounted) setLoading(false);
            });

        return () => {
            isMounted = false;
            controller.abort();
        };
    }, [attempt]);

    const checkedTimeLabel = formatCheckedTime(checkedAt);

    return (
        <Card
            style={{ borderRadius: 14, border: '1px solid #e4eaf4', marginBottom: 20 }}
            styles={{ body: { padding: '16px 20px' } }}
            title={
                <Flex align="center" justify="space-between" wrap="wrap" gap={8}>
                    <div>
                        <span
                            style={{
                                fontFamily: 'Sora, sans-serif',
                                fontWeight: 700,
                                fontSize: 15,
                                color: '#0f1c2e',
                            }}
                        >
                            Trạng thái dịch vụ AI
                        </span>
                        {checkedTimeLabel && (
                            <span style={{ fontSize: 12, color: '#6a7994', marginLeft: 10 }}>
                                Kiểm tra lúc {checkedTimeLabel}
                            </span>
                        )}
                    </div>
                    <Button
                        size="small"
                        icon={<ReloadOutlined spin={loading} />}
                        onClick={refresh}
                        disabled={loading}
                    >
                        Kiểm tra lại
                    </Button>
                </Flex>
            }
        >
            <Spin spinning={loading}>
                {error ? (
                    <Flex align="center" justify="space-between" wrap="wrap" gap={8}>
                        <span style={{ fontSize: 13, color: '#d43b57' }}>{error}</span>
                        <Button size="small" onClick={refresh}>
                            Thử lại
                        </Button>
                    </Flex>
                ) : (
                    <Row gutter={[16, 12]}>
                        {services.map((service) => {
                            const statusMeta = STATUS_META[service.status] || STATUS_META.DOWN;
                            const iconMeta = SERVICE_ICONS[service.key] || SERVICE_ICONS.ai_diagnosis;
                            return (
                                <Col key={service.key} xs={24} md={12}>
                                    <Flex
                                        align="center"
                                        justify="space-between"
                                        gap={12}
                                        style={{
                                            padding: '12px 14px',
                                            borderRadius: 12,
                                            border: '1px solid #eef2f8',
                                            background: '#f8fafd',
                                        }}
                                    >
                                        <Flex align="center" gap={12} style={{ minWidth: 0 }}>
                                            <div
                                                style={{
                                                    width: 38,
                                                    height: 38,
                                                    borderRadius: 10,
                                                    background: iconMeta.bg,
                                                    color: iconMeta.color,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: 18,
                                                    flexShrink: 0,
                                                }}
                                            >
                                                {iconMeta.icon}
                                            </div>
                                            <div style={{ minWidth: 0 }}>
                                                <div
                                                    style={{
                                                        fontWeight: 600,
                                                        fontSize: 14,
                                                        color: '#0f1c2e',
                                                    }}
                                                >
                                                    {service.name}
                                                </div>
                                                <div style={{ fontSize: 12, color: '#6a7994' }}>
                                                    {[
                                                        service.version ? `Phiên bản: ${service.version}` : null,
                                                        service.latencyMs != null ? `${service.latencyMs} ms` : null,
                                                    ]
                                                        .filter(Boolean)
                                                        .join(' · ') || 'Không có thông tin phản hồi'}
                                                </div>
                                            </div>
                                        </Flex>
                                        <Tag
                                            icon={statusMeta.icon}
                                            style={{
                                                margin: 0,
                                                borderRadius: 999,
                                                padding: '2px 10px',
                                                border: 'none',
                                                color: statusMeta.color,
                                                background: statusMeta.bg,
                                                fontWeight: 600,
                                                fontSize: 12,
                                                flexShrink: 0,
                                            }}
                                        >
                                            {statusMeta.label}
                                        </Tag>
                                    </Flex>
                                </Col>
                            );
                        })}
                    </Row>
                )}
            </Spin>
        </Card>
    );
};

export default AdminServicesHealthCard;
