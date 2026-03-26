const INDICATORS = [
    { key: 'imperviousnessDensity', label: 'Imperviousness',   color: '#e07050', invert: true },
    { key: 'treeCoverDensity',      label: 'Tree Cover',        color: '#4a9e6b', invert: false },
    { key: 'populationGrowth',      label: 'Pop. Growth',       color: '#5b8fc9', invert: false },
    { key: 'accessibilityRome',     label: 'Rome Access',       color: '#9b6fc9', invert: true },
]

function scoreColor(score) {
    if (score >= 70) return 'var(--color-accent)'
    if (score >= 50) return 'rgb(160,140,20)'
    return 'rgb(190,80,40)'
}

export default function ComparePanel({ neighborhoods, onClose }) {
    if (!neighborhoods || neighborhoods.length < 2) return null
    const [a, b] = neighborhoods

    const getInd = (n, key) => n.indicators?.find(i => i.key === key)

    return (
        <div style={{
            position: 'absolute', bottom: '28px', right: '28px',
            zIndex: 900, width: '420px',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '10px',
            boxShadow: 'var(--shadow-md)',
            overflow: 'hidden',
        }}>
            {/* Header */}
            <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr',
                background: 'var(--color-surface-muted)',
                borderBottom: '1px solid var(--color-border)',
            }}>
                {[a, b].map((n, idx) => (
                    <div key={n.id} style={{
                        padding: '14px 16px',
                        borderRight: idx === 0 ? '1px solid var(--color-border)' : 'none',
                    }}>
                        <div style={{ fontSize: '10px', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '3px' }}>
                            {n.region}
                        </div>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '4px' }}>
                            {n.name}
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: 700, color: scoreColor(n.prospectScore) }}>
                            {n.prospectScore.toFixed(1)}
                            <span style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', fontWeight: 400 }}> / 100</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Indicators */}
            <div style={{ padding: '12px 16px' }}>
                {INDICATORS.map(({ key, label, color }) => {
                    const indA = getInd(a, key)
                    const indB = getInd(b, key)
                    const scoreA = indA?.score ?? 0
                    const scoreB = indB?.score ?? 0
                    const valA = indA?.value
                    const valB = indB?.value
                    const unit = indA?.unit ?? ''
                    const winner = scoreA > scoreB ? 'a' : scoreB > scoreA ? 'b' : 'tie'

                    return (
                        <div key={key} style={{ marginBottom: '12px' }}>
                            <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
                                {label}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                {[
                                    { n: a, score: scoreA, val: valA, side: 'a' },
                                    { n: b, score: scoreB, val: valB, side: 'b' },
                                ].map(({ n, score, val, side }) => (
                                    <div key={n.id}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                                            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                                                {val != null ? `${val}${unit}` : '—'}
                                            </span>
                                            {winner === side && (
                                                <span style={{ fontSize: '9px', background: color, color: '#fff', borderRadius: '4px', padding: '1px 5px', fontWeight: 700 }}>✓</span>
                                            )}
                                        </div>
                                        <div style={{ height: '4px', background: 'var(--color-border)', borderRadius: '2px', overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${score}%`, background: color, borderRadius: '2px', transition: 'width 0.4s ease' }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Close */}
            <button
                onClick={onClose}
                style={{
                    position: 'absolute', top: '10px', right: '10px',
                    background: 'var(--color-surface-muted)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '50%', width: '24px', height: '24px',
                    fontSize: '14px', cursor: 'pointer',
                    color: 'var(--color-text-secondary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
            >×</button>
        </div>
    )
}
