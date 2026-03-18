import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import neighborhoods from '../data/lazio_neighborhoods.json'

// Build lookup: id → full neighborhood object
const dataMap = Object.fromEntries(neighborhoods.map(n => [n.id, n]))

// ─── Colour scale ────────────────────────────────────────────────────────────
// Normalise score relative to the ACTUAL data range so all shades are used.
// Purple (lowest) → Orange → Yellow → Green (highest)
const scores = neighborhoods.map(n => n.prospectScore)
const DATA_MIN = Math.min(...scores)
const DATA_MAX = Math.max(...scores)

function scoreToColor(score) {
    // t = 0 at DATA_MIN, t = 1 at DATA_MAX
    const t = Math.max(0, Math.min(1, (score - DATA_MIN) / (DATA_MAX - DATA_MIN)))

    // 4-stop gradient: purple → orange → yellow → forest green
    if (t < 0.33) {
        const t2 = t / 0.33
        const r = Math.round(140 + (230 - 140) * t2)
        const g = Math.round(50 + (100 - 50) * t2)
        const b = Math.round(160 + (30 - 160) * t2)
        return `rgb(${r},${g},${b})`
    } else if (t < 0.66) {
        const t2 = (t - 0.33) / 0.33
        const r = Math.round(230 + (220 - 230) * t2)
        const g = Math.round(100 + (210 - 100) * t2)
        const b = Math.round(30 + (60 - 30) * t2)
        return `rgb(${r},${g},${b})`
    } else {
        const t2 = (t - 0.66) / 0.34
        const r = Math.round(220 + (34 - 220) * t2)
        const g = Math.round(210 + (139 - 210) * t2)
        const b = Math.round(60 + (34 - 60) * t2)
        return `rgb(${r},${g},${b})`
    }
}

export default function MapView({ neighborhoods: data, selectedId, onSelect }) {
    const mapRef = useRef(null)
    const mapInstanceRef = useRef(null)
    const layersRef = useRef({})

    useEffect(() => {
        if (mapInstanceRef.current) return

        const map = L.map(mapRef.current, {
            center: [41.9, 12.9],
            zoom: 8,
            zoomControl: true,
            attributionControl: true,
        })

        L.tileLayer(
            'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png',
            {
                attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/">CARTO</a>',
                subdomains: 'abcd',
                maxZoom: 19,
            }
        ).addTo(map)

        L.tileLayer(
            'https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png',
            { attribution: '', subdomains: 'abcd', maxZoom: 19, pane: 'overlayPane' }
        ).addTo(map)

        mapInstanceRef.current = map

        fetch(`${import.meta.env.BASE_URL}municipalities.geojson`)
            .then(r => r.json())
            .then(geojson => {
                L.geoJSON(geojson, {
                    style: (feature) => {
                        const entry = dataMap[feature.properties.id]
                        const score = entry?.prospectScore ?? ((DATA_MIN + DATA_MAX) / 2)
                        return {
                            fillColor: scoreToColor(score),
                            fillOpacity: 0.78,
                            color: '#ffffff',
                            weight: 0.7,
                            opacity: 0.9,
                        }
                    },
                    onEachFeature: (feature, layer) => {
                        const id = feature.properties.id
                        const entry = dataMap[id]
                        layersRef.current[id] = layer

                        const name = feature.properties.name
                        const score = entry?.prospectScore?.toFixed(1) ?? '–'
                        const imd   = entry?.indicators?.[0]?.value?.toFixed(1) ?? '–'
                        const tcd   = entry?.indicators?.[1]?.value?.toFixed(1)
                        const pop   = entry?.indicators?.[2]?.value
                        const drv   = entry?.indicators?.[3]?.value

                        layer.bindTooltip(
                            `<strong>${name}</strong><br/>` +
                            `Prospect Score: <b>${score}</b><br/>` +
                            `Imperviousness: ${imd}%` +
                            (tcd != null ? `<br/>Tree Cover: ${tcd}%` : '') +
                            (pop != null ? `<br/>Pop. Growth: ${pop > 0 ? '+' : ''}${pop.toFixed(1)}%` : '') +
                            (drv != null ? `<br/>Drive to Rome: ${Math.round(drv)} min` : ''),
                            { sticky: true }
                        )

                        layer.on('click', () => {
                            const neighborhood = data.find(n => n.id === id)
                            if (neighborhood) onSelect(neighborhood)
                        })
                        layer.on('mouseover', function () {
                            if (id !== selectedId) this.setStyle({ fillOpacity: 0.95, weight: 2 })
                        })
                        layer.on('mouseout', function () {
                            if (id !== selectedId) this.setStyle({ fillOpacity: 0.78, weight: 0.7 })
                        })
                    },
                }).addTo(map)
            })
    }, [])

    useEffect(() => {
        Object.entries(layersRef.current).forEach(([id, layer]) => {
            if (id === selectedId) {
                layer.setStyle({ fillOpacity: 0.97, weight: 2.5, color: '#1e2a4a' })
                layer.bringToFront()
            } else {
                layer.setStyle({ fillOpacity: 0.78, weight: 0.7, color: '#ffffff' })
            }
        })
    }, [selectedId])

    return (
        <>
            <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

            {/* Dynamic legend showing actual data range */}
            <div className="map-legend">
                <div className="map-legend__title">Prospect Score</div>
                <div className="map-legend__bar map-legend__bar--rainbow" />
                <div className="map-legend__labels">
                    <span>{DATA_MIN.toFixed(0)}</span>
                    <span>{DATA_MAX.toFixed(0)}</span>
                </div>
            </div>

            <div className={`map-hint${selectedId ? ' hidden' : ''}`}>
                Click a comune to explore
            </div>
        </>
    )
}
