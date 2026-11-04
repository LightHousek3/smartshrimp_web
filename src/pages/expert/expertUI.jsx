import { Button, Popconfirm, Tag, Tooltip } from 'antd';

// Shared tones matching Figma design tokens and ExpertSeasonList
const tone = {
    white: { bg: '#ffffff', fg: '#ffffff', dot: '#ffffff' },
    ocean: { bg: '#eaf4ff', fg: '#0f62b4', dot: '#1d7ad6' },
    teal: { bg: '#e2f6f3', fg: '#0b7a70', dot: '#0f9b8e' },
    amber: { bg: '#fbf0dc', fg: '#a1600c', dot: '#d98314' },
    rose: { bg: '#fce9ed', fg: '#bb334f', dot: '#d43b57' },
    violet: { bg: '#efeafc', fg: '#5b3fb8', dot: '#7b5bd6' },
    slate: { bg: '#eef1f6', fg: '#475569', dot: '#94a3b8' },
};

const dot = (color) => (
    <span
        className="inline-block size-1.5 rounded-full mr-1.5 align-middle shrink-0"
        style={{ background: color }}
    />
);

export function Pill({ t = 'slate', children, className = '' }) {
    const c = tone[t] || tone.slate;
    return (
        <Tag
            bordered={false}
            className={`m-0! inline-flex! min-h-5! w-fit! max-w-full! self-start! items-center! gap-1.5! rounded-full! border-0! px-2.5! py-px! text-[10px]! font-semibold! leading-4.5! whitespace-nowrap! ${className}`}
            style={{
                background: c.bg,
                color: c.fg,
                borderRadius: 9999,
                marginInlineEnd: 0,
            }}
        >
            {dot(c.dot)}
            {children}
        </Tag>
    );
}

const caseSeverityLabel = {
    critical: 'Nghiêm trọng',
    CRITICAL: 'Nghiêm trọng',
    high: 'Cao',
    HIGH: 'Cao',
    medium: 'Trung bình',
    MEDIUM: 'Trung bình',
    low: 'Thấp',
    LOW: 'Thấp',
};

const sevTone = {
    low: 'slate',
    LOW: 'slate',
    medium: 'amber',
    MEDIUM: 'amber',
    high: 'rose',
    HIGH: 'rose',
    critical: 'rose',
    CRITICAL: 'rose',
};

export function SeverityTag({ s }) {
    const norm = String(s || '').toLowerCase();
    if (norm === 'critical') {
        return (
            <Tag
                bordered={false}
                className="m-0! inline-flex! min-h-5! w-fit! max-w-full! self-start! items-center! gap-1.5! rounded-full! border-0! px-2.5! py-px! text-[10px]! font-bold! leading-4.5! whitespace-nowrap!"
                style={{
                    background: '#d43b57',
                    color: '#fff',
                    borderRadius: 9999,
                    marginInlineEnd: 0,
                }}
            >
                {dot('#fff')}
                {caseSeverityLabel[s] || s}
            </Tag>
        );
    }
    return <Pill t={sevTone[s] || 'slate'}>{caseSeverityLabel[s] || s}</Pill>;
}

const caseStatusLabel = {
    open: 'Mới',
    OPEN: 'Mới',
    waiting_for_info: 'Chờ bổ sung',
    WAITING_FOR_INFO: 'Chờ bổ sung',
    monitoring: 'Theo dõi',
    MONITORING: 'Theo dõi',
    in_treatment: 'Đang điều trị',
    IN_TREATMENT: 'Đang điều trị',
    resolved: 'Đã giải quyết',
    RESOLVED: 'Đã giải quyết',
};

const caseTone = {
    open: 'ocean',
    OPEN: 'ocean',
    waiting_for_info: 'amber',
    WAITING_FOR_INFO: 'amber',
    monitoring: 'violet',
    MONITORING: 'violet',
    in_treatment: 'rose',
    IN_TREATMENT: 'rose',
    resolved: 'teal',
    RESOLVED: 'teal',
};

export function CaseTag({ s }) {
    return <Pill t={caseTone[s] || 'slate'}>{caseStatusLabel[s] || s}</Pill>;
}

const healthStatusLabel = {
    excellent: 'Tốt',
    EXCELLENT: 'Tốt',
    good: 'Ổn định',
    GOOD: 'Ổn định',
    warning: 'Cảnh báo',
    WARNING: 'Cảnh báo',
    critical: 'Nguy hiểm',
    CRITICAL: 'Nguy hiểm',
};

const healthTone = {
    excellent: 'teal',
    EXCELLENT: 'teal',
    good: 'ocean',
    GOOD: 'ocean',
    warning: 'amber',
    WARNING: 'amber',
    critical: 'rose',
    CRITICAL: 'rose',
};

export function HealthTag({ s }) {
    return <Pill t={healthTone[s] || 'ocean'}>{healthStatusLabel[s] || s}</Pill>;
}

const protocolStatusLabel = {
    draft: 'Bản nháp',
    DRAFT: 'Bản nháp',
    pending_approval: 'Chờ duyệt',
    PENDING_APPROVAL: 'Chờ duyệt',
    approved: 'Đang áp dụng',
    APPROVED: 'Đang áp dụng',
    rejected: 'Bị từ chối',
    REJECTED: 'Bị từ chối',
    superseded: 'Đã thay thế',
    SUPERSEDED: 'Đã thay thế',
    cancelled: 'Đã hủy',
    CANCELLED: 'Đã hủy',
    aborted: 'Đã dừng',
    ABORTED: 'Đã dừng',
};

const protoTone = {
    draft: 'slate',
    DRAFT: 'slate',
    pending_approval: 'amber',
    PENDING_APPROVAL: 'amber',
    approved: 'teal',
    APPROVED: 'teal',
    rejected: 'rose',
    REJECTED: 'rose',
    superseded: 'slate',
    SUPERSEDED: 'slate',
    cancelled: 'slate',
    CANCELLED: 'slate',
    aborted: 'rose',
    ABORTED: 'rose',
};

export function ProtocolTag({ s, version }) {
    return (
        <Pill t={protoTone[s] || 'slate'}>
            {protocolStatusLabel[s] || s}
            {version ? ` ${version}` : ''}
        </Pill>
    );
}

export function ActionIcon({
    icon,
    title,
    onClick,
    danger = false,
    disabled = false,
    confirm = null,
}) {
    const btn = (
        <Button
            type="text"
            size="small"
            shape="circle"
            aria-label={title}
            icon={icon}
            danger={danger}
            disabled={disabled}
            onClick={
                confirm
                    ? (e) => e.stopPropagation()
                    : (e) => {
                          e.stopPropagation();
                          onClick?.();
                      }
            }
            className={`size-7 min-w-7! ${
                danger ? '' : '!text-[#6a7994] hover:!text-[#1d7ad6] hover:!bg-[#eaf4ff]'
            }`}
        />
    );

    const wrapped = confirm ? (
        <Popconfirm
            title={confirm.title}
            description={confirm.description}
            okText={confirm.okText ?? 'Xác nhận'}
            cancelText="Hủy"
            okButtonProps={{ danger }}
            onConfirm={(e) => {
                e?.stopPropagation();
                onClick?.();
            }}
            onCancel={(e) => e?.stopPropagation()}
        >
            {btn}
        </Popconfirm>
    ) : (
        btn
    );

    return <Tooltip title={disabled ? undefined : title}>{wrapped}</Tooltip>;
}

export const Actions = ({ children }) => (
    <div className="flex items-center justify-center gap-1">{children}</div>
);

export function PageHeader({ eyebrow, title, description, extra, className = '' }) {
    return (
        <div className={`flex flex-wrap items-end justify-between gap-3 mb-4 ${className}`}>
            <div className="min-w-0">
                {eyebrow && (
                    <div className="text-[11px] font-bold tracking-[0.12em] uppercase text-[#0f9b8e] mb-1">
                        {eyebrow}
                    </div>
                )}
                <h1 className="font-['Sora',sans-serif] text-[22px] font-bold text-[#0f1c2e] leading-snug m-0">
                    {title}
                </h1>
                {description && (
                    <p className="text-[13px] text-[#6a7994] mt-1 mb-0 max-w-2xl leading-normal">
                        {description}
                    </p>
                )}
            </div>
            {extra && <div className="flex items-center gap-2">{extra}</div>}
        </div>
    );
}

export function Panel({
    title,
    extra,
    children,
    className = '',
    pad = true,
}) {
    return (
        <section
            className={`bg-white rounded-[14px] border border-[#e5e8f0] shadow-[0_1px_2px_rgba(15,28,46,0.04)] ${className}`}
        >
            {title && (
                <header className="flex items-center justify-between gap-3 px-4 pt-3 pb-2.5 border-b border-[#eef1f7]">
                    <h3 className="m-0 font-['Sora',sans-serif] text-[13.5px] font-semibold text-[#0f1c2e]">
                        {title}
                    </h3>
                    {extra}
                </header>
            )}
            <div className={pad ? 'p-4' : ''}>{children}</div>
        </section>
    );
}

export const Label = ({ children }) => (
    <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6a7994] mb-1.5">
        {children}
    </div>
);
