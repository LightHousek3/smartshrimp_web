import { useRef, useState } from 'react';
import {
    Alert,
    Button,
    Flex,
    Form,
    Modal,
    Select,
    TimePicker,
    Typography,
} from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { buildQuickTemplateStages } from '../utils/protocolQuickBuilder';
import ExpertProtocolMaterialPicker from './ExpertProtocolMaterialPicker';
import ProtocolNumberInput from './ProtocolNumberInput';
import { uniqueTemplateProposals } from '../utils/materialCompliance';
import {
    defaultProtocolMeals,
    suggestQuickPhase,
} from '../utils/protocolAuthoringDefaults';
import {
    formatPostCount,
    parsePostCount,
    templateValidateMessages,
} from '../utils/protocolTemplateUtils';

const { Text } = Typography;

const FeedField = ({
    id,
    value,
    onChange,
    farm,
    manufacturers,
    proposedMaterials,
}) => {
    const [open, setOpen] = useState(false);
    return (
        <>
            <Button id={id} block onClick={() => setOpen(true)}>
                {value?.name || 'Chọn / đề xuất thức ăn'}
            </Button>
            {open && (
                <ExpertProtocolMaterialPicker
                    proposedMaterials={proposedMaterials}
                    farm={farm}
                    manufacturers={manufacturers}
                    feedOnly
                    onClose={() => setOpen(false)}
                    onSelect={(product) => {
                        onChange(product);
                        setOpen(false);
                    }}
                />
            )}
        </>
    );
};

/** Build a draft from Expert-entered quantities; persistence uses the existing template authoring flow. */
const ExpertProtocolQuickBuilder = ({
    farm,
    manufacturers,
    shrimpType,
    referencePostCount,
    proposedMaterials = [],
    onClose,
    onApply,
}) => {
    const [form] = Form.useForm();
    const phases = Form.useWatch('phases', form);
    const proposals = uniqueTemplateProposals([
        ...proposedMaterials,
        ...(phases ?? []).map((phase) => phase?.product),
    ]);
    const [error, setError] = useState(null);
    const appendLock = useRef(false);
    const [addingPhase, setAddingPhase] = useState(false);
    const toConfig = (values) => ({
        ...values,
        shrimpType,
        referencePostCount,
        meals: values.meals.map((meal) => ({
            ...meal,
            time: meal.time?.format('HH:mm') ?? '',
        })),
    });
    const appendPhase = async (add) => {
        if (appendLock.current) return;
        appendLock.current = true;
        setAddingPhase(true);
        try {
            await form.validateFields();
            const config = toConfig(form.getFieldsValue());
            buildQuickTemplateStages(config);
            add(
                suggestQuickPhase(shrimpType, referencePostCount, config.phases)
            );
            setError(null);
        } catch (failure) {
            setError(
                failure.errorFields
                    ? 'Anh/chị hoàn thành các giai đoạn và lịch cữ hiện có trước khi thêm giai đoạn tiếp theo.'
                    : failure.message
            );
            if (failure.errorFields?.length)
                form.scrollToField(failure.errorFields[0].name, {
                    block: 'center',
                });
        } finally {
            appendLock.current = false;
            setAddingPhase(false);
        }
    };
    const submit = (values) => {
        try {
            const config = toConfig(values);
            onApply({
                shrimpType: config.shrimpType,
                referencePostCount: config.referencePostCount,
                stages: buildQuickTemplateStages(config),
            });
        } catch (failure) {
            setError(failure.message);
        }
    };
    return (
        <Modal
            open
            centered
            title="Tạo nhanh phác đồ mẫu"
            width={820}
            styles={{
                body: { maxHeight: '68vh', overflowY: 'auto', paddingRight: 8 },
            }}
            onCancel={onClose}
            footer={
                <Flex justify="end" gap={8}>
                    <Button onClick={onClose}>Hủy</Button>
                    <Button type="primary" onClick={() => form.submit()}>
                        Tạo bản nháp
                    </Button>
                </Flex>
            }
        >
            <Alert
                type="info"
                showIcon
                className="mb-4!"
                message="Anh/chị kiểm tra khẩu phần gợi ý và chọn thức ăn cho mỗi giai đoạn. Có thể chỉnh các thông số, rồi bổ sung vật tư trộn ăn và xử lý môi trường vào bản nháp trước khi lưu."
            />
            {error && (
                <Alert
                    type="error"
                    showIcon
                    className="mb-4!"
                    message={error}
                />
            )}
            <Form
                name="quickProtocol"
                form={form}
                layout="vertical"
                onFinish={submit}
                validateTrigger="onBlur"
                validateMessages={templateValidateMessages}
                initialValues={{
                    shrimpType,
                    referencePostCount,
                    meals: defaultProtocolMeals(shrimpType).map((meal) => ({
                        ...meal,
                        time: dayjs(`2000-01-01T${meal.time}:00`),
                    })),
                    phases: [
                        suggestQuickPhase(shrimpType, referencePostCount, []),
                    ],
                }}
            >
                <div className="grid grid-cols-2 gap-x-4 max-sm:grid-cols-1">
                    <Form.Item
                        name="shrimpType"
                        label="Loài tôm"
                        rules={[{ required: true, message: 'Chọn loài tôm.' }]}
                    >
                        <Select
                            disabled
                            options={[
                                {
                                    value: 'WHITELEG',
                                    label: 'Tôm thẻ chân trắng',
                                },
                                { value: 'BLACK_TIGER', label: 'Tôm sú' },
                            ]}
                        />
                    </Form.Item>
                    <Form.Item
                        name="referencePostCount"
                        label="Số post tham chiếu"
                        rules={[
                            {
                                required: true,
                                type: 'integer',
                                min: 1,
                                max: 1000000000,
                            },
                        ]}
                    >
                        <ProtocolNumberInput
                            disabled
                            min={1}
                            max={1000000000}
                            precision={0}
                            formatter={formatPostCount}
                            parser={parsePostCount}
                            className="w-full!"
                        />
                    </Form.Item>
                </div>
                <Text strong>Lịch cữ ăn dùng chung cho các giai đoạn</Text>
                <Text className="mb-3! block! text-xs! text-[#6a7994]!">
                    Anh/chị có thể chỉnh giờ và tỷ lệ; mỗi nhóm DOC phải đủ
                    100%. Khẩu phần chỉ được gợi ý khi thêm giai đoạn, không ghi
                    đè các số đã chỉnh.
                </Text>
                <Form.List name="meals">
                    {(fields, { add, remove }) => (
                        <>
                            <div
                                className="mb-2 grid grid-cols-[3rem_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_2.25rem] gap-3 text-xs text-[#6a7994]"
                                aria-hidden="true"
                            >
                                <span>Cữ</span>
                                <span>Giờ ăn</span>
                                <span>DOC 1–29 (%)</span>
                                <span>Từ DOC 30 (%)</span>
                                <span />
                            </div>
                            {fields.map((field, index) => (
                                <div
                                    key={field.key}
                                    className="mb-3 grid grid-cols-[3rem_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_2.25rem] items-start gap-3"
                                >
                                    <Text className="leading-9!">
                                        Cữ {index + 1}
                                    </Text>
                                    <Form.Item
                                        name={[field.name, 'time']}
                                        className="mb-0!"
                                        rules={[
                                            {
                                                required: true,
                                                message: 'Chọn giờ.',
                                            },
                                        ]}
                                    >
                                        <TimePicker
                                            placeholder="Chọn giờ"
                                            aria-label={`Giờ cữ ${index + 1}`}
                                            format="HH:mm"
                                            className="w-full!"
                                            allowClear={false}
                                        />
                                    </Form.Item>
                                    <Form.Item
                                        name={[field.name, 'sharePct']}
                                        className="mb-0!"
                                        rules={[
                                            {
                                                required: true,
                                                type: 'number',
                                                min: 0.0001,
                                                max: 100,
                                                message:
                                                    'Tỷ lệ cữ ăn phải lớn hơn 0 và tối đa 100%.',
                                            },
                                        ]}
                                    >
                                        <ProtocolNumberInput
                                            aria-label={`Tỷ lệ cữ ${index + 1} DOC 1–29`}
                                            min={0.0001}
                                            max={100}
                                            suffix="%"
                                            className="w-full!"
                                        />
                                    </Form.Item>
                                    <Form.Item
                                        name={[field.name, 'growoutSharePct']}
                                        className="mb-0!"
                                        rules={[
                                            {
                                                required: true,
                                                type: 'number',
                                                min: 0.0001,
                                                max: 100,
                                                message:
                                                    'Nhập tỷ lệ lớn hơn 0, tối đa 100%.',
                                            },
                                        ]}
                                    >
                                        <ProtocolNumberInput
                                            aria-label={`Tỷ lệ cữ ${index + 1} từ DOC 30`}
                                            min={0.0001}
                                            max={100}
                                            suffix="%"
                                            className="w-full!"
                                        />
                                    </Form.Item>
                                    <Button
                                        aria-label={`Xóa cữ ${index + 1}`}
                                        icon={<DeleteOutlined />}
                                        disabled={fields.length <= 1}
                                        onClick={() => remove(field.name)}
                                    />
                                </div>
                            ))}
                            <Button
                                className="mb-4!"
                                icon={<PlusOutlined />}
                                disabled={fields.length >= 12}
                                onClick={() =>
                                    add({
                                        sharePct: null,
                                        growoutSharePct: null,
                                    })
                                }
                            >
                                Thêm cữ
                            </Button>
                        </>
                    )}
                </Form.List>
                <Form.List name="phases">
                    {(fields, { add, remove }) => (
                        <>
                            {fields.map((field, index) => (
                                <div
                                    key={field.key}
                                    className="mb-4 rounded-xl border border-[#e5e8f0] p-4"
                                >
                                    <Flex
                                        justify="space-between"
                                        align="center"
                                        className="mb-3!"
                                    >
                                        <Text strong>
                                            Giai đoạn {index + 1}
                                        </Text>
                                        <Button
                                            aria-label={`Xóa giai đoạn ${index + 1}`}
                                            icon={<DeleteOutlined />}
                                            disabled={fields.length <= 1}
                                            onClick={() => remove(field.name)}
                                        />
                                    </Flex>
                                    <div className="grid grid-cols-2 gap-x-4 max-sm:grid-cols-1">
                                        <Form.Item
                                            name={[field.name, 'startDay']}
                                            label="Từ DOC"
                                            rules={[
                                                {
                                                    required: true,
                                                    type: 'integer',
                                                    min: 1,
                                                    max: 3650,
                                                },
                                            ]}
                                        >
                                            <ProtocolNumberInput
                                                min={1}
                                                max={3650}
                                                className="w-full!"
                                            />
                                        </Form.Item>
                                        <Form.Item
                                            name={[field.name, 'endDay']}
                                            label="Đến DOC"
                                            rules={[
                                                {
                                                    required: true,
                                                    type: 'integer',
                                                    min: 1,
                                                    max: 3650,
                                                },
                                            ]}
                                        >
                                            <ProtocolNumberInput
                                                min={1}
                                                max={3650}
                                                className="w-full!"
                                            />
                                        </Form.Item>
                                    </div>
                                    <Form.Item
                                        name={[field.name, 'product']}
                                        label="Thức ăn"
                                        rules={[
                                            {
                                                required: true,
                                                message:
                                                    'Chọn thức ăn cho giai đoạn.',
                                            },
                                        ]}
                                    >
                                        <FeedField
                                            proposedMaterials={proposals}
                                            farm={farm}
                                            manufacturers={manufacturers}
                                        />
                                    </Form.Item>
                                    <div className="grid grid-cols-2 gap-x-4 max-sm:grid-cols-1">
                                        <Form.Item
                                            name={[field.name, 'doseBasis']}
                                            label="Cơ sở khẩu phần"
                                        >
                                            <Select
                                                onChange={() =>
                                                    form.setFieldValue(
                                                        [
                                                            'phases',
                                                            field.name,
                                                            'dailyIncrement',
                                                        ],
                                                        0
                                                    )
                                                }
                                                options={[
                                                    {
                                                        value: 'FIXED_QUANTITY',
                                                        label: 'Lượng cố định / ngày',
                                                    },
                                                    {
                                                        value: 'PERCENT_BIOMASS',
                                                        label: '% sinh khối / ngày (từ DOC 30)',
                                                    },
                                                ]}
                                            />
                                        </Form.Item>
                                        <Form.Item
                                            noStyle
                                            shouldUpdate={(before, after) =>
                                                before.phases?.[field.name]
                                                    ?.doseBasis !==
                                                    after.phases?.[field.name]
                                                        ?.doseBasis ||
                                                before.phases?.[field.name]
                                                    ?.startDay !==
                                                    after.phases?.[field.name]
                                                        ?.startDay ||
                                                before.phases?.[field.name]
                                                    ?.endDay !==
                                                    after.phases?.[field.name]
                                                        ?.endDay
                                            }
                                        >
                                            {({ getFieldValue }) => {
                                                const percent =
                                                    getFieldValue([
                                                        'phases',
                                                        field.name,
                                                        'doseBasis',
                                                    ]) === 'PERCENT_BIOMASS';
                                                return (
                                                    <>
                                                        <Form.Item
                                                            name={[
                                                                field.name,
                                                                'dailyDose',
                                                            ]}
                                                            label={
                                                                percent
                                                                    ? 'Tổng khẩu phần ngày (% sinh khối)'
                                                                    : 'Tổng lượng thức ăn / ngày'
                                                            }
                                                            rules={[
                                                                {
                                                                    required: true,
                                                                    type: 'number',
                                                                    min: 0.0001,
                                                                    max: percent
                                                                        ? 100
                                                                        : 9999999999,
                                                                },
                                                            ]}
                                                        >
                                                            <ProtocolNumberInput
                                                                min={0.0001}
                                                                max={
                                                                    percent
                                                                        ? 100
                                                                        : 9999999999
                                                                }
                                                                className="w-full!"
                                                            />
                                                        </Form.Item>
                                                        {!percent && (
                                                            <Form.Item
                                                                name={[
                                                                    field.name,
                                                                    'doseUnit',
                                                                ]}
                                                                label="Đơn vị"
                                                            >
                                                                <Select
                                                                    options={[
                                                                        {
                                                                            value: 'G',
                                                                            label: 'g',
                                                                        },
                                                                        {
                                                                            value: 'KG',
                                                                            label: 'kg',
                                                                        },
                                                                    ]}
                                                                />
                                                            </Form.Item>
                                                        )}
                                                        {!percent && (
                                                            <Form.Item
                                                                name={[
                                                                    field.name,
                                                                    'dailyIncrement',
                                                                ]}
                                                                label="Tăng tổng lượng mỗi ngày"
                                                                extra={
                                                                    form.getFieldValue(
                                                                        [
                                                                            'phases',
                                                                            field.name,
                                                                            'endDay',
                                                                        ]
                                                                    ) <= 29
                                                                        ? `Áp dụng trong DOC ${form.getFieldValue(['phases', field.name, 'startDay'])}–${form.getFieldValue(['phases', field.name, 'endDay'])}; cùng đơn vị với khẩu phần, nhập 0 để giữ cố định.`
                                                                        : 'Giai đoạn sau DOC 29 dùng khẩu phần cố định hoặc % sinh khối; mức tăng phải bằng 0.'
                                                                }
                                                                rules={[
                                                                    {
                                                                        validator:
                                                                            (
                                                                                _,
                                                                                value
                                                                            ) =>
                                                                                (value ??
                                                                                    0) ===
                                                                                    0 ||
                                                                                form.getFieldValue(
                                                                                    [
                                                                                        'phases',
                                                                                        field.name,
                                                                                        'endDay',
                                                                                    ]
                                                                                ) <=
                                                                                    29
                                                                                    ? Promise.resolve()
                                                                                    : Promise.reject(
                                                                                          new Error(
                                                                                              'Mức tăng chỉ áp dụng khi toàn bộ giai đoạn nằm trong DOC 1–29.'
                                                                                          )
                                                                                      ),
                                                                    },
                                                                ]}
                                                            >
                                                                <ProtocolNumberInput
                                                                    min={0}
                                                                    max={
                                                                        9999999999
                                                                    }
                                                                    className="w-full!"
                                                                />
                                                            </Form.Item>
                                                        )}
                                                    </>
                                                );
                                            }}
                                        </Form.Item>
                                    </div>
                                </div>
                            ))}
                            <Button
                                icon={<PlusOutlined />}
                                disabled={fields.length >= 120}
                                loading={addingPhase}
                                onClick={() => appendPhase(add)}
                            >
                                Thêm giai đoạn
                            </Button>
                        </>
                    )}
                </Form.List>
            </Form>
        </Modal>
    );
};

export default ExpertProtocolQuickBuilder;
