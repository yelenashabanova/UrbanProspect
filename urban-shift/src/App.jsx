import { useState, useEffect } from 'react'
import MapView from './components/MapView'
import DetailPanel from './components/DetailPanel'
import RankList from './components/RankList'
import LandingPage from './components/LandingPage'
import neighborhoods from './data/lazio_neighborhoods.json'

export default function App() {
  const [selected, setSelected] = useState(null)
  const [showLanding, setShowLanding] = useState(true)

  // Toggle overflow hidden on body so landing page can scroll, map cannot
  useEffect(() => {
    if (showLanding) {
      document.body.classList.remove('map-active')
    } else {
      document.body.classList.add('map-active')
    }
    return () => document.body.classList.remove('map-active')
  }, [showLanding])

  const sorted = [...neighborhoods].sort((a, b) => b.prospectScore - a.prospectScore)

  if (showLanding) {
    return <LandingPage onEnter={() => setShowLanding(false)} />
  }

  return (
    <div className="app">
      <RankList
        neighborhoods={sorted}
        selectedId={selected?.id}
        onSelect={setSelected}
        onAbout={() => setShowLanding(true)}
      />
      <div className="map-container">
        <MapView
          neighborhoods={neighborhoods}
          selectedId={selected?.id}
          onSelect={setSelected}
        />
      </div>
      <DetailPanel
        neighborhood={selected}
        onClose={() => setSelected(null)}
        onAbout={() => setShowLanding(true)}
      />
    </div>
  )
}
