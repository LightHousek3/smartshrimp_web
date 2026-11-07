import { SEASON_STATUS_LABELS } from '../constants/productionProtocol';
import { SEASON_TONES } from '../constants/seasonMetrics';
import { metricNumber } from '../utils/seasonMetrics';
import { Pill } from '../pages/expert/expertUI';

/** Compact season context stays readable across tabs and wraps naturally on narrow screens. */
const ExpertSeasonHeader = ({ season }) => <section aria-label="Thông tin vụ nuôi"
    className="rounded-2xl border border-[#e5e8f0] bg-[rgba(255,255,255,0.85)] px-6 py-4 max-[650px]:px-4">
    <div className="flex min-h-11 flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
            <h1 className="m-0 min-w-0 break-words font-[Sora,sans-serif] text-[22px] font-bold leading-8 tracking-[-0.55px] max-[650px]:text-lg">{season.name}</h1>
            <span className="inline-flex shrink-0 items-center">
                <Pill t={SEASON_TONES[season.status]}>{SEASON_STATUS_LABELS[season.status]}</Pill>
            </span>
        </div>
        {season.dayOfCulture != null && <div aria-label={`Ngày nuôi: ${season.dayOfCulture} ngày`}
            className="ml-auto flex shrink-0 items-baseline gap-2 rounded-xl bg-[#eaf4ff] px-4 py-2 text-[#0f62b4]">
            <span className="text-xs font-medium leading-5">DOC</span>
            <strong className="text-[28px] font-semibold leading-7">{season.dayOfCulture}</strong>
            <span className="text-xs leading-5 text-[#6a7994]">ngày</span>
        </div>}
    </div>
    <dl className="m-0 mt-3 flex flex-wrap items-baseline gap-x-6 gap-y-1 text-[13px] leading-[22px] text-[#3a4a63] max-[650px]:flex-col max-[650px]:items-start">
        <div className="min-w-0 break-words">
            <dt className="inline font-medium">Trang trại & ao: </dt>
            <dd className="m-0 inline">{season.farm.name} · Ao {season.pond.name}</dd>
        </div>
        <div>
            <dt className="inline font-medium">Diện tích / thể tích: </dt>
            <dd className="m-0 inline">{metricNumber(season.pond.areaM2)} m² / {metricNumber(season.pond.volumeM3)} m³</dd>
        </div>
        <div className="min-w-0 break-words">
            <dt className="inline font-medium">Kỹ thuật viên phụ trách: </dt>
            <dd className="m-0 inline">{season.technician ? <>{season.technician.fullName || '—'}{season.technician.phone && <span className="text-[#6a7994]"> · {season.technician.phone}</span>}</> : 'Chưa phân công'}</dd>
        </div>
    </dl>
</section>;

export default ExpertSeasonHeader;
