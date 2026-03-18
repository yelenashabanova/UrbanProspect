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
| **Drive Time to Rome** | OSRM routing API | Live | 10% | Inverted — closer = better connectivity |

All four indicators are independently **min-max normalised to [0–100]** before combining, so no single signal dominates due to its unit or magnitude.

### Formula

```python
Prospect Score = 0.35 × (100 − imd_norm)
              + 0.25 × tcd_norm
              + 0.30 × pop_norm
              + 0.10 × access_norm
```

### Supplementary data (not in score)

| Data | Source | Use |
|------|--------|-----|
| Hospitals & clinics | OpenStreetMap / Overpass API | Infrastructure filter |
| Schools & universities | OpenStreetMap / Overpass API | Infrastructure filter |
| Railway stations | OpenStreetMap / Overpass API | Infrastructure filter |

---

## Study area

**4 regions · 1,048 municipalities**

| Region | N comuni | Avg IMD | Avg Score |
|--------|----------|---------|-----------|
| Lazio | 378 | 3.0% | 62.0 |
| Toscana | 273 | 3.6% | 60.4 |
| Umbria | 92 | 1.8% | 63.0 |
| Abruzzo | 305 | 2.5% | 60.5 |

---

## Features

- **Landing page** — product overview, methodology, contact form (saves to Google Sheets)
- **Interactive map** — 1,048 comuni coloured by Prospect Score (purple=low, green=high)
- **Ranked sidebar** — full leaderboard with sort (highest/lowest) and filters
- **Filters** — by region, minimum score, and infrastructure thresholds (hospitals, schools, railway stations)
- **Detail panel** — score, indicator breakdown with bars, infrastructure counts, explanation text, data sources
- **Tooltip on hover** — comune name, Prospect Score, all 4 indicator values

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + Vite |
| Map | Leaflet |
| Geo processing | Python · GeoPandas · Rasterio · Rasterstats · SciPy |
| Routing | OSRM public API |
| Infrastructure | OpenStreetMap via Overpass API |
| Population | ISTAT Demo (province-level CSVs) |
| Raster data | Copernicus HRL IMD + TCD 2021 (10 m, EPSG:3035) |
| Deployment | GitHub Pages via GitHub Actions |

---

## Running locally

```bash
cd urban-shift
npm install
npm run dev          # local dev server at http://localhost:5173/UrbanProspect/
```

Re-run the data pipeline (Python venv required):

```bash
# From repo root
python scripts/process_data.py
```

Requires: `geopandas rasterio rasterstats scipy requests`

Drive times and OSM infrastructure are cached after first run — subsequent runs are fast.

---

## Project structure

```
UrbanAnalytics/
├── scripts/
│   └── process_data.py          # ETL pipeline
├── data/
│   ├── raw/
│   │   ├── copernicus_imperviousness_2021/
│   │   ├── copernicus_treecoverage_2021/
│   │   ├── istat_admin_boundaries_2025/
│   │   ├── pop_2023/
│   │   └── pop_2025/
│   └── processed/               # generated outputs
│       ├── lazio_neighborhoods.json
│       ├── municipalities.geojson
│       ├── drive_times.csv      # cached
│       └── osm_infrastructure.csv # cached
└── urban-shift/                 # React app
    ├── src/
    │   ├── components/
    │   │   ├── LandingPage.jsx
    │   │   ├── MapView.jsx
    │   │   ├── DetailPanel.jsx
    │   │   └── RankList.jsx
    │   └── data/
    │       └── lazio_neighborhoods.json
    └── public/
        └── municipalities.geojson
```

---

## Data & security

- No personal data collected · no user accounts · no API keys in client code
- All source data is open and public (Copernicus Land Monitoring, ISTAT, OpenStreetMap, OSRM)
- Raw raster files are not committed to the repository
- Contact form submissions are stored in a private Google Sheet via Apps Script

---

*Urban Prospect is a portfolio-stage product using open data. Not intended for financial or investment advice.*
