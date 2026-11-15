import { ClockCircleOutlined, ExclamationCircleFilled } from '@ant-design/icons';
import { HealthTag, Panel } from '../pages/expert/expertUI';
import { waterWarning } from '../utils/diseaseCaseUtils';
import { metricDate } from '../utils/seasonMetrics';

/** Compare observations using the same species policy supplied by the backend. */
export default function ExpertCaseSnapshot({ c, current }) {
    const s = c.caseSnapshot || {};
    const health = s.shrimpHealth || s.health || {};
    const water = s.waterIndicators || s.water || {};

    const rows = [
        {
            k: 'dissolvedOxygenMgL',
            fallbackK: 'dissolved_oxygen_mg_l',
            label: 'DO',
            unit: 'mg/L',
        },
        {
            k: 'ph',
            fallbackK: 'ph',
            label: 'pH',
            unit: '',
        },
        {
            k: 'temperatureC',
            fallbackK: 'temperature_c',
            label: 'Nhiệt độ',
            unit: '°C',
        },
        {
            k: 'nh3MgL',
            fallbackK: 'nh3_mg_l',
            label: 'NH₃',
            unit: 'mg/L',
        },
        {
            k: 'no2MgL',
            fallbackK: 'no2_mg_l',
            label: 'NO₂',
            unit: 'mg/L',
        },
        {
            k: 'alkalinityMgLCaCO3',
            fallbackK: 'alkalinity_mg_l',
            label: 'Kiềm',
            unit: 'mg/L',
        },
        {
            k: 'salinityPpt',
            fallbackK: 'salinity_ppt',
            label: 'Độ mặn',
            unit: '‰',
        },
        { k: 'h2sMgL', fallbackK: 'h2s_mg_l', label: 'H₂S', unit: 'mg/L' },
    ];

    const healthStatus = health.healthStatus || health.health_status || null;
    const avgWeight = health.avgWeightG ?? health.avg_weight_g ?? null;
    const biomass = health.estimatedBiomassKg ?? health.estimated_biomass_kg ?? null;
    const mortality = health.mortality7d ?? health.mortality_7d ?? null;

    const healthMetricsParts = [
        avgWeight != null ? `${avgWeight} g` : null,
        biomass != null ? `${biomass} kg` : null,
        mortality != null ? `chết 7d ${mortality}` : null,
    ].filter(Boolean);

    return (
        <Panel title="Ảnh chụp dữ liệu khi báo ca">
            <div className="flex items-center justify-between mb-2.5">
                {healthStatus ? (
                    <HealthTag s={healthStatus} />
                ) : (
                    <span className="text-[12px] text-[#8796ae]">Chưa có đánh giá sức khỏe</span>
                )}
                <span className="text-[12px] text-[#6a7994] font-mono">
                    {healthMetricsParts.length > 0 ? healthMetricsParts.join(' · ') : 'Chưa có số liệu tôm'}
                </span>
            </div>
            <table className="w-full text-[12px]">
                <thead>
                    <tr className="text-[#6a7994] text-left">
                        <th className="font-medium pb-1.5">Chỉ số</th>
                        <th className="font-medium pb-1.5 text-right">Khi báo</th>
                        {current && <th className="font-medium pb-1.5 text-right">Hiện tại</th>}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r) => {
                        const aVal = water[r.k] ?? water[r.fallbackK];
                        const hasA = aVal != null && aVal !== '';
                        const aBad = waterWarning(aVal, c.waterThresholds?.[r.k]);

                        const bVal = current ? (current[r.k] ?? current[r.fallbackK]) : undefined;
                        const hasB = bVal != null && bVal !== '';
                        const bBad = waterWarning(bVal, c.waterThresholds?.[r.k]);

                        return (
                            <tr key={r.label} className="border-t border-[#eef1f7]">
                                <td className="py-1.5 text-[#3a4a63]">{r.label}</td>
                                <td className={`py-1.5 text-right font-mono ${aBad ? 'text-[#d43b57] font-semibold' : ''}`}>
                                    {aBad && <ExclamationCircleFilled className="mr-1 text-[10px]" />}
                                    {hasA ? `${aVal} ${r.unit}`.trim() : '—'}
                                </td>
                                {current && (
                                    <td className={`py-1.5 text-right font-mono ${hasB ? (bBad === true ? 'text-[#d43b57] font-semibold' : bBad === false ? 'text-[#0f9b8e]' : '') : ''}`}>
                                        {hasB ? bVal : '—'}
                                    </td>
                                )}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            {current && (
                <div className="text-[11px] text-[#6a7994] mt-2">
                    <ClockCircleOutlined /> Hiện tại: đo {metricDate(current.recordedAt || current.recorded_at, true)}
                </div>
            )}
        </Panel>
    );
}
