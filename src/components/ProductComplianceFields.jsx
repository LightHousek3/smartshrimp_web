import { Form, Input, Select } from 'antd';
import InputNumber from './ProtocolNumberInput';
import { registrationFormat, registrationNumberError } from '../utils/materialCompliance';

/** Capture label facts and evidence; the server validates and stamps the declaration on save. */
const ProductComplianceFields = ({ requiredComplete = false, showAntibioticField }) => (
    <>
        <Form.Item
            name={['productCompliance', 'regulatoryType']}
            label="Phân loại pháp lý"
            rules={[
                {
                    required: true,
                    validator: (_, value) =>
                        ['feed', 'environment', 'dual_purpose', 'medicine'].includes(value)
                            ? Promise.resolve()
                            : Promise.reject(
                                  new Error('Chọn phân loại pháp lý theo hồ sơ vật tư.'),
                              ),
                },
            ]}
        >
            <Select
                options={[
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
            noStyle
            shouldUpdate={(before, after) =>
                before.productCompliance?.regulatoryType !== after.productCompliance?.regulatoryType
            }
        >
            {({ getFieldValue }) => {
                const type = getFieldValue(['productCompliance', 'regulatoryType']);
                const registration = registrationFormat(type);
                // Reset stale feedback when the type changes; Form preserves the entered code.
                return (
                    <Form.Item
                        key={type ?? 'unselected'}
                        name={['productCompliance', 'registrationNumber']}
                        label={
                            type === 'medicine'
                                ? 'Số đăng ký lưu hành thuốc thú y'
                                : 'Mã số tiếp nhận'
                        }
                        validateTrigger="onBlur"
                        validateFirst
                        rules={[
                            ({ getFieldValue }) => ({
                                validator: (_, value) => {
                                    const issue = !requiredComplete && !value ? null : registrationNumberError(
                                        getFieldValue(['productCompliance', 'regulatoryType']), value,
                                    );
                                    return issue
                                        ? Promise.reject(new Error(issue))
                                        : Promise.resolve();
                                },
                            }),
                        ]}
                    >
                        <Input disabled={!type} maxLength={100} placeholder={registration.placeholder} />
                    </Form.Item>
                );
            }}
        </Form.Item>
        <Form.Item
            name={['productCompliance', 'ingredientsText']}
            label="Toàn bộ thành phần theo nhãn"
            rules={[{ required: requiredComplete, whitespace: true, max: 20000 }]}
        >
            <Input.TextArea rows={4} maxLength={20000} showCount />
        </Form.Item>
        {showAntibioticField && <Form.Item
            name={['productCompliance', 'containsAntibiotic']}
            label="Có chứa kháng sinh?"
            rules={[
                {
                    required: requiredComplete,
                    type: 'boolean',
                    message: 'Vui lòng xác nhận có chứa kháng sinh',
                },
            ]}
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
        </Form.Item>}
        <Form.Item
            name={['productCompliance', 'usageInstructions']}
            label="Loài, liều, đường dùng, tần suất/liệu trình theo nhãn"
            rules={[{ required: requiredComplete, whitespace: true, max: 20000 }]}
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
                        rules={[
                            {
                                required: requiredComplete,
                                message: 'Nhập thời gian ngừng thuốc theo nhãn.',
                            },
                        ]}
                        extra="Anh/chị nhập theo nhãn thuốc. Giá trị 0 chỉ dùng khi hồ sơ nêu rõ không cần ngừng."
                    >
                        <InputNumber min={0} max={9999.999} precision={3} className="w-full!" />
                    </Form.Item>
                )
            }
        </Form.Item>
        <Form.Item
            name={['productCompliance', 'evidenceUrls']}
            label="Hồ sơ đối chiếu bổ sung (tùy chọn · tối đa 6 URL HTTPS)"
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
