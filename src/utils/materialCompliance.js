/** Submit editable professional content only, excluding server-issued review stamps. */
export const editableCompliance = (value = {}) =>
    Object.fromEntries(
        [
            'regulatoryType',
            'registrationNumber',
            'ingredientsText',
            'containsAntibiotic',
            'usageInstructions',
            'withdrawalDays',
            'evidenceUrls',
        ]
            .filter((field) => value?.[field] !== undefined)
            .map((field) => [field, value[field]])
    );

const receiptPrefixes = { feed: '01-', environment: '02-', dual_purpose: '03-' };

/** Choose receipt guidance by regulatory type without inventing a format for medicine labels. */
export const registrationFormat = (type) => {
    const prefix = receiptPrefixes[type];
    if (prefix) return {
        placeholder: `${prefix}123456`,
        hint: `Dạng ${prefix}XXXXXX: 6 chữ số từ 000001 đến 999999, ví dụ ${prefix}123456. Nhập đúng mã trên nhãn/hồ sơ sản phẩm.`,
    };
    if (type === 'medicine') return {
        placeholder: 'Nhập nguyên số ĐKLH trên nhãn thuốc',
        hint: 'Nhập nguyên số đăng ký lưu hành thuốc thú y trên nhãn/hồ sơ, tối đa 100 ký tự; không dùng mã tiếp nhận 01-/02-/03- của thức ăn hoặc sản phẩm môi trường.',
    };
    return { placeholder: 'Chọn phân loại pháp lý trước', hint: 'Chọn phân loại pháp lý để xem định dạng mã phù hợp. Không suy mã chỉ từ nhóm vật tư.' };
};

/** Validate nonempty registration values; required-field errors remain owned by the form. */
export const registrationNumberError = (type, value) => {
    const registration = typeof value === 'string' ? value.trim() : '';
    if (!registration) return null;
    const prefix = receiptPrefixes[type];
    if (registration.length > 100) return 'Mã tiếp nhận/số ĐKLH tối đa 100 ký tự.';
    if (prefix && (!new RegExp(`^${prefix}[0-9]{6}$`).test(registration) || registration.endsWith('-000000'))
        || type === 'medicine' && /^(01|02|03)-/.test(registration)) return registrationFormat(type).hint;
    return null;
};

/** Required proposal evidence; reviewer identity and timestamps remain server-owned. */
export const proposalMissingFields = product => {
    const c = product.productCompliance || {};
    const missing = [];
    if (!product.recommendationReason?.trim()) missing.push('lý do đề xuất');
    if (!product.manufacturerId && !product.manufacturer?.name?.trim()) missing.push('nhà sản xuất');
    if (!['feed', 'environment', 'dual_purpose', 'medicine'].includes(c.regulatoryType)) missing.push('phân loại pháp lý');
    for (const [field, label] of [['registrationNumber', 'số đăng ký'], ['ingredientsText', 'thành phần'], ['usageInstructions', 'hướng dẫn theo nhãn']]) {
        if (!c[field]?.trim()) missing.push(label);
    }
    if (typeof c.containsAntibiotic !== 'boolean') missing.push('xác định kháng sinh');
    if (!Array.isArray(product.imageUrls) || product.imageUrls.length < 1 || product.imageUrls.length > 3
        || product.imageUrls.some(url => { try { return new URL(url).protocol !== 'https:'; } catch { return true; } }))
        missing.push('1–3 ảnh nhãn HTTPS');
    const registrationIssue = registrationNumberError(c.regulatoryType, c.registrationNumber);
    if (registrationIssue) missing.push(registrationIssue);
    if (c.containsAntibiotic === true && c.regulatoryType !== 'medicine') missing.push('phân loại thuốc cho vật tư có kháng sinh');
    if (c.regulatoryType === 'medicine' && (c.withdrawalDays == null || !Number.isFinite(Number(c.withdrawalDays)) || Number(c.withdrawalDays) < 0)) missing.push('thời gian ngừng thuốc');
    return missing;
};

const canonical = (value) => {
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === 'object')
        return Object.fromEntries(
            Object.keys(value)
                .sort()
                .map((key) => [key, canonical(value[key])])
        );
    return value;
};

/** Reuse only unsaved proposal content from this template, without catalog identity or stale safety verdicts. */
export const uniqueTemplateProposals = (products) => {
    const proposals = new Map();
    for (const product of products) {
        if (!product || product.id || product.unavailable) continue;
        const snapshot = Object.fromEntries(
            [
                'name',
                'description',
                'category',
                'unit',
                'conversionQuantity',
                'conversionUnit',
                'imageUrls',
                'recommendationReason',
                'manufacturerId',
                'manufacturer',
            ]
                .filter((field) => product[field] !== undefined)
                .map((field) => [field, structuredClone(product[field])])
        );
        snapshot.productCompliance = structuredClone(
            editableCompliance(product.productCompliance)
        );
        // Existing manufacturer IDs are authoritative; avoid treating contact snapshots as a new identity.
        if (snapshot.manufacturerId) delete snapshot.manufacturer;
        proposals.set(JSON.stringify(canonical(snapshot)), snapshot);
    }
    return [...proposals.values()];
};

/** Collect reusable proposals from both oral meals and environmental applications. */
export const templateProposals = (stages) =>
    uniqueTemplateProposals(
        stages.flatMap((stage) => [
            ...(stage.meals ?? []).flatMap((meal) =>
                meal.items.map((item) => item.product)
            ),
            ...(stage.environment ?? []).map((item) => item.product),
        ])
    );

/**
 * Keep oral and environmental material groups separate while allowing explicit feed-only
 * selection.
 */
export const materialCategoryFits = (
    category,
    environment,
    feedOnly = false
) =>
    feedOnly
        ? category === 'FEED'
        : environment
          ? ['MINERAL', 'CHEMICAL', 'MEDICINE', 'OTHER'].includes(category)
          : ['FEED', 'MEDICINE', 'MINERAL', 'OTHER'].includes(category);

/** Provide route guidance locally; the backend still performs the authoritative safety check. */
export const templateMaterialSelectionError = (
    product,
    { environment = false, feedOnly = false, protocolLabel = 'phác đồ mẫu', production = true } = {}
) => {
    if (product.unavailable || product.id && product.status && product.status !== 'ACTIVE')
        return 'Vật tư không còn khả dụng. Anh/chị vui lòng chọn lại.';
    if (product.needsReview)
        return 'Vật tư đã thay đổi. Vui lòng xem lại và chọn lại vật tư trước khi lưu hoặc gửi duyệt.';
    if (product.safety?.status === 'BANNED' || production && product.safety?.status === 'TREATMENT_ONLY')
        return (
            product.safety.reason ||
            `Vật tư này không được dùng trong ${protocolLabel}.`
        );
    if (production && product.productCompliance?.containsAntibiotic === true)
        return `Vật tư chứa kháng sinh cần phác đồ điều trị riêng; anh/chị chọn vật tư khác cho ${protocolLabel}.`;
    if (!materialCategoryFits(product.category, environment, feedOnly))
        return 'Nhóm vật tư chưa phù hợp với hoạt động đang chọn.';
    if (
        (environment && product.productCompliance?.regulatoryType === 'feed') ||
        (!environment &&
            product.productCompliance?.regulatoryType === 'environment')
    )
        return 'Hồ sơ vật tư không phù hợp đường dùng này. Anh/chị chọn đúng cữ ăn hoặc xử lý môi trường theo nhãn.';
    return null;
};
