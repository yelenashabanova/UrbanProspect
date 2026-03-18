import { useState } from 'react'

export default function LandingPage({ onEnter }) {
    const [form, setForm] = useState({ name: '', email: '', organisation: '', message: '' })
    const [status, setStatus] = useState(null) // null | 'sending' | 'sent' | 'error'

    function handleChange(e) {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    }

    const SHEETS_URL = 'https://script.google.com/macros/s/AKfycbwzlX-XyNnNZC3QqrlloOj4VTnjvLtMXJOEC3p5rgjkktNly0xOwj2ashNtBBFS7jiU/exec'

    async function handleSubmit() {
        if (!form.name || !form.email) {
            setStatus('error')
            return
        }
        setStatus('sending')
        try {
            await fetch(SHEETS_URL, {
                method: 'POST',
                mode: 'no-cors', // Google Apps Script requires no-cors
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    timestamp: new Date().toISOString(),
                    name: form.name,
                    email: form.email,
                    organisation: form.organisation,
                    message: form.message,
                }),
            })
            // no-cors means we can't read the response, but if no exception = success
            setForm({ name: '', email: '', organisation: '', message: '' })
            setStatus('sent')
        } catch {
            setStatus('error')
        }
    }

    const inputStyle = {
        width: '100%', padding: '12px 16px',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '4px', color: '#e8ede9',
        fontSize: '14px', boxSizing: 'border-box',
        outline: 'none', fontFamily: 'inherit',
    }
    const labelStyle = {
        fontSize: '11px', letterSpacing: '0.15em',
        textTransform: 'uppercase', color: '#7a8f7c', marginBottom: '8px', display: 'block',
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: '#0d1a12',
            color: '#e8ede9',
            fontFamily: "'Georgia', 'Times New Roman', serif",
            overflowX: 'hidden',
        }}>
            {/* Nav */}
            <nav style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '24px 48px', borderBottom: '1px solid rgba(255,255,255,0.08)',
                position: 'sticky', top: 0, background: '#0d1a12', zIndex: 100,
            }}>
                <div style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#7bc47f' }}>
                    Urban Prospect
                </div>
                <button onClick={onEnter} style={{
                    background: '#7bc47f', color: '#0d1a12', border: 'none',
                    padding: '10px 24px', borderRadius: '4px', fontWeight: 700,
                    fontSize: '13px', letterSpacing: '0.08em', textTransform: 'uppercase',
                    cursor: 'pointer',
                }}>
                    Open Map →
                </button>
            </nav>

            {/* Hero */}
            <section style={{ padding: '100px 48px 80px', maxWidth: '900px' }}>
                <div style={{ fontSize: '11px', letterSpacing: '0.25em', textTransform: 'uppercase', color: '#7bc47f', marginBottom: '24px' }}>
                    Territorial Intelligence for Real Estate
                </div>
                <h1 style={{
                    fontSize: 'clamp(42px, 6vw, 80px)', fontWeight: 400, lineHeight: 1.05,
                    margin: '0 0 32px', color: '#f0f4f0', fontStyle: 'italic',
                }}>
                    Where should you<br />invest next?
                </h1>
                <p style={{ fontSize: '18px', lineHeight: 1.7, color: '#a8bfaa', maxWidth: '580px', margin: '0 0 48px' }}>
                    Urban Prospect is a satellite-powered screening tool that identifies residential
                    real estate opportunity across Central Italy — before the market does.
                </p>
                <button onClick={onEnter} style={{
                    background: 'transparent', color: '#7bc47f',
                    border: '1.5px solid #7bc47f', padding: '14px 36px',
                    borderRadius: '4px', fontSize: '14px', fontWeight: 600,
                    letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer',
                }}>
                    Explore the Map
                </button>
            </section>

            <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '0 48px' }} />

            {/* What is the score */}
            <section style={{ padding: '80px 48px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', maxWidth: '1100px' }}>
                <div>
                    <div style={{ fontSize: '11px', letterSpacing: '0.25em', textTransform: 'uppercase', color: '#7bc47f', marginBottom: '20px' }}>The Score</div>
                    <h2 style={{ fontSize: '32px', fontWeight: 400, margin: '0 0 20px', lineHeight: 1.2, fontStyle: 'italic' }}>
                        What is the Prospect Score?
                    </h2>
                    <p style={{ fontSize: '15px', lineHeight: 1.8, color: '#a8bfaa', margin: '0 0 20px' }}>
                        A composite 0–100 index computed from satellite and census signals,
                        designed to surface municipalities with structural residential investment potential
                        over a 3–7 year value-add horizon.
                    </p>
                    <p style={{ fontSize: '15px', lineHeight: 1.8, color: '#a8bfaa' }}>
                        High score = low soil sealing, high green cover, growing population, and strong
                        Rome connectivity. Each component is independently normalised so no single
                        signal dominates.
                    </p>
                </div>
                <div style={{ background: 'rgba(123,196,127,0.06)', border: '1px solid rgba(123,196,127,0.15)', borderRadius: '8px', padding: '36px' }}>
                    <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#7bc47f', marginBottom: '24px' }}>Formula</div>
                    {[
                        { weight: '35%', label: 'Imperviousness Density', note: 'Low sealing → more buildable land' },
                        { weight: '25%', label: 'Tree Cover Density', note: 'Green cover → residential desirability' },
                        { weight: '30%', label: 'Population Growth', note: '2023–2025 · demand signal' },
                        { weight: '10%', label: 'Drive Time to Rome', note: 'Connectivity → market access' },
                    ].map(({ weight, label, note }) => (
                        <div key={label} style={{ display: 'flex', gap: '16px', marginBottom: '20px', alignItems: 'flex-start' }}>
                            <div style={{ fontSize: '20px', fontWeight: 700, color: '#7bc47f', minWidth: '44px', fontStyle: 'italic' }}>{weight}</div>
                            <div>
                                <div style={{ fontSize: '14px', fontWeight: 600, color: '#e8ede9', marginBottom: '3px' }}>{label}</div>
                                <div style={{ fontSize: '12px', color: '#7a8f7c' }}>{note}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '0 48px' }} />

            {/* Who it's for */}
            <section style={{ padding: '80px 48px', maxWidth: '1100px' }}>
                <div style={{ fontSize: '11px', letterSpacing: '0.25em', textTransform: 'uppercase', color: '#7bc47f', marginBottom: '20px' }}>Who It's For</div>
                <h2 style={{ fontSize: '32px', fontWeight: 400, margin: '0 0 48px', fontStyle: 'italic' }}>Built for real estate professionals</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '32px' }}>
                    {[
                        { title: 'Fund Managers', body: 'Screen 1,000+ municipalities in seconds. Focus due diligence where structural signals align — not just where prices are low.' },
                        { title: 'Asset Managers', body: 'Identify value-add opportunities before population growth and greenfield pressure push prices. The score is a leading, not lagging, indicator.' },
                        { title: 'Acquisitions Teams', body: 'Filter by region, drive time, and growth trajectory. Export ranked lists to brief your investment committee without manual research.' },
                    ].map(({ title, body }) => (
                        <div key={title} style={{ borderTop: '1px solid rgba(123,196,127,0.25)', paddingTop: '24px' }}>
                            <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: '#e8ede9' }}>{title}</div>
                            <p style={{ fontSize: '14px', lineHeight: 1.7, color: '#7a8f7c', margin: 0 }}>{body}</p>
                        </div>
                    ))}
                </div>
            </section>

            <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '0 48px' }} />

            {/* Methodology */}
            <section style={{ padding: '80px 48px', maxWidth: '1100px' }}>
                <div style={{ fontSize: '11px', letterSpacing: '0.25em', textTransform: 'uppercase', color: '#7bc47f', marginBottom: '20px' }}>Methodology</div>
                <h2 style={{ fontSize: '32px', fontWeight: 400, margin: '0 0 40px', fontStyle: 'italic' }}>Open data, reproducible science</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px' }}>
                    <div>
                        <h3 style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7bc47f', marginBottom: '16px' }}>Data Sources</h3>
                        {[
                            ['Copernicus HRL', 'Imperviousness Density & Tree Cover Density 2021 · 10 m resolution · EPSG:3035'],
                            ['ISTAT Demo', 'Popolazione residente per comune · 2023 & 2025 · aggregated from province-level CSVs'],
                            ['OSRM Routing API', 'Drive time to Piazza Venezia, Rome · computed per municipality centroid · cached'],
                            ['OpenStreetMap', 'Hospitals, schools & railway stations per comune · via Overpass API · counts per 10k residents'],
                            ['ISTAT Boundaries', 'Comuni 2025 · WGS84 · simplified at 0.001° for web delivery'],
                        ].map(([source, desc]) => (
                            <div key={source} style={{ marginBottom: '20px' }}>
                                <div style={{ fontSize: '13px', fontWeight: 600, color: '#e8ede9', marginBottom: '4px' }}>{source}</div>
                                <div style={{ fontSize: '12px', color: '#7a8f7c', lineHeight: 1.6 }}>{desc}</div>
                            </div>
                        ))}
                    </div>
                    <div>
                        <h3 style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7bc47f', marginBottom: '16px' }}>Important Caveats</h3>
                        <ul style={{ padding: '0 0 0 16px', margin: 0, color: '#7a8f7c', fontSize: '13px', lineHeight: 2 }}>
                            <li>Prospect Score is a structural signal index, not a price forecast</li>
                            <li>TCD is modelled from IMD regression for municipalities outside tile coverage</li>
                            <li>Population growth uses 2023–2025 data (ISTAT Demo)</li>
                            <li>Study area: Lazio, Toscana, Umbria, Abruzzo · 1,048 municipalities</li>
                            <li>Roma Capitale scores low on IMD by design and may be excluded from opportunity rankings</li>
                        </ul>
                    </div>
                </div>
            </section>

            <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '0 48px' }} />

            {/* Contact */}
            <section style={{ padding: '80px 48px', maxWidth: '680px' }}>
                <div style={{ fontSize: '11px', letterSpacing: '0.25em', textTransform: 'uppercase', color: '#7bc47f', marginBottom: '20px' }}>Contact</div>
                <h2 style={{ fontSize: '32px', fontWeight: 400, margin: '0 0 20px', fontStyle: 'italic' }}>Request access or a demo</h2>
                <p style={{ fontSize: '15px', lineHeight: 1.8, color: '#a8bfaa', margin: '0 0 40px' }}>
                    Urban Prospect is in active development. Reach out to discuss access,
                    custom coverage areas, or integration with your existing investment workflow.
                </p>

                {status === 'sent' ? (
                    <div style={{ background: 'rgba(123,196,127,0.1)', border: '1px solid rgba(123,196,127,0.3)', borderRadius: '6px', padding: '24px', color: '#7bc47f', fontSize: '15px' }}>
                        ✓ Message received — we'll be in touch shortly.
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {[
                            { key: 'name', label: 'Name', placeholder: 'Your name', type: 'text' },
                            { key: 'email', label: 'Email', placeholder: 'your@email.com', type: 'email' },
                            { key: 'organisation', label: 'Organisation', placeholder: 'Fund / firm name', type: 'text' },
                        ].map(({ key, label, placeholder, type }) => (
                            <div key={key}>
                                <label style={labelStyle}>{label}</label>
                                <input
                                    type={type}
                                    name={key}
                                    value={form[key]}
                                    onChange={handleChange}
                                    placeholder={placeholder}
                                    style={inputStyle}
                                />
                            </div>
                        ))}
                        <div>
                            <label style={labelStyle}>Message</label>
                            <textarea
                                name="message"
                                value={form.message}
                                onChange={handleChange}
                                placeholder="What are you looking for?"
                                rows={4}
                                style={{ ...inputStyle, resize: 'vertical' }}
                            />
                        </div>
                        {status === 'error' && (
                            <div style={{ color: '#e07070', fontSize: '13px' }}>
                                Please fill in at least your name and email.
                            </div>
                        )}
                        <button
                            onClick={handleSubmit}
                            disabled={status === 'sending'}
                            style={{
                                background: '#7bc47f', color: '#0d1a12', border: 'none',
                                padding: '14px 32px', borderRadius: '4px', fontWeight: 700,
                                fontSize: '13px', letterSpacing: '0.1em', textTransform: 'uppercase',
                                cursor: 'pointer', alignSelf: 'flex-start',
                                opacity: status === 'sending' ? 0.6 : 1,
                            }}
                        >
                            {status === 'sending' ? 'Saving…' : 'Send Message'}
                        </button>
                    </div>
                )}
            </section>

            {/* Footer */}
            <footer style={{
                padding: '32px 48px', borderTop: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                color: '#4a5e4c', fontSize: '12px',
            }}>
                <div>Urban Prospect · Central Italy</div>
                <div>Built on Copernicus, ISTAT & OSRM open data</div>
            </footer>
        </div>
    )
}
