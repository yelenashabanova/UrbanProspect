import { useState } from 'react'

function Collapsible({ label, children, defaultOpen = false }) {
    const [open, setOpen] = useState(defaultOpen)
    return (
        <div className="detail-section">
            <button
                onClick={() => setOpen(p => !p)}
                style={{
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', width: '100%',
                    background: 'none', border: 'none', padding: 0,
                    cursor: 'pointer', marginBottom: open ? '10px' : 0,
                }}
            >
                <span className="detail-section__label" style={{ marginBottom: 0 }}>{label}</span>
                <span style={{ fontSize: '9px', color: 'var(--color-text-tertiary)' }}>{open ? '▲' : '▼'}</span>
            </button>
            {open && children}
        </div>
    )
}

export default function DetailPanel({ neighborhood, onClose, onAbout, onCompare }) {
    const isOpen = !!neighborhood

    function scoreColor(score, min, max) {
        const t = max > min ? (score - min) / (max - min) : 0.5
        if (t < 0.33) return 'rgb(190,80,40)'
        if (t < 0.66) return 'rgb(160,140,20)'
        return 'var(--color-accent)'
    }

    return (
        <div className={`detail-panel${isOpen ? ' open' : ''}`} aria-label="Comune detail">
            <button className="detail-panel__close" onClick={onClose} aria-label="Close panel">×</button>

            {neighborhood && (
                <>
                    {/* Hero — always visible */}
                    <div className="detail-panel__hero">
                        <div className="detail-panel__tag">Comune · {neighborhood.region}</div>
                        <div className="detail-panel__name">{neighborhood.name}</div>
                        <div className="detail-panel__score-row">
                            <span
                                className="detail-panel__score-num"
                                style={{ color: scoreColor(neighborhood.prospectScore, neighborhood.scoreMin, neighborhood.scoreMax) }}
                            >
                                {neighborhood.prospectScore.toFixed(1)}
                            </span>
                            <span className="detail-panel__score-denom">/ 100</span>
                        </div>
                        <div className="detail-panel__score-label">Prospect Score</div>
                    </div>

                    <div className="detail-panel__body">

                        {/* Why this area — always visible */}
                        <div className="detail-section">
                            <div className="detail-section__label">Why this area?</div>
                            <p className="detail-section__explanation">{neighborhood.explanation}</p>
                        </div>

                        {/* Indicator Breakdown — always visible */}
                        <div className="detail-section">
                            <div className="detail-section__label">Indicator Breakdown</div>
                            <div className="indicator-list">
                                {neighborhood.indicators.map(ind => (
                                    <div key={ind.key} className="indicator-item">
                                        <div className="indicator-item__label-row">
                                            <span className="indicator-item__name">{ind.label}</span>
                                            <span className="indicator-item__value">
                                                {ind.value}{ind.unit}
                                                <span style={{ fontWeight: 400, color: '#9b9895', marginLeft: 6, fontSize: 10 }}>
                                                    {ind.note}
                                                </span>
                                            </span>
                                        </div>
                                        <div className="indicator-item__track">
                                            <div
                                                className="indicator-item__fill"
                                                style={{ width: `${Math.min(100, Math.abs(ind.value ?? 0))}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Infrastructure — always visible */}
                        <div className="detail-section">
                            <div className="detail-section__label">Infrastructure</div>
                            {neighborhood.infrastructure ? (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                                    {[
                                        { label: 'Hospitals', value: neighborhood.infrastructure.hospitals, icon: '🏥' },
                                        { label: 'Schools', value: neighborhood.infrastructure.schools, icon: '🏫' },
                                        { label: 'Railway', value: neighborhood.infrastructure.railway_stations, icon: '🚂' },
                                    ].map(({ label, value, icon }) => (
                                        <div key={label} style={{
                                            background: 'var(--color-surface-muted)',
                                            border: '1px solid var(--color-border)',
                                            borderRadius: '6px', padding: '10px 8px', textAlign: 'center',
                                        }}>
                                            <div style={{ fontSize: '18px', marginBottom: '4px' }}>{icon}</div>
                                            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)' }}>{value}</div>
                                            <div style={{ fontSize: '10px', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="detail-section__explanation" style={{ color: 'var(--color-text-tertiary)' }}>No data.</p>
                            )}
                        </div>

                        {/* Residential Price — OMI */}
                        {neighborhood.price && (
                            <div className="detail-section">
                                <div className="detail-section__label">Residential Price — OMI</div>
                                <div style={{ marginBottom: '6px' }}>
                                    {neighborhood.price.zones >= 5 ? (
                                        <>
                                            <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                                                €{neighborhood.price.min.toLocaleString()} – €{neighborhood.price.max.toLocaleString()}/m²
                                            </span>
                                            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                                                avg €{neighborhood.price.mid.toLocaleString()}/m² across {neighborhood.price.zones} zones
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                                                €{neighborhood.price.mid.toLocaleString()}/m²
                                            </span>
                                            {neighborhood.price.min !== neighborhood.price.max && (
                                                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                                                    range €{neighborhood.price.min.toLocaleString()} – €{neighborhood.price.max.toLocaleString()}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                                {neighborhood.price.signal && (() => {
                                    const cfg = {
                                        low:  { label: 'Below regional median', color: '#2d6a4f', bg: '#d8f3dc' },
                                        mid:  { label: 'Around regional median', color: '#555',    bg: '#f0f0f0' },
                                        high: { label: 'Above regional median',  color: '#7B5800', bg: '#FFF3CD' },
                                    }[neighborhood.price.signal];
                                    return cfg ? (
                                        <span style={{
                                            display: 'inline-block', fontSize: '11px', fontWeight: 600,
                                            color: cfg.color, background: cfg.bg,
                                            borderRadius: '4px', padding: '2px 8px', marginBottom: '6px',
                                        }}>{cfg.label}</span>
                                    ) : null;
                                })()}
                                <div style={{ fontSize: '10px', color: 'var(--color-text-tertiary)', lineHeight: 1.4 }}>
                                    OMI {neighborhood.price.semester?.replace('_', ' S')} · Abitazioni civili, stato normale · Dati OMI — Agenzia delle Entrate
                                </div>
                            </div>
                        )}

                        {/* Score breakdown — collapsible */}
                        <Collapsible label="Score breakdown">
                            <p className="detail-section__explanation" style={{ fontSize: '12px' }}>
                                <strong>Prospect Score</strong><br />
                                35% × (100 − IMD score)<br />
                                + 25% × Tree Cover score<br />
                                + 30% × Population Growth score<br />
                                + 10% × Accessibility score<br /><br />
                                Each component is independently min-max normalised to [0–100]
                                across all municipalities in the study area.
                            </p>
                        </Collapsible>

                        {/* Data Sources — collapsible */}
                        <Collapsible label="Data Sources">
                            <p className="detail-section__explanation" style={{ fontSize: '11px' }}>
                                IMD — Copernicus HRL Imperviousness Density 2021, 10 m, EPSG:3035.<br />
                                TCD — Copernicus HRL Tree Cover Density 2021, 10 m, EPSG:3035 (modelled where tiles missing).<br />
                                Population — ISTAT Demo, popolazione residente per comune 2023 &amp; 2025.<br />
                                Accessibility — OSRM public routing API, drive time to Piazza Venezia, Rome.<br />
                                Infrastructure — OpenStreetMap via Overpass API (hospitals, schools, railway stations).<br />
                                Residential price — OMI, Agenzia delle Entrate (via ondata mirror), aggregated per comune.<br />
                                Boundaries — ISTAT comuni 2025, WGS84.<br />
                                Prospect Score is a structural signal index, not a price forecast.
                            </p>
                        </Collapsible>

                        {/* Action buttons */}
                        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--color-border, #e5e5e0)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <button
                                onClick={() => onCompare && onCompare(neighborhood)}
                                style={{
                                    width: '100%', padding: '10px', background: 'none',
                                    border: '1.5px solid #7ab4e8', borderRadius: '6px',
                                    color: '#7ab4e8', fontWeight: 600, fontSize: '12px',
                                    letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
                                }}
                            >⇄ Add to Compare</button>
                            <button
                                onClick={onAbout}
                                style={{
                                    width: '100%', padding: '10px', background: 'none',
                                    border: '1.5px solid var(--color-accent, #2d6a4f)', borderRadius: '6px',
                                    color: 'var(--color-accent, #2d6a4f)', fontWeight: 600, fontSize: '12px',
                                    letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
                                }}
                            >About Urban Prospect →</button>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
