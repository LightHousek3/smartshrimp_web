import { useEffect, useRef, useState } from 'react';
import {
    Alert,
    App,
    Badge,
    Button,
    Card,
    Drawer,
    Empty,
    Flex,
    Form,
    Input,
    Modal,
    Select,
    Tag,
    TimePicker,
    Tooltip,
    Typography,
} from 'antd';
import {
    ArrowRightOutlined,
    DownOutlined,
    UpOutlined,
    CloseOutlined,
    CopyOutlined,
    DeleteOutlined,
    FormOutlined,
    MinusOutlined,
    PlusOutlined,
    QuestionCircleOutlined,
    SaveOutlined,
    WarningOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { expertProtocolTemplateAPI } from '../apis';
import {
    buildTemplateCreatePayload,
    getMaterialDoseBases,
    getMaterialDoseUnits,
    materialCategories,
    nextRepeatDay,
    getTemplateEditorStages,
    getApplicationDays,
    getStageDocError,
    getNextStageRange,
    assertTemplateStagesComplete,
    getSuggestedFeedDose,
    getEnvironmentRepeatError,
    getDoseInputValues,
    formatPostCount,
    parsePostCount,
    templateValidateMessages,
} from '../utils/protocolTemplateUtils';
import Loading from './Loading';
import InputNumber from './ProtocolNumberInput';
import ExpertProtocolQuickBuilder from './ExpertProtocolQuickBuilder';
import ProtocolProductImages from './ProtocolProductImages';
import ExpertProtocolMaterialPicker from './ExpertProtocolMaterialPicker';
import { templateProposals } from '../utils/materialCompliance';
import {
    defaultProtocolMeals,
    isAuthoringContextReady,
} from '../utils/protocolAuthoringDefaults';

const { Text } = Typography;
const muted = 'text-xs! text-[#8796ae]!';
const iconClass =
    'size-6.75! min-w-6.75! rounded-full! p-0! text-[13px]! text-[#8796ae]!';
const primaryButton =
    'h-9! border-0! bg-linear-to-r! from-[#77a1d3]! to-[#79cbca]! px-4! text-white!';
const key = () => crypto.randomUUID();
const newMeal = (time) => ({ key: key(), time, items: [] });
const clockValue = (time) => (time ? dayjs(`2000-01-01T${time}:00`) : null);
const newMaterial = (product) => ({
    key: key(),
    product,
    operationType: product.category === 'FEED' ? 'FEEDING' : product.category,
    doseValue: null,
    dailyDoseIncrement: 0,
    doseUnit: getMaterialDoseUnits(product)[0].value,
    doseBasis: 'FIXED_QUANTITY',
    instructions: '',
});
const freshMealTime = (meals) => {
    for (let minutes = 6 * 60; minutes < 24 * 60; minutes += 30) {
        const time = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
        if (!meals.some((meal) => meal.time === time)) return time;
    }
    return '00:00';
};
const ActionButton = ({ label, icon, onClick, danger = false, disabled }) => (
    <Tooltip title={label}>
        <Button
            type="text"
            icon={icon}
            aria-label={label}
            onClick={onClick}
            disabled={disabled}
            className={`${iconClass} ${danger ? 'text-[#ef4767]!' : ''}`}
        />
    </Tooltip>
);

const MaterialRow = ({
    item,
    startDay,
    endDay,
    environment,
    onChange,
    onDelete,
    onInstructions,
}) => {
    const bases = getMaterialDoseBases(
        item.product,
        environment ? item.firstDay : startDay,
        environment
    );
    const units = getMaterialDoseUnits(item.product);
    const isPercent = item.doseBasis === 'PERCENT_BIOMASS';
    const inputDose = getDoseInputValues(item);
    const preciseDose =
        Number.isFinite(inputDose.doseValue) &&
        Math.abs(
            inputDose.doseValue - Math.round(inputDose.doseValue * 100) / 100
        ) > 0.000001;
    // Additive daily growth models early feed ramps, not label concentrations for other materials.
    const canIncrease =
        !environment && item.product.category === 'FEED' && (item.lastDay ?? endDay) <= 29;
    const linearDaily = item.linearDaily || (item.dailyDoseIncrement ?? 0) > 0;
    const environmentError = environment
        ? getEnvironmentRepeatError(item, { startDay, endDay })
        : null;
    const warning = item.product.unavailable
        ? 'Vật tư đã bị xóa/lưu trữ. Hãy chọn lại vật tư.'
        : item.product.safety?.status !== 'VERIFIED' && item.product.safety
          ? item.product.safety.reason
          : item.product.stockQuantity !== undefined &&
              item.product.stockQuantity <= item.product.minAlertQuantity
            ? 'Tồn kho dưới ngưỡng cảnh báo. Mẫu không tự đặt giữ hàng.'
            : null;
    return (
        <Flex
            align="center"
            gap={8}
            wrap
            className="min-h-13.5! min-w-0! max-w-full! rounded-lg! border! border-[#eef1f7]! bg-white! py-1.5! pl-2.5! pr-1!"
        >
            <Badge
                color={
                    item.product.category === 'FEED'
                        ? '#1d7ad6'
                        : item.product.category === 'MINERAL'
                          ? '#7c5ce0'
                          : environment
                            ? '#0f9b8e'
                            : '#d43b57'
                }
                className="shrink-0! [&_.ant-badge-status-dot]:size-2!"
            />
            <ProtocolProductImages product={item.product} size={40} />
            <Flex vertical className="min-w-45! flex-1!">
                <Flex gap={6} align="center">
                    <Text className="wrap-break-word! text-[12.5px]! font-semibold! leading-4! text-[#0f1c2e]!">
                        {item.product.name}
                    </Text>
                    {warning && (
                        <Tooltip title={warning}>
                            <WarningOutlined className="shrink-0 text-[#d97706]" />
                        </Tooltip>
                    )}
                </Flex>
                <Text className="text-[11px]! leading-4.125! text-[#6a7994]!">
                    {materialCategories.find(
                        ({ value }) => value === item.product.category
                    )?.label ?? 'Chưa rõ nhóm'}
                    {!item.product.id && ' · Vật tư đề xuất'}
                </Text>
            </Flex>
            <Tooltip
                title={
                    preciseDose
                        ? `Liều đã lưu: ${inputDose.doseValue} ${inputDose.doseUnit.toLowerCase()}. Liều được lưu tối đa 4 chữ số thập phân.`
                        : undefined
                }
            >
                <InputNumber
                    aria-label={`Liều một ${environment ? 'lần xử lý' : 'cữ'} ${item.product.name}`}
                    value={inputDose.doseValue}
                    onChange={(doseValue) =>
                        onChange({ ...inputDose, doseValue })
                    }
                    min={0.0001}
                    max={isPercent ? 100 : 9999999999}
                    precision={4}
                    changeOnBlur={false}
                    placeholder="Liều"
                    size="small"
                    className="h-6.75! w-20! rounded-md!"
                />
            </Tooltip>
            {!isPercent && (
                <Select
                    aria-label={`Đơn vị liều ${item.product.name}`}
                    size="small"
                    className="h-6.75! w-18!"
                    options={units}
                    value={inputDose.doseUnit}
                    onChange={(doseUnit) =>
                        onChange(getDoseInputValues(item, doseUnit))
                    }
                />
            )}
            <Select
                aria-label={`Cách tính liều ${item.product.name}`}
                size="small"
                className="h-6.75! w-32.5!"
                value={linearDaily ? 'LINEAR_DAILY' : item.doseBasis}
                options={
                    canIncrease || linearDaily
                        ? [
                              ...bases,
                              {
                                  value: 'LINEAR_DAILY',
                                  label: 'Tăng đều mỗi ngày',
                                  disabled: !canIncrease,
                              },
                          ]
                        : bases
                }
                status={
                    bases.some(({ value }) => value === item.doseBasis) &&
                    (!linearDaily || canIncrease)
                        ? undefined
                        : 'error'
                }
                onChange={(doseBasis) =>
                    onChange({
                        doseBasis:
                            doseBasis === 'LINEAR_DAILY'
                                ? 'FIXED_QUANTITY'
                                : doseBasis,
                        linearDaily: doseBasis === 'LINEAR_DAILY',
                        doseValue: null,
                        dailyDoseIncrement: 0,
                        ...(doseBasis === 'PERCENT_BIOMASS'
                            ? { doseUnit: 'KG' }
                            : {}),
                    })
                }
            />
            {!environment && (
                <Button
                    size="small"
                    onClick={onInstructions}
                    className="text-xs!"
                >
                    Ngày áp dụng (
                    {getApplicationDays(item, startDay, endDay).length})
                </Button>
            )}
            {environment && (
                <>
                    <TimePicker
                        placeholder="Chọn giờ"
                        size="small"
                        format="HH:mm"
                        value={clockValue(item.time)}
                        allowClear={false}
                        onChange={(_, time) => onChange({ time })}
                        className="h-6.75! w-21!"
                        aria-label="Giờ xử lý môi trường"
                    />
                    <Text className="text-[11.5px]! text-[#6a7994]!">
                        {'mỗi'}
                    </Text>
                    <InputNumber
                        size="small"
                        min={1}
                        max={Math.max(
                            1,
                            Math.min(
                                30,
                                (item.lastDay ?? endDay) - item.firstDay + 1
                            )
                        )}
                        value={item.repeatIntervalDays}
                        placeholder="1 lần"
                        changeOnBlur={false}
                        status={environmentError ? 'error' : undefined}
                        onChange={(repeatIntervalDays) =>
                            onChange({ repeatIntervalDays })
                        }
                        className="h-6.75! w-14!"
                        aria-label="Chu kỳ xử lý môi trường"
                    />
                    <Text className="text-[11.5px]! text-[#6a7994]!">
                        {'ngày'}
                    </Text>
                </>
            )}
            <Tooltip title={item.instructions || 'Thêm hướng dẫn'}>
                <Button
                    type="text"
                    aria-label={`Hướng dẫn ${item.product.name}`}
                    icon={<FormOutlined />}
                    onClick={onInstructions}
                    className={`${iconClass} bg-transparent! hover:bg-transparent!`}
                />
            </Tooltip>
            <ActionButton
                label={`Xóa ${item.product.name}`}
                icon={<DeleteOutlined />}
                danger
                onClick={onDelete}
            />
            {canIncrease && linearDaily && (
                <Flex
                    gap={6}
                    align="center"
                    wrap
                    className="basis-full! pb-1! pl-16! max-sm:pl-0!"
                >
                    <Tooltip title="Mức tăng lượng mỗi cữ mỗi ngày. Tổng mức tăng cả ngày bằng tổng mức tăng các cữ.">
                        <Text className="whitespace-nowrap! text-xs! text-[#6a7994]!">
                            {'Tăng mỗi cữ mỗi ngày'}
                        </Text>
                    </Tooltip>
                    <InputNumber
                        size="small"
                        min={0.0001}
                        max={9999999999}
                        precision={4}
                        value={inputDose.dailyDoseIncrement}
                        onChange={(dailyDoseIncrement) =>
                            onChange({ ...inputDose, dailyDoseIncrement })
                        }
                        aria-label={`Mức tăng mỗi cữ mỗi ngày ${item.product.name}`}
                        className="h-6.75! w-20!"
                    />
                    <Text className="text-xs! text-[#6a7994]!">
                        {inputDose.doseUnit.toLowerCase()} {'· Cuối giai đoạn:'}{' '}
                        {Number.isFinite(item.doseValue)
                            ? new Intl.NumberFormat('vi-VN', {
                                  maximumFractionDigits: 4,
                              }).format(
                                  inputDose.doseValue +
                                      inputDose.dailyDoseIncrement *
                                          (endDay - startDay)
                              )
                            : '—'}{' '}
                        {inputDose.doseUnit.toLowerCase()}
                        {'/cữ'}
                    </Text>
                </Flex>
            )}
            {preciseDose && (
                <Text className="basis-full! pl-16! text-xs! text-[#6a7994]!">
                    {'Liều đã lưu:'} {inputDose.doseValue}{' '}
                    {inputDose.doseUnit.toLowerCase()}{' '}
                    {'· giữ nguyên nếu chưa sửa.'}
                </Text>
            )}
            {environment && (
                <Text
                    className={`basis-full! pl-16! text-xs! ${environmentError ? 'text-[#ff4d4f]!' : 'text-[#6a7994]!'}`}
                    role={environmentError ? 'alert' : undefined}
                >
                    {environmentError ||
                        (item.repeatIntervalDays == null
                            ? `Dùng một lần tại DOC ${item.firstDay}`
                            : `Áp dụng DOC ${item.firstDay}–${item.lastDay ?? endDay}, mỗi ${item.repeatIntervalDays} ngày`)}
                </Text>
            )}
        </Flex>
    );
};

/** Create/edit share authoring UI; persisted versions use an explicit optimistic lock. */
const ExpertProtocolTemplateEditor = ({ templateId, onClose, onSaved }) => {
    const [form] = Form.useForm();
    const { message, modal } = App.useApp();
    const [options, setOptions] = useState({
        loading: true,
        farms: [],
        error: null,
    });
    const [revision, setRevision] = useState(0);
    const [quickBuilderOpen, setQuickBuilderOpen] = useState(false);
    const [expandedStageKeys, setExpandedStageKeys] = useState([]);
    const [applicationDaysDraft, setApplicationDaysDraft] = useState([]);
    const [stages, setStages] = useState([]);
    const [picker, setPicker] = useState(null);
    const [instructionTarget, setInstructionTarget] = useState(null);
    const [instructionDraft, setInstructionDraft] = useState('');
    const [firstDayDraft, setFirstDayDraft] = useState(null);
    const [lastDayDraft, setLastDayDraft] = useState(null);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState(null);
    const [editData, setEditData] = useState(null);
    const [conflict, setConflict] = useState(false);
    const initialStages = useRef('[]');
    const submitLock = useRef(false);
    const mounted = useRef(true);
    const selectedFarmId = Form.useWatch('farmId', form);
    const selectedSpecies = Form.useWatch('shrimpType', form);
    const selectedPostCount = Form.useWatch('referencePostCount', form);
    const authoringReady = isAuthoringContextReady({
        farmId: selectedFarmId,
        shrimpType: selectedSpecies,
        referencePostCount: selectedPostCount,
    });
    const appendStageLock = useRef(false);
    const [addingStage, setAddingStage] = useState(false);
    const selectedFarm = options.farms.find(
        (farm) => farm.id === selectedFarmId
    );
    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
        };
    }, []);
    useEffect(() => {
        const controller = new AbortController();
        Promise.all([
            expertProtocolTemplateAPI.getCreationOptions(controller.signal),
            templateId
                ? expertProtocolTemplateAPI.getEditor(
                      templateId,
                      controller.signal
                  )
                : Promise.resolve(null),
        ])
            .then(([result, template]) => {
                if (controller.signal.aborted) return;
                if (template) {
                    const loadedStages = getTemplateEditorStages(
                        template.items
                    );
                    initialStages.current = JSON.stringify(loadedStages);
                    setStages(loadedStages);
                    setExpandedStageKeys(
                        loadedStages.length ? [loadedStages[0].key] : []
                    );
                    setEditData(template);
                    form.setFieldsValue({
                        status: template.status,
                        title: template.title,
                        farmId: template.farm.id,
                        shrimpType: template.shrimpType,
                        allowedVariancePct: template.allowedVariancePct,
                        description: template.description,
                        referencePostCount: template.referencePostCount,
                    });
                    form.setFields(
                        [
                            'title',
                            'farmId',
                            'shrimpType',
                            'allowedVariancePct',
                            'description',
                            'referencePostCount',
                        ].map((name) => ({ name, touched: false }))
                    );
                    setConflict(false);
                    setSaveError(null);
                }
                setOptions({ ...result, loading: false, error: null });
            })
            .catch((error) => {
                if (!controller.signal.aborted)
                    setOptions({
                        farms: [],
                        loading: false,
                        error:
                            error.response?.data?.message ||
                            'Không thể tải trang trại. Vui lòng thử lại.',
                    });
            });
        return () => controller.abort();
    }, [revision, templateId, form]);
    const updateStage = (id, change) =>
        setStages((current) =>
            current.map((stage) => {
                if (stage.key !== id) return stage;
                const next = change(stage);
                return {
                    ...next,
                    meals: [...next.meals].sort((first, second) =>
                        (first.time || '').localeCompare(second.time || '')
                    ),
                };
            })
        );
    const updateItem = (target, changes) =>
        updateStage(target.stageKey, (stage) =>
            target.mealKey
                ? {
                      ...stage,
                      meals: stage.meals.map((meal) =>
                          meal.key !== target.mealKey
                              ? meal
                              : {
                                    ...meal,
                                    items: meal.items.map((item) =>
                                        item.key === target.itemKey
                                            ? { ...item, ...changes }
                                            : item
                                    ),
                                }
                      ),
                  }
                : {
                      ...stage,
                      environment: stage.environment.map((item) =>
                          item.key === target.itemKey
                              ? { ...item, ...changes }
                              : item
                      ),
                  }
        );
    const deleteItem = (target) =>
        updateStage(target.stageKey, (stage) =>
            target.mealKey
                ? {
                      ...stage,
                      meals: stage.meals.map((meal) =>
                          meal.key !== target.mealKey
                              ? meal
                              : {
                                    ...meal,
                                    items: meal.items.filter(
                                        (item) => item.key !== target.itemKey
                                    ),
                                }
                      ),
                  }
                : {
                      ...stage,
                      environment: stage.environment.filter(
                          (item) => item.key !== target.itemKey
                      ),
                  }
        );
    const openPicker = (target) => {
        if (!selectedFarm) {
            message.warning('Chọn trang trại trước khi thêm vật tư.');
            return;
        }
        setPicker(target);
    };
    const selectMaterial = (product) => {
        const stage = stages.find((item) => item.key === picker.stageKey);
        const meal = stage?.meals.find((item) => item.key === picker.mealKey);
        if (
            meal?.items.some((item) =>
                product.id
                    ? item.product.id === product.id
                    : !item.product.id &&
                      item.product.name.trim().toLocaleLowerCase('vi') ===
                          product.name.trim().toLocaleLowerCase('vi')
            )
        ) {
            message.info(
                'Vật tư này đã có trong cữ. Anh/chị chỉnh liều hoặc ngày áp dụng ngay tại dòng hiện có.'
            );
            return;
        }
        const material = newMaterial(product);
        if (meal && authoringReady) {
            const suggested = getSuggestedFeedDose({
                product,
                stage,
                mealKey: meal.key,
                previousStage: stages[stages.indexOf(stage) - 1],
                shrimpType: selectedSpecies,
                referencePostCount: selectedPostCount,
            });
            if (suggested) Object.assign(material, suggested);
        }
        updateStage(picker.stageKey, (stage) =>
            picker.mealKey
                ? {
                      ...stage,
                      meals: stage.meals.map((meal) =>
                          meal.key !== picker.mealKey
                              ? meal
                              : { ...meal, items: [...meal.items, material] }
                      ),
                  }
                : {
                      ...stage,
                      environment: [
                          ...stage.environment,
                          {
                              ...material,
                              firstDay: stage.startDay,
                              time: '21:00',
                              repeatIntervalDays: null,
                          },
                      ],
                  }
        );
        setPicker(null);
    };
    const validateAuthoringContext = async () => {
        await form.validateFields([
            'farmId',
            'shrimpType',
            'referencePostCount',
        ]);
        if (!isAuthoringContextReady(form.getFieldsValue()))
            throw new Error(
                'Anh/chị chọn trang trại, loài tôm và nhập số post tham chiếu hợp lệ trước khi lập giai đoạn.'
            );
    };
    // Share completeness and concurrency checks between adding and copying a stage.
    const appendValidatedStage = async (action) => {
        if (appendStageLock.current) return;
        appendStageLock.current = true;
        setAddingStage(true);
        try {
            await validateAuthoringContext();
            assertTemplateStagesComplete(form.getFieldsValue(), stages);
            action();
        } catch (error) {
            message.warning(
                error.message ||
                    'Anh/chị hoàn thành thông tin đầu phác đồ và các giai đoạn hiện có trước khi thêm giai đoạn.'
            );
        } finally {
            appendStageLock.current = false;
            setAddingStage(false);
        }
    };
    const addStage = () =>
        appendValidatedStage(() => {
            const species = form.getFieldValue('shrimpType');
            const range = getNextStageRange(stages, species);
            const last = stages.at(-1);
            const stage = {
                key: key(),
                ...range,
                meals: (last?.meals.length
                    ? last.meals.map((meal) => meal.time)
                    : defaultProtocolMeals(species).map((meal) => meal.time)
                ).map(newMeal),
                environment: [],
            };
            setStages((current) => [...current, stage]);
            setExpandedStageKeys((current) => [...current, stage.key]);
        });
    const copyStage = (source) =>
        appendValidatedStage(() => {
            const startDay = getNextStageRange(
                stages,
                form.getFieldValue('shrimpType')
            ).startDay;
            const endDay = startDay + source.endDay - source.startDay;
            if (endDay > 3650)
                throw new Error('Giai đoạn sao chép vượt phạm vi DOC.');
            const copied = structuredClone(source);
            const candidate = {
                ...copied,
                key: key(),
                startDay,
                endDay,
                meals: copied.meals.map((meal) => ({
                    ...meal,
                    key: key(),
                    items: meal.items.flatMap((item) => {
                        const firstDay = nextRepeatDay(
                            item.firstDay ?? source.startDay,
                            item.repeatIntervalDays ?? 1,
                            startDay
                        );
                        return firstDay > endDay
                            ? []
                            : [
                                  {
                                      ...item,
                                      key: key(),
                                      firstDay,
                                      lastDay:
                                          item.lastDay == null
                                              ? undefined
                                              : startDay +
                                                item.lastDay -
                                                source.startDay,
                                      applicationDays:
                                          item.applicationDays?.map(
                                              (day) =>
                                                  startDay +
                                                  day -
                                                  source.startDay
                                          ),
                                  },
                              ];
                    }),
                })),
                environment: copied.environment.flatMap((item) => {
                    const firstDay = nextRepeatDay(
                        item.firstDay,
                        item.repeatIntervalDays ?? 1,
                        startDay
                    );
                    if (item.repeatIntervalDays == null)
                        return [
                            {
                                ...item,
                                key: key(),
                                lastDay:
                                    item.lastDay == null
                                        ? undefined
                                        : startDay +
                                          item.lastDay -
                                          source.startDay,
                                firstDay:
                                    startDay + item.firstDay - source.startDay,
                            },
                        ];
                    return firstDay > endDay
                        ? []
                        : [
                              {
                                  ...item,
                                  key: key(),
                                  firstDay,
                                  lastDay:
                                      item.lastDay == null
                                          ? undefined
                                          : startDay +
                                            item.lastDay -
                                            source.startDay,
                              },
                          ];
                }),
            };
            assertTemplateStagesComplete(form.getFieldsValue(), [
                ...stages,
                candidate,
            ]);
            setStages((current) => [...current, candidate]);
            setExpandedStageKeys((current) => [...current, candidate.key]);
        });
    const confirmClose = () => {
        if (saving) return;
        if (
            form.isFieldsTouched() ||
            (templateId
                ? JSON.stringify(stages) !== initialStages.current
                : stages.length)
        )
            modal.confirm({
                title: 'Bỏ thay đổi chưa lưu?',
                content: 'Các thay đổi trong mẫu này chưa được lưu.',
                okText: 'Bỏ thay đổi',
                cancelText: 'Tiếp tục chỉnh sửa',
                onOk: onClose,
            });
        else onClose();
    };
    const changeFarm = (farmId) => {
        if (
            !stages.some(
                (stage) =>
                    stage.environment.length ||
                    stage.meals.some((meal) => meal.items.length)
            )
        ) {
            form.setFieldValue('farmId', farmId);
            return;
        }
        modal.confirm({
            title: 'Đổi trang trại?',
            content:
                'Vật tư thuộc kho của trang trại. Đổi trang trại sẽ xóa vật tư đã chọn, giữ lại giai đoạn và giờ ăn.',
            okText: 'Đổi trang trại',
            cancelText: 'Giữ nguyên',
            onOk: () => {
                form.setFieldValue('farmId', farmId);
                setStages((current) =>
                    current.map((stage) => ({
                        ...stage,
                        environment: [],
                        meals: stage.meals.map((meal) => ({
                            ...meal,
                            items: [],
                        })),
                    }))
                );
            },
        });
    };
    const submit = async (values) => {
        if (submitLock.current) return;
        setSaveError(null);
        let body;
        try {
            body = buildTemplateCreatePayload(
                { ...values, status: editData?.status ?? 'active' },
                stages
            );
            if (templateId) body.expectedVersionNo = editData.versionNo;
        } catch (error) {
            setSaveError(error.message);
            return;
        }
        submitLock.current = true;
        setSaving(true);
        try {
            const template = templateId
                ? await expertProtocolTemplateAPI.updateTemplate(
                      templateId,
                      body
                  )
                : await expertProtocolTemplateAPI.createTemplate(body);
            if (mounted.current) {
                message.success(
                    templateId
                        ? 'Cập nhật phác đồ mẫu thành công.'
                        : 'Tạo phác đồ mẫu thành công.'
                );
                onSaved(template);
            }
        } catch (error) {
            if (mounted.current && error.response?.status === 409)
                setConflict(true);
            if (mounted.current)
                setSaveError(
                    error.response?.data?.message ||
                        'Chưa nhận được xác nhận lưu mẫu. Hãy kiểm tra danh sách trước khi lưu lại để tránh tạo trùng.'
                );
        } finally {
            submitLock.current = false;
            if (mounted.current) setSaving(false);
        }
    };
    const itemCount = stages.reduce(
        (sum, stage) =>
            sum +
            stage.environment.length +
            stage.meals.reduce((count, meal) => count + meal.items.length, 0),
        0
    );
    const invalidStages = stages.some(
        (stage, index) =>
            getStageDocError(stages, index) ||
            stage.environment.some((item) =>
                getEnvironmentRepeatError(item, stage)
            )
    );
    const instructionItem = stages.find(
        (stage) => stage.key === instructionTarget?.stageKey
    );
    const productForInstructions = instructionTarget?.mealKey
        ? instructionItem?.meals
              .find((meal) => meal.key === instructionTarget.mealKey)
              ?.items.find((item) => item.key === instructionTarget.itemKey)
              ?.product
        : instructionItem?.environment.find(
              (item) => item.key === instructionTarget?.itemKey
          )?.product;
    const renderMaterial = (stage, item, mealKey) => {
        const target = { stageKey: stage.key, mealKey, itemKey: item.key };
        return (
            <MaterialRow
                key={item.key}
                item={item}
                startDay={stage.startDay}
                endDay={stage.endDay}
                environment={!mealKey}
                onChange={(change) => updateItem(target, change)}
                onDelete={() => deleteItem(target)}
                onInstructions={() => {
                    setInstructionTarget(target);
                    setInstructionDraft(item.instructions);
                    setFirstDayDraft(item.firstDay);
                    setLastDayDraft(item.lastDay ?? stage.endDay);
                    setApplicationDaysDraft(
                        getApplicationDays(item, stage.startDay, stage.endDay)
                    );
                }}
            />
        );
    };
    return (
        <Drawer
            open
            width={1080}
            closeIcon={<CloseOutlined />}
            onClose={confirmClose}
            maskClosable={!saving}
            keyboard={!saving}
            rootClassName="[&_.ant-drawer-content-wrapper]:max-w-full!"
            classNames={{
                header: 'min-h-14.25! border-[#eef1f7]! px-6! py-4!',
                body: 'flex! min-h-0! min-w-0! flex-col! overflow-x-hidden! px-6! py-6!',
                footer: 'border-[#eef1f7]! px-5! py-4!',
            }}
            title={
                <Text className="font-['Sora',sans-serif]! text-[15px]! font-semibold! text-[#0f1c2e]!">
                    {templateId ? 'Chỉnh sửa phác đồ mẫu' : 'Tạo phác đồ mẫu'}
                </Text>
            }
            footer={
                <Flex justify="space-between" align="center" gap={12} wrap>
                    <Text className={muted}>
                        {stages.length} {'giai đoạn ·'} {itemCount}{' '}
                        {'hạng mục · cữ/ngày'}{' '}
                        {stages.length
                            ? stages
                                  .map((stage) => stage.meals.length)
                                  .join(' → ')
                            : '—'}
                    </Text>
                    <Flex gap={8}>
                        <Button disabled={saving} onClick={confirmClose}>
                            {'Hủy'}
                        </Button>
                        <Button
                            icon={<SaveOutlined />}
                            loading={saving}
                            disabled={
                                options.loading ||
                                Boolean(options.error) ||
                                !options.farms.length ||
                                conflict ||
                                invalidStages
                            }
                            onClick={() => form.submit()}
                            className={primaryButton}
                        >
                            {'Lưu mẫu'}
                        </Button>
                    </Flex>
                </Flex>
            }
        >
            {options.loading ? (
                <Loading
                    className="min-h-0! w-full! flex-1!"
                    tip={
                        templateId
                            ? 'Đang tải dữ liệu chỉnh sửa'
                            : 'Đang tải dữ liệu tạo mẫu'
                    }
                />
            ) : options.error ? (
                <Alert
                    type="error"
                    showIcon
                    message={options.error}
                    action={
                        <Button
                            onClick={() => {
                                setOptions((current) => ({
                                    ...current,
                                    loading: true,
                                    error: null,
                                }));
                                setRevision((current) => current + 1);
                            }}
                        >
                            {'Thử lại'}
                        </Button>
                    }
                />
            ) : (
                <Form
                    form={form}
                    layout="vertical"
                    validateMessages={templateValidateMessages}
                    initialValues={{ allowedVariancePct: 10 }}
                    onFinish={submit}
                    disabled={saving}
                    className="min-w-0! max-w-full! [&_.ant-form-item-label>label]:text-xs! [&_.ant-form-item-label>label]:text-[#3a4a63]!"
                >
                    {!options.farms.length && (
                        <Alert
                            type="info"
                            showIcon
                            message="Chưa có trang trại trong phạm vi quản lý để tạo mẫu."
                            className="mb-4!"
                        />
                    )}
                    <Flex className="grid! min-w-0! grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]! gap-x-4! max-lg:grid-cols-2! max-sm:grid-cols-1!">
                        <Form.Item
                            label="Tên mẫu"
                            name="title"
                            rules={[
                                {
                                    required: true,
                                    whitespace: true,
                                    max: 500,
                                    message: 'Nhập tên mẫu (tối đa 500 ký tự).',
                                },
                            ]}
                        >
                            <Input
                                className="h-9! rounded-2.5! text-[13px]!"
                                maxLength={500}
                                placeholder="VD: Thẻ chân trắng thâm canh 90 ngày"
                            />
                        </Form.Item>
                        <Form.Item
                            label={
                                <Flex gap={4}>
                                    {'Trang trại'}
                                    <Tooltip title="Chỉ chọn trang trại thuộc chủ trại đang quản lý.">
                                        <QuestionCircleOutlined />
                                    </Tooltip>
                                </Flex>
                            }
                            name="farmId"
                            rules={[
                                {
                                    required: true,
                                    message: 'Chọn trang trại.',
                                },
                            ]}
                        >
                            <Select
                                className="h-9! text-[13px]! [&_.ant-select-selector]:rounded-2.5!"
                                disabled={Boolean(editData?.farmLocked)}
                                options={options.farms.map((farm) => ({
                                    label: farm.name,
                                    value: farm.id,
                                }))}
                                onChange={(value) => {
                                    form.setFieldValue(
                                        'farmId',
                                        selectedFarmId
                                    );
                                    changeFarm(value);
                                }}
                                placeholder="Chọn trang trại"
                            />
                        </Form.Item>
                        <Form.Item
                            label="Loài tôm"
                            name="shrimpType"
                            rules={[
                                {
                                    required: true,
                                    message: 'Chọn loài tôm cho phác đồ.',
                                },
                            ]}
                        >
                            <Select
                                className="h-9! text-[13px]! [&_.ant-select-selector]:rounded-2.5!"
                                placeholder="Chọn loài tôm"
                                options={[
                                    {
                                        value: 'WHITELEG',
                                        label: 'Tôm thẻ chân trắng',
                                    },
                                    {
                                        value: 'BLACK_TIGER',
                                        label: 'Tôm sú',
                                    },
                                ]}
                            />
                        </Form.Item>
                        <Form.Item
                            label="Sai lệch cho phép (%)"
                            name="allowedVariancePct"
                            rules={[
                                {
                                    required: true,
                                    type: 'number',
                                    min: 0,
                                    max: 100,
                                },
                            ]}
                        >
                            <InputNumber
                                min={0}
                                max={100}
                                precision={2}
                                className="h-9! w-full! rounded-2.5! text-[13px]!"
                            />
                        </Form.Item>
                    </Flex>
                    <Form.Item
                        name="description"
                        label="Mô tả / điều kiện áp dụng (Tùy chọn)"
                        rules={[{ max: 255 }]}
                    >
                        <Input.TextArea
                            rows={2}
                            maxLength={255}
                            placeholder="Mật độ, mùa vụ, mục tiêu FCR…"
                        />
                    </Form.Item>
                    <Form.Item
                        label="Số post tham chiếu"
                        htmlFor="protocol-reference-post-count"
                        required
                        className="mb-5! rounded-xl! border! border-[#e5e8f0]! bg-[#f6f9fc]! p-3!"
                    >
                        {/* Keep the action aligned with the input when validation expands below it. */}
                        <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                            <Form.Item
                                name="referencePostCount"
                                messageVariables={{
                                    label: 'Số post tham chiếu',
                                }}
                                validateFirst
                                className="mb-0! min-w-0! [&_.ant-form-item-explain]:wrap-break-word!"
                                rules={[
                                    {
                                        required: true,
                                        message:
                                            'Vui lòng nhập số post tham chiếu.',
                                    },
                                    {
                                        type: 'integer',
                                        min: 1,
                                        max: 1000000000,
                                    },
                                ]}
                            >
                                <InputNumber
                                    id="protocol-reference-post-count"
                                    min={1}
                                    max={1000000000}
                                    precision={0}
                                    placeholder="VD: 100.000"
                                    formatter={formatPostCount}
                                    parser={parsePostCount}
                                    className="w-full!"
                                />
                            </Form.Item>
                            <Button
                                className="h-9! shrink-0!"
                                icon={<PlusOutlined />}
                                disabled={
                                    !authoringReady || !selectedFarm || saving
                                }
                                onClick={async () => {
                                    try {
                                        await validateAuthoringContext();
                                        setQuickBuilderOpen(true);
                                    } catch {
                                        message.warning(
                                            'Anh/chị hoàn thành trang trại, loài tôm và số post tham chiếu trước khi tạo nhanh.'
                                        );
                                    }
                                }}
                            >
                                Tạo nhanh phác đồ
                            </Button>
                        </div>
                    </Form.Item>
                    <Text className="mb-3! block! text-xs! text-[#6a7994]!">
                        Khẩu phần thức ăn được điền gợi ý theo loài, số post và
                        giai đoạn trước. Anh/chị có thể chỉnh; các dòng đã nhập
                        không tự thay đổi.
                    </Text>
                    {saveError && (
                        <Alert
                            type="error"
                            showIcon
                            message={saveError}
                            className="mb-4!"
                            action={
                                conflict ? (
                                    <Button
                                        onClick={() =>
                                            modal.confirm({
                                                title: 'Tải lại phiên bản mới?',
                                                content:
                                                    'Thay đổi chưa lưu sẽ bị bỏ.',
                                                okText: 'Tải lại',
                                                cancelText: 'Giữ lại',
                                                onOk: () => {
                                                    setOptions((current) => ({
                                                        ...current,
                                                        loading: true,
                                                    }));
                                                    setRevision(
                                                        (current) => current + 1
                                                    );
                                                },
                                            })
                                        }
                                    >
                                        {'Tải lại mẫu'}
                                    </Button>
                                ) : undefined
                            }
                        />
                    )}
                    <Flex vertical gap={16}>
                        {!stages.length && (
                            <Flex
                                align="center"
                                justify="center"
                                className="min-h-55! rounded-xl! border! border-dashed! border-[#eef1f7]!"
                            >
                                <Empty
                                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                                    description={
                                        <Text className={muted}>
                                            {'Chưa có giai đoạn nào'}
                                        </Text>
                                    }
                                />
                            </Flex>
                        )}
                        {stages.map((stage, index) => (
                            <Card
                                key={stage.key}
                                className="overflow-hidden! rounded-xl! border-[#e5e8f0]! [&>.ant-card-body]:p-0!"
                            >
                                <Flex
                                    gap={8}
                                    align="center"
                                    wrap
                                    className="border-b! border-[#eef1f7]! bg-[#f6f9fc]! px-4! py-3!"
                                >
                                    <Text className="font-['Sora',sans-serif]! text-[13.5px]! font-semibold!">
                                        {'Giai đoạn'} {index + 1}
                                    </Text>
                                    <Text className={muted}>DOC</Text>
                                    <InputNumber
                                        size="small"
                                        min={
                                            index
                                                ? stages[index - 1].endDay + 1
                                                : 1
                                        }
                                        max={3650}
                                        value={stage.startDay}
                                        changeOnBlur={false}
                                        status={
                                            getStageDocError(stages, index)
                                                ? 'error'
                                                : undefined
                                        }
                                        className="w-16!"
                                        aria-label={`DOC đầu giai đoạn ${index + 1}`}
                                        onChange={(startDay) =>
                                            updateStage(
                                                stage.key,
                                                (current) => ({
                                                    ...current,
                                                    startDay,
                                                })
                                            )
                                        }
                                    />
                                    <ArrowRightOutlined className="text-[#6a7994]" />
                                    <InputNumber
                                        size="small"
                                        min={stage.startDay || 1}
                                        max={
                                            stages[index + 1]
                                                ? stages[index + 1].startDay - 1
                                                : 3650
                                        }
                                        value={stage.endDay}
                                        changeOnBlur={false}
                                        status={
                                            getStageDocError(stages, index)
                                                ? 'error'
                                                : undefined
                                        }
                                        className="w-16!"
                                        aria-label={`DOC cuối giai đoạn ${index + 1}`}
                                        onChange={(endDay) =>
                                            updateStage(
                                                stage.key,
                                                (current) => ({
                                                    ...current,
                                                    endDay,
                                                })
                                            )
                                        }
                                    />
                                    <Text className={muted}>
                                        (
                                        {Math.max(
                                            0,
                                            stage.endDay - stage.startDay + 1
                                        )}{' '}
                                        {'ngày)'}
                                    </Text>
                                    <Tag className="m-0! rounded-full! border-0! bg-[#f1f4f6]! text-[10px]!">
                                        {stage.meals.length} {'cữ/ngày'}
                                    </Tag>
                                    <Flex gap={2} className="ml-auto!">
                                        <ActionButton
                                            label="Giảm 1 cữ"
                                            icon={<MinusOutlined />}
                                            disabled={
                                                saving ||
                                                stage.meals.length <= 1
                                            }
                                            onClick={() => {
                                                const apply = () =>
                                                    updateStage(
                                                        stage.key,
                                                        (current) => ({
                                                            ...current,
                                                            meals: current.meals.slice(
                                                                0,
                                                                -1
                                                            ),
                                                        })
                                                    );
                                                if (
                                                    stage.meals.at(-1)?.items
                                                        .length
                                                )
                                                    modal.confirm({
                                                        title: 'Giảm một cữ?',
                                                        content:
                                                            'Bỏ cữ cuối cùng và vật tư của cữ đó. Liều các cữ còn lại không tự tăng; hãy kiểm tra lại tổng lượng cho ăn.',
                                                        okText: 'Giảm cữ',
                                                        cancelText: 'Hủy',
                                                        onOk: apply,
                                                    });
                                                else apply();
                                            }}
                                        />
                                        <ActionButton
                                            label="Thêm cữ"
                                            icon={<PlusOutlined />}
                                            disabled={
                                                saving ||
                                                stage.meals.length >= 12
                                            }
                                            onClick={() =>
                                                updateStage(
                                                    stage.key,
                                                    (current) => ({
                                                        ...current,
                                                        meals: [
                                                            ...current.meals,
                                                            newMeal(
                                                                freshMealTime(
                                                                    current.meals
                                                                )
                                                            ),
                                                        ],
                                                    })
                                                )
                                            }
                                        />
                                        <ActionButton
                                            label="Sao chép giai đoạn"
                                            icon={<CopyOutlined />}
                                            disabled={
                                                saving || stages.length >= 120
                                            }
                                            onClick={() => copyStage(stage)}
                                        />
                                        <ActionButton
                                            label="Xóa giai đoạn"
                                            icon={<DeleteOutlined />}
                                            danger
                                            onClick={() =>
                                                setStages((current) =>
                                                    current.filter(
                                                        (item) =>
                                                            item.key !==
                                                            stage.key
                                                    )
                                                )
                                            }
                                        />
                                        <Tooltip
                                            title={
                                                expandedStageKeys.includes(
                                                    stage.key
                                                )
                                                    ? 'Thu gọn giai đoạn'
                                                    : 'Mở giai đoạn'
                                            }
                                        >
                                            <Button
                                                size="small"
                                                aria-label={`${expandedStageKeys.includes(stage.key) ? 'Thu gọn' : 'Mở'} giai đoạn ${index + 1}`}
                                                aria-expanded={expandedStageKeys.includes(
                                                    stage.key
                                                )}
                                                className="ml-3! border-[#c7dcef]! bg-white! text-[#1d7ad6]!"
                                                icon={
                                                    expandedStageKeys.includes(
                                                        stage.key
                                                    ) ? (
                                                        <UpOutlined />
                                                    ) : (
                                                        <DownOutlined />
                                                    )
                                                }
                                                onClick={() =>
                                                    setExpandedStageKeys(
                                                        (current) =>
                                                            current.includes(
                                                                stage.key
                                                            )
                                                                ? current.filter(
                                                                      (id) =>
                                                                          id !==
                                                                          stage.key
                                                                  )
                                                                : [
                                                                      ...current,
                                                                      stage.key,
                                                                  ]
                                                    )
                                                }
                                            />
                                        </Tooltip>
                                    </Flex>
                                </Flex>
                                {getStageDocError(stages, index) && (
                                    <Text
                                        role="alert"
                                        className="block! px-4! py-2! text-xs! text-[#ff4d4f]!"
                                    >
                                        {getStageDocError(stages, index)}
                                    </Text>
                                )}
                                {expandedStageKeys.includes(stage.key) && (
                                    <>
                                        {stage.meals.map((meal, mealIndex) => (
                                            <Flex
                                                key={meal.key}
                                                gap={12}
                                                className="min-h-18.5! min-w-0! max-w-full! border-b! border-[#eef1f7]! px-4! py-3! max-sm:flex-col!"
                                            >
                                                <Flex
                                                    vertical
                                                    gap={4}
                                                    className="w-32! shrink-0!"
                                                >
                                                    <Text className="text-xs! font-semibold!">
                                                        {'Cữ'} {mealIndex + 1}
                                                    </Text>
                                                    <TimePicker
                                                        placeholder="Chọn giờ"
                                                        size="small"
                                                        format="HH:mm"
                                                        value={clockValue(
                                                            meal.time
                                                        )}
                                                        allowClear={false}
                                                        aria-label={`Giờ cữ ${mealIndex + 1} giai đoạn ${index + 1}`}
                                                        className="w-26!"
                                                        onChange={(_, time) =>
                                                            updateStage(
                                                                stage.key,
                                                                (current) => ({
                                                                    ...current,
                                                                    meals: current.meals.map(
                                                                        (
                                                                            entry
                                                                        ) =>
                                                                            entry.key ===
                                                                            meal.key
                                                                                ? {
                                                                                      ...entry,
                                                                                      time,
                                                                                  }
                                                                                : entry
                                                                    ),
                                                                })
                                                            )
                                                        }
                                                    />
                                                </Flex>
                                                <Flex
                                                    vertical
                                                    gap={6}
                                                    className="min-w-0! flex-1!"
                                                >
                                                    {meal.items.map((item) =>
                                                        renderMaterial(
                                                            stage,
                                                            item,
                                                            meal.key
                                                        )
                                                    )}
                                                    <Button
                                                        type="link"
                                                        icon={<PlusOutlined />}
                                                        disabled={
                                                            saving ||
                                                            meal.items.length >=
                                                                10
                                                        }
                                                        className="h-7! w-fit! px-0! text-xs! font-semibold!"
                                                        onClick={() =>
                                                            openPicker({
                                                                stageKey:
                                                                    stage.key,
                                                                mealKey:
                                                                    meal.key,
                                                            })
                                                        }
                                                    >
                                                        {meal.items.length
                                                            ? 'Trộn thêm thuốc / bổ sung'
                                                            : 'Thêm thức ăn / thuốc'}
                                                    </Button>
                                                </Flex>
                                                <Flex
                                                    gap={2}
                                                    align="center"
                                                    className="h-13.5! shrink-0!"
                                                >
                                                    <ActionButton
                                                        label="Sao chép cữ"
                                                        icon={<CopyOutlined />}
                                                        disabled={
                                                            saving ||
                                                            stage.meals
                                                                .length >= 12
                                                        }
                                                        onClick={() =>
                                                            updateStage(
                                                                stage.key,
                                                                (current) => ({
                                                                    ...current,
                                                                    meals: [
                                                                        ...current.meals,
                                                                        {
                                                                            ...structuredClone(
                                                                                meal
                                                                            ),
                                                                            key: key(),
                                                                            time: freshMealTime(
                                                                                current.meals
                                                                            ),
                                                                            items: meal.items.map(
                                                                                (
                                                                                    item
                                                                                ) => ({
                                                                                    ...structuredClone(
                                                                                        item
                                                                                    ),
                                                                                    key: key(),
                                                                                })
                                                                            ),
                                                                        },
                                                                    ],
                                                                })
                                                            )
                                                        }
                                                    />
                                                    <ActionButton
                                                        label="Xóa cữ"
                                                        icon={
                                                            <DeleteOutlined />
                                                        }
                                                        danger
                                                        onClick={() =>
                                                            updateStage(
                                                                stage.key,
                                                                (current) => ({
                                                                    ...current,
                                                                    meals: current.meals.filter(
                                                                        (
                                                                            entry
                                                                        ) =>
                                                                            entry.key !==
                                                                            meal.key
                                                                    ),
                                                                })
                                                            )
                                                        }
                                                    />
                                                </Flex>
                                            </Flex>
                                        ))}
                                        <Flex
                                            vertical
                                            gap={8}
                                            className="bg-[#f3fafa]! px-4! py-3!"
                                        >
                                            <Flex
                                                justify="space-between"
                                                align="center"
                                            >
                                                <Text className="text-[11px]! font-semibold! uppercase! tracking-wide! text-[#0f9b8e]!">
                                                    {
                                                        'Xử lý môi trường · không theo cữ'
                                                    }
                                                </Text>
                                                <Button
                                                    type="link"
                                                    icon={<PlusOutlined />}
                                                    className="h-7! px-0! text-xs! text-[#0f9b8e]!"
                                                    disabled={
                                                        saving ||
                                                        stage.environment
                                                            .length >= 20
                                                    }
                                                    onClick={() =>
                                                        openPicker({
                                                            stageKey: stage.key,
                                                        })
                                                    }
                                                >
                                                    {'Thêm'}
                                                </Button>
                                            </Flex>
                                            {stage.environment.length ? (
                                                stage.environment.map((item) =>
                                                    renderMaterial(stage, item)
                                                )
                                            ) : (
                                                <Text className={muted}>
                                                    {
                                                        'Vôi, khoáng tạt, vi sinh, sát trùng nước…'
                                                    }
                                                </Text>
                                            )}
                                        </Flex>
                                    </>
                                )}
                            </Card>
                        ))}
                        <Button
                            icon={<PlusOutlined />}
                            onClick={addStage}
                            loading={addingStage}
                            disabled={
                                saving ||
                                addingStage ||
                                !authoringReady ||
                                stages.length >= 120
                            }
                            className="h-11! w-full! border-[#eef1f7]! text-[13px]!"
                        >
                            {'Thêm giai đoạn'}
                        </Button>
                        {stages.length > 0 && (
                            <Text className={muted}>
                                {
                                    'Mỗi liều là lượng cho một cữ/lần xử lý. DOC 1–29 chỉ dùng liều cố định cho thức ăn/thuốc; hệ thống chỉ tính liều sinh khối từ DOC 30 khi có dữ liệu hợp lệ.'
                                }
                            </Text>
                        )}
                    </Flex>
                </Form>
            )}
            {picker && selectedFarm && (
                <ExpertProtocolMaterialPicker
                    proposedMaterials={templateProposals(stages)}
                    manufacturers={options.manufacturers ?? []}
                    farm={selectedFarm}
                    environment={!picker.mealKey}
                    onSelect={selectMaterial}
                    onClose={() => setPicker(null)}
                />
            )}
            {quickBuilderOpen && (
                <ExpertProtocolQuickBuilder
                    proposedMaterials={templateProposals(stages)}
                    farm={selectedFarm}
                    manufacturers={options.manufacturers ?? []}
                    shrimpType={form.getFieldValue('shrimpType')}
                    referencePostCount={form.getFieldValue(
                        'referencePostCount'
                    )}
                    onClose={() => setQuickBuilderOpen(false)}
                    onApply={(preview) => {
                        const apply = () => {
                            const nextStages = preview.stages;
                            form.setFieldsValue({
                                shrimpType: preview.shrimpType,
                                referencePostCount: preview.referencePostCount,
                            });
                            setStages(nextStages);
                            setExpandedStageKeys(
                                nextStages.length ? [nextStages[0].key] : []
                            );
                            setQuickBuilderOpen(false);
                            setSaveError(null);
                        };
                        if (stages.length)
                            modal.confirm({
                                title: 'Thay lịch đang soạn bằng bản nháp mới?',
                                content:
                                    'Toàn bộ cữ, vật tư và liều đang soạn sẽ được thay thế. Dữ liệu chỉ được lưu khi bạn bấm Lưu mẫu.',
                                okText: 'Thay lịch',
                                cancelText: 'Giữ lịch hiện tại',
                                onOk: apply,
                            });
                        else apply();
                    }}
                />
            )}
            <Modal
                open={Boolean(instructionTarget)}
                title="Hướng dẫn sử dụng vật tư"
                centered
                onCancel={() => setInstructionTarget(null)}
                onOk={() => {
                    if (
                        !instructionTarget.mealKey &&
                        (!Number.isInteger(firstDayDraft) ||
                            firstDayDraft < instructionItem.startDay ||
                            firstDayDraft > instructionItem.endDay ||
                            !Number.isInteger(lastDayDraft) ||
                            lastDayDraft < firstDayDraft ||
                            lastDayDraft > instructionItem.endDay)
                    ) {
                        message.error(
                            'DOC bắt đầu và kết thúc xử lý phải hợp lệ, nằm trong giai đoạn.'
                        );
                        return;
                    }
                    if (!instructionTarget.mealKey) {
                        const item = instructionItem.environment.find(
                            (entry) => entry.key === instructionTarget.itemKey
                        );
                        const error = getEnvironmentRepeatError(
                            {
                                ...item,
                                firstDay: firstDayDraft,
                                lastDay: lastDayDraft,
                            },
                            instructionItem
                        );
                        if (error) {
                            message.error(error);
                            return;
                        }
                    }
                    if (
                        instructionTarget.mealKey &&
                        !applicationDaysDraft.length
                    ) {
                        message.error('Chọn ít nhất một ngày áp dụng.');
                        return;
                    }
                    updateItem(instructionTarget, {
                        ...(instructionTarget.mealKey
                            ? { applicationDays: applicationDaysDraft }
                            : {}),
                        instructions: instructionDraft,
                        ...(!instructionTarget.mealKey
                            ? { firstDay: firstDayDraft, lastDay: lastDayDraft }
                            : {}),
                    });
                    setInstructionTarget(null);
                }}
                okText="Lưu hướng dẫn"
                cancelText="Hủy"
            >
                {productForInstructions?.recommendationReason && (
                    <Alert
                        type="info"
                        message={`Lý do đề xuất: ${productForInstructions.recommendationReason}`}
                        className="mb-3!"
                    />
                )}
                <Input.TextArea
                    rows={4}
                    maxLength={500}
                    showCount
                    value={instructionDraft}
                    onChange={(event) =>
                        setInstructionDraft(event.target.value)
                    }
                    aria-label="Hướng dẫn vật tư"
                />
                {instructionTarget?.mealKey && instructionItem && (
                    <Form.Item
                        label="Ngày áp dụng trong giai đoạn"
                        className="mt-4! mb-0!"
                    >
                        <Flex gap={8} className="mb-2!">
                            <Button
                                size="small"
                                onClick={() =>
                                    setApplicationDaysDraft(
                                        Array.from(
                                            {
                                                length:
                                                    instructionItem.endDay -
                                                    instructionItem.startDay +
                                                    1,
                                            },
                                            (_, index) =>
                                                instructionItem.startDay + index
                                        )
                                    )
                                }
                            >
                                Mỗi ngày
                            </Button>
                            <Button
                                size="small"
                                onClick={() => setApplicationDaysDraft([])}
                            >
                                Bỏ chọn
                            </Button>
                        </Flex>
                        <Select
                            mode="multiple"
                            className="w-full!"
                            maxTagCount="responsive"
                            value={applicationDaysDraft}
                            onChange={(days) =>
                                setApplicationDaysDraft(
                                    [...days].sort((a, b) => a - b)
                                )
                            }
                            options={Array.from(
                                {
                                    length:
                                        instructionItem.endDay -
                                        instructionItem.startDay +
                                        1,
                                },
                                (_, index) => ({
                                    value: instructionItem.startDay + index,
                                    label: `DOC ${instructionItem.startDay + index}`,
                                })
                            )}
                        />
                    </Form.Item>
                )}
                {instructionTarget && !instructionTarget.mealKey && (
                    <Flex gap={8} align="center" wrap className="mt-4!">
                        <Text className={muted}>{'DOC bắt đầu chu kỳ'}</Text>
                        <InputNumber
                            min={instructionItem?.startDay}
                            max={instructionItem?.endDay}
                            changeOnBlur={false}
                            value={firstDayDraft}
                            onChange={setFirstDayDraft}
                            aria-label="DOC bắt đầu chu kỳ môi trường"
                        />
                        <Text className={muted}>DOC kết thúc</Text>
                        <InputNumber
                            min={firstDayDraft ?? instructionItem?.startDay}
                            max={instructionItem?.endDay}
                            value={lastDayDraft}
                            onChange={setLastDayDraft}
                            aria-label="DOC kết thúc xử lý môi trường"
                        />
                    </Flex>
                )}
            </Modal>
        </Drawer>
    );
};

export default ExpertProtocolTemplateEditor;
