/** Presentation metadata only; water limits and exceeded flags always come from BE policy. */
export const SHRIMP_TYPE_LABELS = { WHITELEG: 'Tôm thẻ chân trắng', BLACK_TIGER: 'Tôm sú' };
export const SEASON_TONES = { ACTIVE: 'ocean', PLANNING: 'violet', COMPLETED: 'teal', CANCELLED: 'slate' };
export const HEALTH_LABELS = { EXCELLENT: 'Rất tốt', GOOD: 'Tốt', WARNING: 'Cảnh báo', CRITICAL: 'Nguy hiểm' };
export const HEALTH_TONES = { EXCELLENT: 'teal', GOOD: 'teal', WARNING: 'amber', CRITICAL: 'rose' };
export const WATER_METRICS = [
    { field: 'temperatureC', label: 'Nhiệt độ', unit: '°C' },
    { field: 'ph', label: 'pH', unit: '' },
    { field: 'dissolvedOxygenMgL', label: 'Oxy hòa tan', unit: 'mg/L' },
    { field: 'salinityPpt', label: 'Độ mặn', unit: '‰' },
    { field: 'alkalinityMgLCaCO3', label: 'Độ kiềm', unit: 'mg/L' },
    { field: 'nh3MgL', label: 'NH₃', unit: 'mg/L' },
    { field: 'no2MgL', label: 'NO₂', unit: 'mg/L' },
    { field: 'h2sMgL', label: 'H₂S', unit: 'mg/L' },
];
