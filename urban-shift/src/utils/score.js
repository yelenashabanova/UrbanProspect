// src/utils/score.js
export const DEFAULT_WEIGHTS = { imd: 35, tcd: 25, pop: 30, access: 10 }

export function computeScore(neighborhood, weights) {
    const indicators = neighborhood.indicators || []
    const get = key => {
        const ind = indicators.find(i => i.key === key)
        return ind?.score ?? 0
    }
    const imd    = get('imperviousnessDensity')
    const tcd    = get('treeCoverDensity')
    const pop    = get('populationGrowth')
    const access = get('accessibilityRome')

    return (
        (weights.imd    / 100) * (100 - imd) +
        (weights.tcd    / 100) * tcd          +
        (weights.pop    / 100) * pop          +
        (weights.access / 100) * access
    )
}
