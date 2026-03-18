import { useState, useMemo } from 'react'

const REGIONS = ['Toscana', 'Umbria', 'Lazio', 'Abruzzo']

export default function RankList({ neighborhoods, selectedId, onSelect, onAbout }) {
    const [sortDir, setSortDir] = useState('desc')
    const [activeRegions, setActiveRegions] = useState(new Set(REGIONS))
    const [minScore, setMinScore] = useState(0)
    const [infraOpen, setInfraOpen] = useState(false)
    const [minHospitals, setMinHospitals] = useState(0)
    const [minSchools, setMinSchools] = useState(0)
    const [minTransit, setMinTransit] = useState(0)

    function toggleRegion(r) {
        setActiveRegions(prev => {
            const next = new Set(prev)
            if (next.has(r)) { if (next.size > 1) next.delete(r) }
            else next.add(r)
            return next
        })
    }

    const infraActive = minHospitals > 0 || minSchools > 0 || minTransit > 0

    const filtered = useMemo(() => {
        return neighborhoods
            .filter(n => {
                if (!activeRegions.has(n.region)) return false
                if (n.prospectScore < minScore) return false
                const infra = n.infrastructure || {}
                if ((infra.hospitals || 0) < minHospitals) return false
                if ((infra.schools   || 0) < minSchools)   return false
                if ((infra.railway_stations   || 0) < minTransit)   return false
                return true
            })
            .sort((a, b) => sortDir === 'desc'
                ? b.prospectScore - a.prospectScore
                : a.prospectScore - b.prospectScore)
    }, [neighborhoods, sortDir, activeRegions, minScore, minHospitals, minSchools, minTransit])

    const filterLabelStyle = {
        fontSize: '10px', fontWeight: 600,
        letterSpacing: '0.08em', textTransform: 'uppercase',
        color: 'var(--color-text-tertiary)',
    }

    function Stepper({ value, set, max }) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                    onClick={() => set(v => Math.max(0, v - 1))}
                    style={{
                        width: '24px', height: '24px', borderRadius: '4px',
                        border: '1px solid var(--color-border)',
                        background: 'var(--color-surface-muted)',
                        color: 'var(--color-text-secondary)',
                        fontSize: '14px', lineHeight: 1, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                >−</button>
                <span style={{
                    minWidth: '28px', textAlign: 'center',
                    fontSize: '13px', fontWeight: 600,
                    color: value > 0 ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                }}>{value}+</span>
                <button
                    onClick={() => set(v => Math.min(max, v + 1))}
                    style={{
                        width: '24px', height: '24px', borderRadius: '4px',
                        border: '1px solid var(--color-border)',
                        background: 'var(--color-surface-muted)',
                        color: 'var(--color-text-secondary)',
                        fontSize: '14px', lineHeight: 1, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                >+</button>
            </div>
        )
    }

    return (
        <div className="rank-list">
            <div className="rank-list__header">
                <button
                    className="rank-list__wordmark"
                    onClick={onAbout}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}
                >
                    Urban Prospect
                </button>
                <div className="rank-list__subtitle">Italy — Prospect Score ranking</div>
            </div>

            <div className="rank-controls">
                {/* Sort */}
                <div className="rank-controls__sort">
                    <button
                        className={`rank-controls__sort-btn${sortDir === 'desc' ? ' active' : ''}`}
                        onClick={() => setSortDir('desc')}
                    >↓ Highest first</button>
                    <button
                        className={`rank-controls__sort-btn${sortDir === 'asc' ? ' active' : ''}`}
                        onClick={() => setSortDir('asc')}
                    >↑ Lowest first</button>
                </div>

                {/* Region filter */}
                <div className="rank-controls__filters">
                    <div className="rank-controls__filter-label">Region</div>
                    <div className="rank-controls__region-btns">
                        {REGIONS.map(r => (
                            <button
                                key={r}
                                className={`rank-controls__region-btn${activeRegions.has(r) ? ' active' : ''}`}
                                onClick={() => toggleRegion(r)}
                            >{r}</button>
                        ))}
                    </div>
                </div>

                {/* Min score slider */}
                <div className="rank-controls__filters" style={{ paddingTop: '4px', paddingBottom: '4px' }}>
                    <div className="rank-controls__filter-label">Min score</div>
                    <div className="rank-controls__score-range">
                        <span>{minScore}</span>
                        <input
                            type="range" min={0} max={90} step={5}
                            value={minScore}
                            onChange={e => setMinScore(Number(e.target.value))}
                        />
                        <span>100</span>
                    </div>
                </div>

                {/* Infrastructure — collapsible */}
                <div className="rank-controls__filters" style={{ paddingTop: '4px' }}>
                    <button
                        onClick={() => setInfraOpen(p => !p)}
                        style={{
                            display: 'flex', justifyContent: 'space-between',
                            alignItems: 'center', width: '100%',
                            background: 'none', border: 'none', padding: 0,
                            cursor: 'pointer',
                        }}
                    >
                        <span style={{ ...filterLabelStyle, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            Infrastructure
                            {infraActive && (
                                <span style={{
                                    background: 'var(--color-accent)', color: '#fff',
                                    borderRadius: '8px', padding: '1px 6px',
                                    fontSize: '9px', fontWeight: 700,
                                }}>ON</span>
                            )}
                        </span>
                        <span style={{ fontSize: '9px', color: 'var(--color-text-tertiary)' }}>
                            {infraOpen ? '▲' : '▼'}
                        </span>
                    </button>

                    {infraOpen && (
                        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {[
                                { label: '🏥 Hospitals', value: minHospitals, set: setMinHospitals, max: 10 },
                                { label: '🏫 Schools', value: minSchools, set: setMinSchools, max: 20 },
                                { label: '🚂 Railway', value: minTransit, set: setMinTransit, max: 10 },
                            ].map(({ label, value, set, max }) => (
                                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>{label}</span>
                                    <Stepper value={value} set={set} max={max} />
                                </div>
                            ))}
                            {infraActive && (
                                <button
                                    onClick={() => { setMinHospitals(0); setMinSchools(0); setMinTransit(0) }}
                                    style={{
                                        fontSize: '10px', color: 'var(--color-text-tertiary)',
                                        background: 'none', border: '1px solid var(--color-border)',
                                        borderRadius: '4px', padding: '4px 8px', cursor: 'pointer',
                                        alignSelf: 'flex-start',
                                    }}
                                >Reset</button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="rank-list__label">
                {filtered.length} municipalities
            </div>

            <div className="rank-list__items">
                {filtered.map((n, idx) => (
                    <div
                        key={n.id}
                        className={`rank-item${selectedId === n.id ? ' active' : ''}`}
                        onClick={() => onSelect(n)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={e => e.key === 'Enter' && onSelect(n)}
                        aria-label={`${n.name}, Prospect Score ${n.prospectScore}`}
                    >
                        <span className="rank-item__rank">{idx + 1}</span>
                        <div className="rank-item__info">
                            <div className="rank-item__name">{n.name}</div>
                            <div className="rank-item__score-bar-wrap">
                                <div
                                    className="rank-item__score-bar"
                                    style={{ width: `${n.prospectScore}%` }}
                                />
                            </div>
                        </div>
                        <span className="rank-item__score-val">{n.prospectScore}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}
