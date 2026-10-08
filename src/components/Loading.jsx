import { Flex, Spin, Typography } from 'antd';

const Loading = ({ size = 'large', tip = 'Đang tải...', className = '' }) => (
    <Flex
        vertical
        align="center"
        justify="center"
        gap={14}
        className={`text-[15px]! text-[#52647d]! ${className}`}
        role="status"
        aria-live="polite"
        aria-busy="true"
    >
        <Spin size={size} />
        <Typography.Text className="text-[length:inherit]! text-inherit!">{tip}</Typography.Text>
    </Flex>
);

export default Loading;
