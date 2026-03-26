# Urban Prospect

> Satellite-powered territorial screening for residential real estate investors.

**Live demo →** [yelenashabanova.github.io/UrbanProspect](https://yelenashabanova.github.io/UrbanProspect/)

---

## What is Urban Prospect?

Urban Prospect ranks 1,048 Italian municipalities across four central regions (Lazio, Toscana, Umbria, Abruzzo) using a transparent **Prospect Score** — an interpretable composite index that surfaces structural signals of residential investment opportunity before they appear in headline prices.

It translates satellite imagery, census data, routing APIs, and OpenStreetMap into a clear, explainable ranking. It is not a price-prediction engine. Its purpose is to reduce uncertainty in early-stage location decisions.

> **Where to look. What is changing. Why it matters.**

---

## Prospect Score — Methodology

### Indicators

| Indicator | Source | Year | Weight | Direction |
|-----------|--------|------|--------|-----------|
| **Imperviousness Density (IMD)** | Copernicus HRL | 2021 · 10 m | 35% | Inverted — low sealing = opportunity |
| **Tree Cover Density (TCD)** | Copernicus HRL | 2021 · 10 m | 25% | Direct — high green = desirability |
| **Population Growth** | ISTAT Demo | 2023–2025 | 30% | Direct — growth = demand signal |
| **Drive Time to Rome** | OSRM routing API | computed | 10% | Inverted — closer = better connectivity |

All four indicators are independently **min-max normalised to [0–100]** before combining, so no single signal dominates due to its unit or magnitude.

### Formula

```
Prospect Score = 0.35 × (100 − imd_norm)
              + 0.25 × tcd_norm
              + 0.30 × pop_norm
              + 0.10 × access_norm
```

Weights are user-adjustable in the interface — see [Customise Weights](#features) below.

### Supplementary data (not in score)

| Data | Source | Use |
|------|--------|-----|
| Hospitals & clinics | OpenStreetMap via Overpass API | Infrastructure filter & detail panel |
| Schools & universities | OpenStreetMap via Overpass API | Infrastructure filter & detail panel |
| Railway stations (`railway=station`) | OpenStreetMap via Overpass API | Infrastructure filter & detail panel |

---

## Study area

**4 regions · 1,048 municipalities**

| Region | Comuni | Avg IMD | Avg Score |
|--------|--------|---------|-----------|
| Lazio | 378 | 3.5% | 65.4 |
| Toscana | 273 | 3.9% | 66.7 |
| Umbria | 92 | 2.3% | 65.9 |
| Abruzzo | 305 | 3.1% | 63.3 |

---

## Features

### Landing page
- Product overview, methodology, and who it's for
- Contact / demo request form — submissions go directly to a private Google Sheet via Apps Script (no backend required)

### Interactive map
- 1,048 comuni coloured by Prospect Score (purple → orange → yellow → green)
- Colour scale normalised to actual data range so the full gradient is always used
- Hover tooltip showing Prospect Score + all 4 indicator values
- Click any comune to open its detail panel

### Ranked sidebar (collapsible)
- Full leaderboard sortable highest → lowest or lowest → highest
- **Region filter** — toggle any combination of Lazio, Toscana, Umbria, Abruzzo
- **Min score slider** — hide everything below a threshold
- **Infrastructure filter** — stepper controls for minimum hospitals, schools, and railway stations
- Collapse button (›) reduces sidebar to a 48px strip; hamburger (☰) reopens it

### Customise Weights panel
- Floating button top-left of the map, opens downward
- Four sliders — one per indicator — with auto-normalisation: move any slider and the others adjust proportionally to keep the total at exactly 100%
- Map recolours and ranking reorders in real time with no page reload
- Live sparkline showing how the top comune's score changes as you adjust
- "Our Default Weights — Why" section explaining the reasoning behind each default
- Reset button restores defaults (35 / 25 / 30 / 10)

### Compare mode
- ⇄ button appears on hover for every rank item, and in the detail panel
- Select any 2 comuni to open a side-by-side overlay: scores, indicator bars, infrastructure counts
- Both compared comuni highlighted on the map
- Click ✓ ⇄ again to deselect; closing the panel resets all selections

### Detail panel
- Score, region, and narrative explanation
- Indicator breakdown with bars and data source labels
- Infrastructure card grid (hospitals / schools / railway stations)
- Collapsible Score breakdown and Data Sources sections
- "Add to Compare" and "About Urban Prospect" action buttons

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + Vite |
| Map | Leaflet + react-leaflet |
| Geo processing | Python · GeoPandas · Rasterio · Rasterstats · SciPy |
| Routing | OSRM public routing API |
| Infrastructure | OpenStreetMap via Overpass API (bulk spatial join) |
| Population | ISTAT Demo province-level CSVs (2023 & 2025) |
| Raster data | Copernicus HRL IMD + TCD 2021 (10 m, EPSG:3035) |
| Contact form | Google Apps Script webhook → Google Sheets |
| Deployment | GitHub Pages via GitHub Actions (auto-deploy on push) |

---

## Running locally

```bash
cd urban-shift
npm install
npm run dev    # → http://localhost:5173/UrbanProspect/
```

Re-run the data pipeline (Python venv required):

```bash
# From repo root
python scripts/process_data.py
```

Required packages: `geopandas rasterio rasterstats scipy requests pandas`

**Caches** — drive times (`drive_times.csv`) and OSM infrastructure (`osm_infrastructure.csv`) are saved to `data/processed/` after first run. Delete them to force a refresh.

---

## Project structure

```
UrbanAnalytics/
├── scripts/
│   └── process_data.py              # Full ETL pipeline
├── data/
│   ├── raw/
│   │   ├── copernicus_imperviousness_2021/
│   │   ├── copernicus_treecoverage_2021/
│   │   ├── istat_admin_boundaries_2025/
│   │   ├── pop_2023/                # ISTAT Demo province CSVs
│   │   └── pop_2025/
│   └── processed/                   # Generated — do not edit manually
│       ├── lazio_neighborhoods.json
│       ├── municipalities.geojson
│       ├── drive_times.csv          # OSRM cache
│       └── osm_infrastructure.csv   # Overpass cache
└── urban-shift/                     # React application
    ├── .github/workflows/
    │   └── deploy.yml               # GitHub Actions deploy
    ├── public/
    │   └── municipalities.geojson   # Served at runtime
    └── src/
        ├── components/
        │   ├── LandingPage.jsx
        │   ├── MapView.jsx
        │   ├── RankList.jsx
        │   ├── DetailPanel.jsx
        │   ├── WeightsPanel.jsx
        │   └── ComparePanel.jsx
        ├── utils/
        │   └── score.js             # Client-side score recalculation
        └── data/
            └── lazio_neighborhoods.json
```

---

## Data pipeline — how it works

1. **Load boundaries** — ISTAT comuni 2025 shapefile, filtered to 4 regions
2. **IMD zonal stats** — Copernicus HRL 2021 tiles → mean imperviousness per comune
3. **TCD zonal stats** — Copernicus HRL 2021 tiles → mean tree cover per comune
4. **Population growth** — ISTAT Demo province CSVs for 2023 and 2025 → % change per comune
5. **Drive times** — OSRM public API, centroid → Piazza Venezia for all 1,048 comuni (cached)
6. **OSM infrastructure** — 3 bulk Overpass queries (hospitals, schools, railway stations) → spatial join per comune (cached)
7. **Score computation** — min-max normalise each indicator → weighted composite
8. **Export** — `municipalities.geojson` + `lazio_neighborhoods.json` → auto-synced to React app

---

## Data & security

- No personal data collected · no user accounts · no API keys in client code
- All source data is open and public (Copernicus Land Monitoring, ISTAT, OpenStreetMap, OSRM)
- Raw raster files (~2 GB) are excluded from the repository via `.gitignore`
- Contact form submissions stored in a private Google Sheet via Apps Script

---

*Urban Prospect is a portfolio-stage product using open data. Not intended for financial or investment advice.*
