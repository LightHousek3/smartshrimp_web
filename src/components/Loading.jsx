import { Spin } from 'antd';

const Loading = ({ size = 'large', tip = 'Đang tải...' }) => (
    <div className="app-loading" role="status" aria-live="polite">
        <Spin size={size} />
        <span>{tip}</span>
    </div>
);

export default Loading;
