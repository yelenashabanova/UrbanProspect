export default function DetailPanel({ neighborhood, onClose, onAbout }) {
    const isOpen = !!neighborhood

    // Colour the score number based on its position in the data range
    function scoreColor(score, min, max) {
        const t = max > min ? (score - min) / (max - min) : 0.5
        if (t < 0.33) return 'rgb(190,80,40)'
        if (t < 0.66) return 'rgb(160,140,20)'
        return 'var(--color-accent)'
    }

    return (
        <div className={`detail-panel${isOpen ? ' open' : ''}`} aria-label="Comune detail">
            <button className="detail-panel__close" onClick={onClose} aria-label="Close panel">
                ×
            </button>

            {neighborhood && (
                <>
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
                        <div className="detail-section">
                            <div className="detail-section__label">Why this area?</div>
                            <p className="detail-section__explanation">{neighborhood.explanation}</p>
                        </div>

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
                                                style={{ width: `${Math.min(100, ind.value)}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="detail-section">
                            <div className="detail-section__label">Infrastructure</div>
                            {neighborhood.infrastructure ? (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                                    {[
                                        { label: 'Hospitals', value: neighborhood.infrastructure.hospitals, icon: '🏥' },
                                        { label: 'Schools', value: neighborhood.infrastructure.schools, icon: '🏫' },
                                        { label: 'Railway stations', value: neighborhood.infrastructure.railway_stations, icon: '🚂' },
                                    ].map(({ label, value, icon }) => (
                                        <div key={label} style={{
                                            background: 'var(--color-surface-muted)',
                                            border: '1px solid var(--color-border)',
                                            borderRadius: '6px',
                                            padding: '10px 8px',
                                            textAlign: 'center',
                                        }}>
                                            <div style={{ fontSize: '18px', marginBottom: '4px' }}>{icon}</div>
                                            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)' }}>{value}</div>
                                            <div style={{ fontSize: '10px', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="detail-section__explanation" style={{ color: 'var(--color-text-tertiary)' }}>No infrastructure data available.</p>
                            )}
                            <p style={{ fontSize: '10px', color: 'var(--color-text-tertiary)', marginTop: '8px' }}>
                                OSM amenity counts within municipality bounds · hospitals & clinics, schools & universities, railway stations (OSM railway=station)
                            </p>
                        </div>

                        <div className="detail-section">
                            <p className="detail-section__explanation" style={{ fontSize: '12px' }}>
                                <strong>Prospect Score</strong><br />
                                35% × (100 − IMD score)<br />
                                + 25% × Tree Cover score<br />
                                + 30% × Population Growth score<br />
                                + 10% × Accessibility score<br /><br />
                                Each component is independently min-max normalised to [0–100]
                                across all municipalities in the study area.
                                High score = low sealing, high green cover, growing population,
                                and good Rome connectivity.
                            </p>
                        </div>

                        <div className="detail-section">
                            <div className="detail-section__label">Data Sources</div>
                            <p className="detail-section__explanation" style={{ fontSize: '11px' }}>
                                IMD — Copernicus HRL Imperviousness Density 2021, 10 m, EPSG:3035.<br />
                                TCD — Copernicus HRL Tree Cover Density 2021, 10 m, EPSG:3035 (modelled where tiles missing).<br />
                                Population — ISTAT Demo, popolazione residente per comune 2023 &amp; 2025.<br />
                                Accessibility — OSRM public routing API, drive time to Piazza Venezia, Rome.<br />
                                Infrastructure — OpenStreetMap via Overpass API (hospitals, schools, railway stations).<br />
                                Boundaries — ISTAT comuni 2025, WGS84.<br />
                                Prospect Score is a structural signal index, not a price forecast.
                            </p>
                        </div>

                        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--color-border, #e5e5e0)' }}>
                            <button
                                onClick={onAbout}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    background: 'none',
                                    border: '1.5px solid var(--color-accent, #2d6a4f)',
                                    borderRadius: '6px',
                                    color: 'var(--color-accent, #2d6a4f)',
                                    fontWeight: 600,
                                    fontSize: '12px',
                                    letterSpacing: '0.08em',
                                    textTransform: 'uppercase',
                                    cursor: 'pointer',
                                }}
                            >
                                About Urban Prospect →
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
