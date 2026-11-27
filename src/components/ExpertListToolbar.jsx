import { SearchOutlined } from '@ant-design/icons';
import { Flex, Input } from 'antd';

const toolbarClassName = [
    'min-h-15.25! rounded-t-[14px]! border-b! border-[#eef1f7]! px-4! py-3!',
    '[&>.ant-select]:h-9! [&>.ant-select]:min-w-0! [&>.ant-select]:max-w-full!',
    '[&_.ant-select-selector]:rounded-[10px]! [&_.ant-select-selector]:border-[#e5e8f0]!',
    '[&_.ant-select-arrow]:text-[10px]!',
    '@max-[420px]:[&>.ant-select]:w-full!',
].join(' ');

export default function ExpertListToolbar({ searchProps, children }) {
    return (
        <Flex wrap align="center" gap={8} className={toolbarClassName}>
            <Input
                {...searchProps}
                allowClear
                prefix={<SearchOutlined className="text-[#475569]" />}
                className="h-9! w-64! min-w-0! max-w-full! rounded-[10px]! border-[#e5e8f0]! text-[13px]! @max-[420px]:w-full!"
            />
            {children}
        </Flex>
    );
}
