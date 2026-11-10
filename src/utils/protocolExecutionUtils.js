export const vietnamDate = value => value
    ? new Date(new Date(value).getTime() + 7 * 3600000).toISOString().slice(0, 10) : null;

export const treatmentDay = (scheduledAt, startAt) => startAt
    ? Math.round((Date.parse(vietnamDate(scheduledAt)) - Date.parse(vietnamDate(startAt))) / 86400000) + 1 : null;

/** Filter an already-authorized detail snapshot; this module has no network dependency. */
export const filterExecutionRows = (rows, { search = '', kind = 'ALL', meal = 'ALL', startDate, endDate } = {}) => {
    const term = search.trim().toLocaleLowerCase('vi');
    return rows.filter(row => {
        const day = vietnamDate(row.scheduledAt);
        if (startDate && day < startDate || endDate && day > endDate) return false;
        if (meal !== 'ALL' && (row.mealNumber == null ? 'ENVIRONMENT' : String(row.mealNumber)) !== meal) return false;
        if (term && ![row.plannedProduct?.name, row.actualProduct?.name, row.executor?.fullName,
            row.varianceReason, row.note].some(value => value?.toLocaleLowerCase('vi').includes(term))) return false;
        if (kind === 'QUANTITY') return row.quantityComparison?.deviated === true;
        if (kind === 'THRESHOLD') return row.quantityComparison?.exceedsThreshold === true;
        if (kind === 'TIMING') return ['EARLY', 'LATE'].includes(row.timing?.status);
        if (kind === 'UNEXECUTED') return row.status === 'PLANNED' && !row.executedAt;
        if (kind === 'CANCELLED') return row.status === 'CANCELLED';
        return true;
    });
};
