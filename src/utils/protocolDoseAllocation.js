/** Allocate at storage precision while preserving the exact daily total. */
export const divideDailyDose = (total, meals) => {
    const ticks = Math.round(total * 10000);
    const totalShare = meals.reduce((sum, meal) => sum + meal.sharePct, 0);
    const portions = meals.map((meal, index) => {
        const exact = (ticks * meal.sharePct) / totalShare;
        return {
            index,
            ticks: Math.floor(exact),
            remainder: exact - Math.floor(exact),
        };
    });
    let remaining =
        ticks - portions.reduce((sum, portion) => sum + portion.ticks, 0);
    const ordered = [...portions].sort(
        (a, b) => b.remainder - a.remainder || a.index - b.index
    );
    for (let index = 0; remaining > 0; index += 1, remaining -= 1)
        ordered[index % ordered.length].ticks += 1;
    return portions.map((portion) => portion.ticks / 10000);
};
