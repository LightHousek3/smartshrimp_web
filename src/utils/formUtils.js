/**
 * Check if form has changed compared to original data
 * @param {Object} originalData - Original data
 * @param {Object} currentData - Current form data
 * @param {Array<string>} excludeFields - Fields to exclude from comparison
 * @returns {boolean} - true if changed, false if not changed
 */
export const hasFormChanged = (originalData, currentData, excludeFields = []) => {
    if (!originalData || !currentData) return true;

    // Get all keys from currentData
    const keys = Object.keys(currentData).filter((key) => !excludeFields.includes(key));

    // Compare each field
    for (const key of keys) {
        const originalValue = originalData[key];
        const currentValue = currentData[key];

        // Handle special cases
        if (originalValue === undefined && currentValue === undefined) continue;
        if (originalValue === null && currentValue === null) continue;
        if (originalValue === '' && currentValue === '') continue;

        // Compare arrays
        if (Array.isArray(originalValue) && Array.isArray(currentValue)) {
            if (originalValue.length !== currentValue.length) return true;

            // Compare array of objects (e.g., genres)
            if (originalValue.length > 0 && typeof originalValue[0] === 'object') {
                const originalIds = originalValue.map((item) => item.id || item).sort();
                const currentIds = currentValue.map((item) => item.id || item).sort();
                if (JSON.stringify(originalIds) !== JSON.stringify(currentIds)) return true;
            } else {
                // Compare regular arrays
                const sortedOriginal = [...originalValue].sort();
                const sortedCurrent = [...currentValue].sort();
                if (JSON.stringify(sortedOriginal) !== JSON.stringify(sortedCurrent)) return true;
            }
            continue;
        }

        // Compare objects
        if (typeof originalValue === 'object' && typeof currentValue === 'object') {
            if (JSON.stringify(originalValue) !== JSON.stringify(currentValue)) return true;
            continue;
        }

        // Compare regular values
        if (originalValue != currentValue) return true;
    }

    return false;
};

/**
 * Check if new file has been uploaded
 * @param {Array} fileList - File list from Upload component
 * @param {string} originalUrl - Original image URL
 * @returns {boolean} - true if new file exists
 */
export const hasNewFile = (fileList, originalUrl) => {
    if (!fileList || fileList.length === 0) {
        return false;
    }

    const file = fileList[0];

    if (file.originFileObj) {
        return true;
    }

    if (file.url && file.url !== originalUrl) {
        return true;
    }

    return false;
};
