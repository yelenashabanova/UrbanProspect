import { useState } from 'react'
import { DEFAULT_WEIGHTS } from '../utils/score'

const INDICATORS = [
    {
        key: 'imd',
        label: 'Imperviousness',
        color: '#e07070',
        note: 'Low sealing = more buildable land',
        defaultNote: 'Highest weight — the primary signal of how developed a municipality already is. Low imperviousness means more physical opportunity for new construction.',
    },
    {
        key: 'tcd',
        label: 'Tree Cover',
        color: '#5aaa6a',
        note: 'High green = residential desirability',
        defaultNote: 'Second highest — green cover is a leading proxy for residential quality of life and long-term asset value, especially in peri-urban areas.',
    },
    {
        key: 'pop',
        label: 'Pop. Growth',
        color: '#7ab4e8',
        note: 'Growth = demand signal',
        defaultNote: 'Strong weight — population growth 2023–2025 is the most direct demand signal. A municipality people are moving to is one worth investing in.',
    },
    {
        key: 'access',
        label: 'Rome Access',
        color: '#e8c46a',
        note: 'Closer = better connectivity',
        defaultNote: 'Lower weight — proximity to Rome matters but should not dominate, as some of the best opportunities are in well-connected secondary towns.',
    },
]

export default function WeightsPanel({ weights, onChange, scoreHistory, sidebarOpen = true }) {
    const [open, setOpen] = useState(false)

    function handleSlide(key, newVal) {
        const oldVal = weights[key]
        const delta = newVal - oldVal
        const others = INDICATORS.filter(i => i.key !== key)
        const othersTotal = others.reduce((s, i) => s + weights[i.key], 0)

        const next = { ...weights, [key]: newVal }
        if (othersTotal > 0) {
            others.forEach(ind => {
                const share = weights[ind.key] / othersTotal
                next[ind.key] = Math.max(0, Math.round(weights[ind.key] - delta * share))
            })
        }
        const total = Object.values(next).reduce((s, v) => s + v, 0)
        if (total !== 100) {
            const biggest = others.reduce((a, b) => next[a.key] > next[b.key] ? a : b)
            next[biggest.key] = Math.max(0, next[biggest.key] + (100 - total))
        }
        onChange(next)
    }

    function reset() { onChange({ ...DEFAULT_WEIGHTS }) }

    const isDefault = INDICATORS.every(i => weights[i.key] === DEFAULT_WEIGHTS[i.key])

    return (
        <div style={{
            position: 'absolute', top: '16px', left: sidebarOpen ? '58px' : '64px',
            zIndex: 900, width: '272px',
        }}>
            {/* Toggle button */}
            <button
                onClick={() => setOpen(p => !p)}
                style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    background: open ? 'var(--color-accent)' : 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '6px', padding: '9px 14px',
                    fontSize: '11px', fontWeight: 700,
                    letterSpacing: '0.08em', textTransform: 'uppercase',
                    color: open ? '#fff' : 'var(--color-accent)',
                    cursor: 'pointer', boxShadow: 'var(--shadow-sm)',
                    width: '100%', justifyContent: 'space-between',
                }}
            >
                <span>⚖ Customise Weights</span>
                <span style={{ fontSize: '9px' }}>{open ? '▲' : '▼'}</span>
            </button>

            {open && (
                <div style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '6px', marginTop: '6px',
                    padding: '18px', boxShadow: 'var(--shadow-md)',
                    maxHeight: 'calc(100vh - 180px)',
                    overflowY: 'auto',
                }}>
                    <p style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', margin: '0 0 18px', lineHeight: 1.6 }}>
                        Move any slider to reprioritise — other weights auto-adjust to stay at 100%.
                    </p>

                    {/* Sliders */}
                    {INDICATORS.map(({ key, label, color, note }) => (
                        <div key={key} style={{ marginBottom: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
                                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                                    {label}
                                </span>
                                <span style={{ fontSize: '13px', fontWeight: 700, color, minWidth: '36px', textAlign: 'right' }}>
                                    {weights[key]}%
                                </span>
                            </div>
                            <input
                                type="range" min={0} max={100} step={5}
                                value={weights[key]}
                                onChange={e => handleSlide(key, Number(e.target.value))}
                                style={{ width: '100%', accentColor: color, height: '3px', display: 'block', margin: '0 0 6px' }}
                            />
                            <div style={{ fontSize: '10px', color: 'var(--color-text-tertiary)', lineHeight: 1.4 }}>
                                {note}
                            </div>
                        </div>
                    ))}

                    {/* Sparkline */}
                    {scoreHistory.length > 1 && (
                        <div style={{ marginBottom: '18px', paddingTop: '4px' }}>
                            <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-tertiary)', marginBottom: '8px' }}>
                                Top score as you adjust
                            </div>
                            <svg width="100%" height="40" style={{ display: 'block' }}>
                                {(() => {
                                    const w = 236, h = 40
                                    const min = Math.min(...scoreHistory)
                                    const max = Math.max(...scoreHistory)
                                    const range = max - min || 1
                                    const pts = scoreHistory.map((v, i) => {
                                        const x = (i / (scoreHistory.length - 1)) * w
                                        const y = h - ((v - min) / range) * (h - 8) - 4
                                        return `${x},${y}`
                                    }).join(' ')
                                    const lastX = w
                                    const lastY = h - ((scoreHistory[scoreHistory.length - 1] - min) / range) * (h - 8) - 4
                                    return (
                                        <>
                                            <polyline points={pts} fill="none" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinejoin="round" />
                                            <circle cx={lastX} cy={lastY} r="3" fill="var(--color-accent)" />
                                        </>
                                    )
                                })()}
                            </svg>
                            <div style={{ fontSize: '10px', color: 'var(--color-text-tertiary)', textAlign: 'right', marginTop: '4px' }}>
                                Current top: <strong style={{ color: 'var(--color-accent)' }}>
                                    {scoreHistory[scoreHistory.length - 1].toFixed(1)}
                                </strong>
                            </div>
                        </div>
                    )}

                    {/* Reset */}
                    {!isDefault && (
                        <button
                            onClick={reset}
                            style={{
                                width: '100%', padding: '8px',
                                background: 'none',
                                border: '1px solid var(--color-border)',
                                borderRadius: '4px', fontSize: '11px',
                                color: 'var(--color-text-tertiary)',
                                cursor: 'pointer', letterSpacing: '0.06em',
                                marginBottom: '16px',
                            }}
                        >↺ Reset to defaults (35 / 25 / 30 / 10)</button>
                    )}

                    {/* Divider */}
                    <div style={{ height: '1px', background: 'var(--color-border)', margin: '4px 0 16px' }} />

                    {/* Our recommended weights explanation */}
                    <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-tertiary)', marginBottom: '12px' }}>
                        Our Default Weights — Why
                    </div>
                    {INDICATORS.map(({ key, label, color, defaultNote }) => (
                        <div key={key} style={{ marginBottom: '14px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                            <div style={{
                                minWidth: '32px', height: '20px', borderRadius: '3px',
                                background: color, opacity: 0.15,
                                border: `1px solid ${color}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0,
                            }}>
                                <span style={{ fontSize: '10px', fontWeight: 700, color }}>
                                    {DEFAULT_WEIGHTS[key]}%
                                </span>
                            </div>
                            <div>
                                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '3px' }}>{label}</div>
                                <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>{defaultNote}</div>
                            </div>
                        </div>
                    ))}

                    <div style={{ fontSize: '10px', color: 'var(--color-text-tertiary)', lineHeight: 1.5, marginTop: '8px', fontStyle: 'italic' }}>
                        These defaults reflect a 3–7 year residential value-add horizon with Rome as the primary demand anchor. Adjust freely for your own investment thesis.
                    </div>
                </div>
            )}
        </div>
    )
}
