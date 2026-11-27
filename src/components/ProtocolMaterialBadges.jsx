import { Tag } from 'antd';
import { formatProtocolNumber, formatTemplateDose } from '../utils/protocolTemplateUtils';

const ProtocolMaterialBadges = ({ item, firstDay, lastDay, days, dayLabel = 'DOC' }) => {
    const increment = item.dailyDoseIncrement;
    const showDates = days?.length && item.repeatIntervalDays !== 1;
    const dates = showDates
        ? `${days.slice(0, 8).map(formatProtocolNumber).join(', ')}${days.length > 8 ? '…' : ''}`
        : firstDay == null ? null : `${formatProtocolNumber(firstDay)}${lastDay != null && lastDay !== firstDay
            ? `–${formatProtocolNumber(lastDay)}` : ''}`;
    const badgeClass = 'm-0! rounded-md! border-0! text-xs!';
    return (
        <>
            <Tag color="blue" className={badgeClass}>{formatTemplateDose(item)}</Tag>
            {increment > 0 && (
                <Tag color="green" className={badgeClass}>
                    +{formatTemplateDose({ ...item, doseValue: increment })}/cữ/ngày
                </Tag>
            )}
            {dates && <Tag color="cyan" className={badgeClass}>{dayLabel} {dates}</Tag>}
            {!showDates && firstDay !== lastDay && item.repeatIntervalDays > 1 && (
                <Tag color="purple" className={badgeClass}>
                    Mỗi {formatProtocolNumber(item.repeatIntervalDays)} ngày
                </Tag>
            )}
        </>
    );
};

export default ProtocolMaterialBadges;
