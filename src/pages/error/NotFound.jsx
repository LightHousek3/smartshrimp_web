import { Button, Result } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const NotFound = () => {
    const navigate = useNavigate();

    return (
        <main className="error-page">
            <Result
                status="404"
                title="404"
                subTitle="Xin lỗi, trang bạn tìm kiếm không tồn tại."
                extra={
                    <Button className="btn-grad error-action" icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
                        Quay lại
                    </Button>
                }
            />
        </main>
    );
};

export default NotFound;
