import { useState, useEffect, useMemo } from 'react'
import MapView from './components/MapView'
import DetailPanel from './components/DetailPanel'
import RankList from './components/RankList'
import LandingPage from './components/LandingPage'
import WeightsPanel from './components/WeightsPanel'
import ComparePanel from './components/ComparePanel'
import neighborhoods from './data/lazio_neighborhoods.json'
import { DEFAULT_WEIGHTS, computeScore } from './utils/score'

export default function App() {
    const [selected, setSelected]         = useState(null)
    const [showLanding, setShowLanding]   = useState(true)
    const [weights, setWeights]           = useState({ ...DEFAULT_WEIGHTS })
    const [compareList, setCompareList]   = useState([])   // 0, 1 or 2 items
    const [showCompare, setShowCompare]   = useState(false)
    const [scoreHistory, setScoreHistory] = useState([])
    const [sidebarOpen, setSidebarOpen]   = useState(true)

    useEffect(() => {
        if (showLanding) document.body.classList.remove('map-active')
        else             document.body.classList.add('map-active')
        return () => document.body.classList.remove('map-active')
    }, [showLanding])

    const scoredNeighborhoods = useMemo(() => {
        return neighborhoods.map(n => ({
            ...n,
            prospectScore: Math.round(computeScore(n, weights) * 10) / 10,
        }))
    }, [weights])

    useEffect(() => {
        const topScore = Math.max(...scoredNeighborhoods.map(n => n.prospectScore))
        setScoreHistory(prev => [...prev.slice(-29), topScore])
    }, [scoredNeighborhoods])

    const sorted = [...scoredNeighborhoods].sort((a, b) => b.prospectScore - a.prospectScore)
    const selectedScored = selected
        ? scoredNeighborhoods.find(n => n.id === selected.id) ?? selected
        : null

    function handleSelect(n) {
        setSelected(n)
        setShowCompare(false)
    }

    // Toggle a comune in/out of compare list
    function handleCompare(n) {
        setCompareList(prev => {
            const already = prev.find(p => p.id === n.id)
            if (already) {
                // Deselect it
                const next = prev.filter(p => p.id !== n.id)
                if (next.length === 0) setShowCompare(false)
                return next
            }
            const next = [...prev, n].slice(-2)
            if (next.length === 2) setShowCompare(true)
            return next
        })
        setSelected(null)
    }

    function handleCloseCompare() {
        setShowCompare(false)
        setCompareList([])   // reset selections
    }

    if (showLanding) {
        return <LandingPage onEnter={() => setShowLanding(false)} />
    }

    const compareIds = new Set(compareList.map(n => n.id))

    return (
        <div className="app">
            {/* Sidebar — collapsible */}
            {sidebarOpen && (
                <RankList
                    neighborhoods={sorted}
                    selectedId={selectedScored?.id}
                    compareIds={compareIds}
                    showCompareButtons={showCompare || compareList.length > 0}
                    onSelect={handleSelect}
                    onCompare={handleCompare}
                    onAbout={() => setShowLanding(true)}
                    onCollapse={() => setSidebarOpen(false)}
                />
            )}

            {/* Collapsed sidebar — just the header strip */}
            {!sidebarOpen && (
                <div style={{
                    width: '48px', height: '100%', flexShrink: 0,
                    background: 'var(--color-surface)',
                    borderRight: '1px solid var(--color-border)',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', paddingTop: '16px', gap: '12px',
                    zIndex: 800,
                }}>
                    {/* Expand button */}
                    <button
                        onClick={() => setSidebarOpen(true)}
                        title="Open sidebar"
                        style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: 'var(--color-accent)', fontSize: '18px', lineHeight: 1,
                            padding: '4px',
                        }}
                    >☰</button>
                </div>
            )}

            <div className="map-container">
                <MapView
                    neighborhoods={scoredNeighborhoods}
                    selectedId={selectedScored?.id}
                    compareIds={compareIds}
                    weights={weights}
                    onSelect={handleSelect}
                    sidebarOpen={sidebarOpen}
                />
                <WeightsPanel
                    weights={weights}
                    onChange={setWeights}
                    scoreHistory={scoreHistory}
                    sidebarOpen={sidebarOpen}
                />
                {showCompare && compareList.length === 2 && (
                    <ComparePanel
                        neighborhoods={compareList.map(c =>
                            scoredNeighborhoods.find(n => n.id === c.id) ?? c
                        )}
                        onClose={handleCloseCompare}
                    />
                )}
            </div>

            <DetailPanel
                neighborhood={selectedScored}
                onClose={() => setSelected(null)}
                onAbout={() => setShowLanding(true)}
                onCompare={handleCompare}
                compareIds={compareIds}
            />
        </div>
    )
}
