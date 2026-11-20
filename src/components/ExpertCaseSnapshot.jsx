import { ClockCircleOutlined, ExclamationCircleFilled } from '@ant-design/icons';
import { Tooltip } from 'antd';
import { HealthTag, Panel } from '../pages/expert/expertUI';
import { waterWarning } from '../utils/diseaseCaseUtils';
import { metricDate, waterRange } from '../utils/seasonMetrics';

/** Helper to extract metric value across diverse property conventions */
const extractVal = (source, keys) => {
    if (!source || typeof source !== 'object') return undefined;
    for (const k of keys) {
        if (source[k] !== undefined && source[k] !== null && source[k] !== '') {
            return source[k];
        }
    }
    return undefined;
};

/** Compare water observations and shrimp health at case opening vs current */
export default function ExpertCaseSnapshot({ c, current }) {
    const s = c.caseSnapshot || {};
    const health = s.shrimpHealth || s.health || s;
    const snapshotWater = s.waterIndicators || s.waterQuality || s.water || s.waterLog || {};

    const rows = [
        {
            keys: ['temperatureC', 'temperature_c', 'temperature', 'temp'],
            thresholdKey: 'temperatureC',
            label: 'Nhiệt độ',
            unit: '°C',
        },
        {
            keys: ['ph', 'pH'],
            thresholdKey: 'ph',
            label: 'pH',
            unit: '',
        },
        {
            keys: ['dissolvedOxygenMgL', 'dissolved_oxygen_mg_l', 'doMgL', 'do_mg_l', 'do'],
            thresholdKey: 'dissolvedOxygenMgL',
            label: 'DO',
            unit: 'mg/L',
        },
        {
            keys: ['salinityPpt', 'salinity_ppt', 'salinity'],
            thresholdKey: 'salinityPpt',
            label: 'Độ mặn',
            unit: '‰',
        },
        {
            keys: ['nh3MgL', 'nh3_mg_l', 'nh3'],
            thresholdKey: 'nh3MgL',
            label: 'NH₃',
            unit: 'mg/L',
        },
        {
            keys: ['no2MgL', 'no2_mg_l', 'no2'],
            thresholdKey: 'no2MgL',
            label: 'NO₂',
            unit: 'mg/L',
        },
        {
            keys: [
                'alkalinityMgLCaCO3',
                'alkalinity_mg_l_caco3',
                'alkalinityMgL',
                'alkalinity_mg_l',
                'alkalinity',
            ],
            thresholdKey: 'alkalinityMgLCaCO3',
            label: 'Kiềm',
            unit: 'mg/L',
        },
        {
            keys: ['h2sMgL', 'h2s_mg_l', 'h2s'],
            thresholdKey: 'h2sMgL',
            label: 'H₂S',
            unit: 'mg/L',
        },
    ];

    const snapshotTime = s.waterRecordedAt || s.capturedAt || c.createdAt;
    const reportedWaterTime = snapshotTime ? metricDate(snapshotTime, true) : null;
    const currentWaterTime =
        current?.recordedAt || current?.recorded_at
            ? metricDate(current.recordedAt || current.recorded_at, true)
            : null;

    // A measurement in "current" is truly newer only if it has a different ID or a timestamp after case opening
    const isNewerWaterLog = Boolean(
        current &&
            (!s.waterLogId || current.id !== s.waterLogId) &&
            (current.recordedAt || current.recorded_at) &&
            (!s.waterRecordedAt ||
                new Date(current.recordedAt || current.recorded_at).getTime() >
                    new Date(s.waterRecordedAt).getTime()),
    );

    const getReportedVal = (keys) => {
        const val =
            extractVal(snapshotWater, keys) ??
            extractVal(s, keys) ??
            extractVal(s.waterLog, keys);
        if (val !== undefined) return val;
        // If current water log is the same log referenced in snapshot, fill missing snapshot fields from it
        if (!isNewerWaterLog && current) {
            return extractVal(current, keys);
        }
        return undefined;
    };

    const getCurrentVal = (keys) => {
        return extractVal(current, keys);
    };

    // Shrimp health data
    const healthStatus = health.healthStatus || health.health_status || null;
    const avgWeight = health.avgWeightG ?? health.avg_weight_g ?? null;
    const biomass = health.estimatedBiomassKg ?? health.estimated_biomass_kg ?? null;
    const mortality =
        health.mortalityCount ??
        health.mortality_count ??
        health.mortality7d ??
        health.mortality_7d ??
        null;

    const healthParts = [
        avgWeight != null ? `Cỡ TB: ${avgWeight} g` : null,
        biomass != null ? `Sinh khối: ${Number(biomass).toLocaleString('vi-VN')} kg` : null,
        mortality != null ? `Hao hụt: ${mortality} con` : null,
    ].filter(Boolean);

    return (
        <Panel title="Đối chiếu chỉ số môi trường & Sức khỏe">
            {/* Shrimp health overview at case opening */}
            <div className="flex items-center justify-between mb-2.5 pb-2.5 border-b border-[#eef1f7]">
                {healthStatus ? (
                    <HealthTag s={healthStatus} />
                ) : (
                    <span className="text-[12px] text-[#8796ae]">Chưa có đánh giá sức khỏe</span>
                )}
                <span className="text-[12px] text-[#475569] font-medium font-mono">
                    {healthParts.length > 0 ? healthParts.join(' · ') : 'Chưa có số liệu tôm'}
                </span>
            </div>

            {/* Comparison table */}
            <table className="w-full text-[12px]">
                <thead>
                    <tr className="text-[#6a7994] border-b border-[#eef1f7]">
                        <th className="font-semibold pb-2 text-left">Chỉ số</th>
                        <th className="font-semibold pb-2 text-right">Khi báo ca</th>
                        <th className="font-semibold pb-2 text-right">Hiện tại</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r) => {
                        const aVal = getReportedVal(r.keys);
                        const hasA = aVal != null && aVal !== '';
                        const threshold = c.waterThresholds?.[r.thresholdKey];
                        const aBad = waterWarning(aVal, threshold);

                        const bVal = isNewerWaterLog ? getCurrentVal(r.keys) : undefined;
                        const hasB = bVal != null && bVal !== '';
                        const bBad = waterWarning(bVal, threshold);

                        const rangeStr = threshold ? waterRange(threshold) : null;
                        const unitLabel = r.unit ? ` ${r.unit}` : '';

                        return (
                            <tr
                                key={r.label}
                                className="border-t border-[#eef1f7] hover:bg-[#fcfdfd] transition-colors"
                            >
                                <td className="py-2 text-[#3a4a63]">
                                    <span className="font-medium text-[#1e293b]">{r.label}</span>
                                    {r.unit && (
                                        <span className="text-[11px] text-[#8796ae] ml-1">
                                            ({r.unit})
                                        </span>
                                    )}
                                </td>
                                <td className="py-2 text-right font-mono">
                                    {hasA ? (
                                        <Tooltip
                                            title={
                                                aBad
                                                    ? `Vượt ngưỡng an toàn (Chuẩn: ${rangeStr}${unitLabel})`
                                                    : `Bình thường (Chuẩn: ${rangeStr}${unitLabel})`
                                            }
                                        >
                                            <span
                                                className={`inline-flex items-center gap-1 ${
                                                    aBad
                                                        ? 'text-[#d43b57] font-semibold'
                                                        : 'text-[#0b7a70] font-medium'
                                                }`}
                                            >
                                                {aBad && (
                                                    <ExclamationCircleFilled className="text-[10px]" />
                                                )}
                                                {`${aVal} ${r.unit}`.trim()}
                                            </span>
                                        </Tooltip>
                                    ) : (
                                        <span className="text-[#8796ae]">—</span>
                                    )}
                                </td>
                                <td className="py-2 text-right font-mono">
                                    {hasB ? (
                                        <Tooltip
                                            title={
                                                bBad
                                                    ? `Vượt ngưỡng an toàn (Chuẩn: ${rangeStr}${unitLabel})`
                                                    : `Bình thường (Chuẩn: ${rangeStr}${unitLabel})`
                                            }
                                        >
                                            <span
                                                className={`inline-flex items-center gap-1 ${
                                                    bBad
                                                        ? 'text-[#d43b57] font-semibold'
                                                        : 'text-[#0b7a70] font-medium'
                                                }`}
                                            >
                                                {bBad && (
                                                    <ExclamationCircleFilled className="text-[10px]" />
                                                )}
                                                {`${bVal} ${r.unit}`.trim()}
                                            </span>
                                        </Tooltip>
                                    ) : (
                                        <Tooltip title={isNewerWaterLog ? 'Chưa đo chỉ số này' : 'Chưa có số đo mới kể từ lúc báo ca'}>
                                            <span className="text-[#8796ae] cursor-default">—</span>
                                        </Tooltip>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            {/* Clean, discreet timestamp footer */}
            <div className="mt-2.5 pt-2 border-t border-[#f1f5f9] flex items-center justify-between text-[11px] text-[#8796ae]">
                <span>
                    <ClockCircleOutlined className="mr-1" />
                    {reportedWaterTime ? `Đo lúc báo: ${reportedWaterTime}` : 'Chưa có số đo lúc báo'}
                </span>
                <span>
                    <ClockCircleOutlined className="mr-1" />
                    {isNewerWaterLog && currentWaterTime
                        ? `Hiện tại: ${currentWaterTime}`
                        : 'Hiện tại: Chưa có số đo mới'}
                </span>
            </div>
        </Panel>
    );
}
