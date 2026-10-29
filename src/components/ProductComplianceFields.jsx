import { Form, Input, Select } from 'antd';
import InputNumber from './ProtocolNumberInput';

/** Capture label evidence; the server determines completeness and review metadata on save. */
const ProductComplianceFields = () => (
    <>
        <Form.Item
            name={['productCompliance', 'regulatoryType']}
            label="Phân loại pháp lý"
            rules={[{ required: true }]}
        >
            <Select
                options={[
                    {
                        value: 'unclassified',
                        label: 'Chưa đủ căn cứ phân loại',
                    },
                    { value: 'feed', label: 'Thức ăn / thức ăn bổ sung' },
                    {
                        value: 'environment',
                        label: 'Sản phẩm xử lý môi trường',
                    },
                    {
                        value: 'dual_purpose',
                        label: 'Hồ sơ cho cả hai mục đích',
                    },
                    {
                        value: 'medicine',
                        label: 'Thuốc thú y thủy sản',
                    },
                ]}
            />
        </Form.Item>
        <Form.Item
            name={['productCompliance', 'registrationNumber']}
            label="Mã tiếp nhận / số ĐKLH"
            extra="Anh/chị nhập mã theo đúng hồ sơ sản phẩm; nhóm Khoáng có thể thuộc thức ăn bổ sung hoặc xử lý môi trường."
            rules={[{ max: 100 }]}
        >
            <Input maxLength={100} />
        </Form.Item>
        <Form.Item
            name={['productCompliance', 'ingredientsText']}
            label="Toàn bộ thành phần theo nhãn"
            rules={[{ max: 20000 }]}
        >
            <Input.TextArea rows={4} maxLength={20000} showCount />
        </Form.Item>
        <Form.Item
            name={['productCompliance', 'containsAntibiotic']}
            label="Có chứa kháng sinh?"
            extra="Anh/chị đối chiếu thành phần trước khi chọn. Vật tư chứa kháng sinh cần phác đồ điều trị riêng, không dùng trong mẫu nuôi."
        >
            <Select
                allowClear
                options={[
                    { value: true, label: 'Có' },
                    {
                        value: false,
                        label: 'Đã đối chiếu: không có',
                    },
                ]}
                placeholder="Chưa xác định"
            />
        </Form.Item>
        <Form.Item
            name={['productCompliance', 'usageInstructions']}
            label="Loài, liều, đường dùng, tần suất/liệu trình theo nhãn"
            rules={[{ max: 20000 }]}
        >
            <Input.TextArea rows={4} maxLength={20000} showCount />
        </Form.Item>
        <Form.Item
            noStyle
            shouldUpdate={(before, after) =>
                before.productCompliance?.regulatoryType !== after.productCompliance?.regulatoryType
            }
        >
            {({ getFieldValue }) =>
                getFieldValue(['productCompliance', 'regulatoryType']) === 'medicine' && (
                    <Form.Item
                        name={['productCompliance', 'withdrawalDays']}
                        preserve={false}
                        label="Thời gian ngừng thuốc (ngày)"
                        extra="Anh/chị nhập theo nhãn thuốc; để trống khi chưa xác định. Giá trị 0 chỉ dùng khi hồ sơ nêu rõ không cần ngừng."
                    >
                        <InputNumber min={0} max={9999.999} precision={3} className="w-full!" />
                    </Form.Item>
                )
            }
        </Form.Item>
        <Form.Item
            name={['productCompliance', 'evidenceUrls']}
            label="Ảnh nhãn / hồ sơ đối chiếu (tối đa 6 URL HTTPS)"
            rules={[
                {
                    validator: (_, urls = []) => {
                        let valid = urls.length <= 6 && new Set(urls).size === urls.length;
                        try {
                            valid =
                                valid &&
                                urls.every(
                                    (url) =>
                                        url.length <= 2000 && new URL(url).protocol === 'https:',
                                );
                        } catch {
                            valid = false;
                        }
                        return valid
                            ? Promise.resolve()
                            : Promise.reject(
                                  new Error(
                                      'Anh/chị nhập tối đa 6 URL HTTPS khác nhau, mỗi URL tối đa 2.000 ký tự.',
                                  ),
                              );
                    },
                },
            ]}
        >
            <Select
                mode="tags"
                maxCount={6}
                tokenSeparators={['\n']}
                placeholder="Nhập URL rồi Enter"
            />
        </Form.Item>
    </>
);
export default ProductComplianceFields;
