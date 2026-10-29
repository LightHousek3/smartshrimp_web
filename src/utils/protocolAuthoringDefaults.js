/** Approved feeding defaults from PHAC_DO_NUOI_TOM_THE_VA_TOM_SU_THEO_TEPBAC.md, tables TAB 1 and TAB 2.
 * These are editable authoring suggestions, not legal constraints or a product prescription.
 */
const profiles = {
    WHITELEG: {
        times: ['07:30', '12:00', '17:00', '22:00'],
        shares: [25, 20, 25, 30],
        phases: [
            [1, 10, 2800, 400],
            [11, 20, 6900, 500],
            [21, 29, 11900, 500],
            [30, 45, 5.6],
            [46, 60, 3.7],
            [61, 75, 2.8],
            [76, 90, 1.8],
        ],
    },
    BLACK_TIGER: {
        times: ['06:30', '10:00', '16:00', '21:00'],
        shares: [25, 20, 30, 25],
        phases: [
            [1, 10, 1400, 100],
            [11, 20, 2400, 140],
            [21, 29, 3800, 140],
            [30, 45, 8],
            [46, 55, 5.2],
            [56, 75, 3.8],
            [76, 100, 3],
            [101, 120, 2.8],
        ],
    },
};
const profileFor = (species) => {
    if (!profiles[species])
        throw new Error('Chọn loài tôm trước khi thêm giai đoạn.');
    return profiles[species];
};
export const isAuthoringContextReady = ({
    farmId,
    shrimpType,
    referencePostCount,
}) =>
    Boolean(farmId) &&
    Object.hasOwn(profiles, shrimpType) &&
    Number.isInteger(referencePostCount) &&
    referencePostCount >= 1 &&
    referencePostCount <= 1000000000;

export const defaultProtocolMeals = (species) =>
    profileFor(species).times.map((time, index) => ({
        time,
        sharePct: 25,
        growoutSharePct: profileFor(species).shares[index],
    }));

export const suggestProtocolRange = (stages, species) => {
    const last = stages.at(-1);
    const startDay = last ? last.endDay + 1 : 1;
    if (!Number.isInteger(startDay) || startDay < 1 || startDay > 3650)
        throw new Error('Không còn DOC hợp lệ để thêm giai đoạn.');
    const next = profileFor(species).phases.find(([, end]) => end >= startDay);
    return {
        startDay,
        endDay:
            next?.[1] ?? Math.min(3650, startDay + last.endDay - last.startDay),
    };
};

const referenceRation = (species, postCount, day) => {
    const row = profileFor(species).phases.find(
        ([start, end]) => day >= start && day <= end
    );
    if (!row) return null;
    const [start, , dose, increase = 0] = row;
    const fixed = start < 30;
    const factor = fixed ? postCount / 100000 : 1;
    return {
        doseBasis: fixed ? 'FIXED_QUANTITY' : 'PERCENT_BIOMASS',
        doseUnit: fixed ? 'G' : 'KG',
        dailyDose: (dose + increase * (day - start)) * factor,
        dailyIncrement: increase * factor,
    };
};

/** Carry forward the Expert's relative adjustment within a compatible basis; never convert grams to biomass. */
export const suggestQuickPhase = (species, postCount, phases) => {
    const range = suggestProtocolRange(phases, species);
    const last = phases.at(-1);
    return {
        ...range,
        ...suggestPhaseRation(species, postCount, range.startDay, last),
    };
};

export const suggestPhaseRation = (species, postCount, startDay, last) => {
    const reference = referenceRation(species, postCount, startDay);
    if (!reference)
        return {
            doseBasis: last?.doseBasis ?? 'PERCENT_BIOMASS',
            doseUnit: last?.doseUnit ?? 'KG',
            dailyDose: last?.dailyDose,
            dailyIncrement: 0,
        };
    if (last && last.doseBasis === reference.doseBasis) {
        const prior = referenceRation(species, postCount, last.endDay);
        if (prior?.doseBasis === last.doseBasis) {
            const elapsed = last.endDay - last.startDay;
            const grams =
                last.doseBasis === 'FIXED_QUANTITY' && last.doseUnit === 'KG'
                    ? 1000
                    : 1;
            const actualEnd =
                (last.dailyDose + (last.dailyIncrement ?? 0) * elapsed) * grams;
            const referenceEnd = prior.dailyDose;
            const factor = actualEnd / referenceEnd;
            reference.dailyDose *= factor;
            reference.dailyIncrement *= factor;
        }
    }
    return {
        ...reference,
        dailyDose: Number(reference.dailyDose.toFixed(4)),
        dailyIncrement: Number(reference.dailyIncrement.toFixed(4)),
    };
};
