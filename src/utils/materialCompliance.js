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

export const templateProposals = (stages) =>
    uniqueTemplateProposals(
        stages.flatMap((stage) => [
            ...(stage.meals ?? []).flatMap((meal) =>
                meal.items.map((item) => item.product)
            ),
            ...(stage.environment ?? []).map((item) => item.product),
        ])
    );

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
    { environment = false, feedOnly = false } = {}
) => {
    if (product.unavailable)
        return 'Vật tư không còn khả dụng. Anh/chị vui lòng chọn lại.';
    if (['BANNED', 'TREATMENT_ONLY'].includes(product.safety?.status))
        return (
            product.safety.reason ||
            'Vật tư này không được dùng trong phác đồ mẫu.'
        );
    if (product.productCompliance?.containsAntibiotic === true)
        return 'Vật tư chứa kháng sinh cần phác đồ điều trị riêng; anh/chị chọn vật tư khác cho phác đồ mẫu.';
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
