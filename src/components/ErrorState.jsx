import { CloudOutlined, ReloadOutlined } from '@ant-design/icons';
import { Button, Flex, Typography } from 'antd';
import { safeMessage } from '../utils/errorMessage.js';

/** A single retry state for failed page and section loads. */
const ErrorState = ({ message, onRetry, className = '' }) => (
    <Flex
        vertical
        align="center"
        justify="center"
        gap={20}
        className={`min-h-64 w-full px-6 py-10 text-center ${className}`}
        role="alert"
    >
        <CloudOutlined className="text-5xl! text-[#8796ae]!" aria-hidden />
        <Typography.Paragraph className="m-0! max-w-xl! text-[#6a7994]!">
            {safeMessage(message)}
        </Typography.Paragraph>
        {onRetry && (
            <Button type="primary" icon={<ReloadOutlined />} onClick={onRetry}>
                Thử lại
            </Button>
        )}
    </Flex>
);

export default ErrorState;
