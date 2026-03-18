"""
process_data.py — Urban Prospect ETL pipeline  (v2)
Regions: Toscana (9), Umbria (10), Lazio (12), Abruzzo (13)

Prospect Score = IMD_WEIGHT  * (100 − imd_norm)   ← low sealing   = good
               + TCD_WEIGHT  * tcd_norm             ← high green    = good
               + POP_WEIGHT  * pop_norm             ← pop growth    = good
               + ACCESS_WEIGHT * access_norm        ← short drive   = good

Each raw value is independently min-max normalised to [0, 100] before combining.
"""

import os, glob, json, time, warnings
import numpy as np
import pandas as pd
import geopandas as gpd
import requests
import rasterio
from rasterio.merge import merge
from rasterstats import zonal_stats
from shapely.geometry import box
from scipy.stats import percentileofscore, linregress

warnings.filterwarnings("ignore")

# ── paths ────────────────────────────────────────────────────────────────────
BASE    = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(BASE, "data/processed")
os.makedirs(OUT_DIR, exist_ok=True)

COMUNI_SHP      = os.path.join(BASE, "data/raw/istat_admin_boundaries_2025/Com01012025/Com01012025_WGS84.shp")
IMD_DIR         = os.path.join(BASE, "data/raw/copernicus_imperviousness_2021")
TCD_DIR         = os.path.join(BASE, "data/raw/copernicus_treecoverage_2021/extracted")
OUT_GEOJSON     = os.path.join(OUT_DIR, "municipalities.geojson")
OUT_JSON        = os.path.join(OUT_DIR, "lazio_neighborhoods.json")
OUT_INSIGHTS    = os.path.join(OUT_DIR, "lazio_insights.json")
DRIVE_CACHE_CSV = os.path.join(OUT_DIR, "drive_times.csv")

# ── regions to include ───────────────────────────────────────────────────────
TARGET_REGIONS = {9: "Toscana", 10: "Umbria", 12: "Lazio", 13: "Abruzzo"}

# ── score weights  (must sum to 1.0) ─────────────────────────────────────────
IMD_WEIGHT    = 0.35   # low imperviousness → opportunity
TCD_WEIGHT    = 0.25   # high tree cover    → desirability
POP_WEIGHT    = 0.30   # population growth  → demand signal
ACCESS_WEIGHT = 0.10   # drive time to Rome → connectivity
assert round(IMD_WEIGHT + TCD_WEIGHT + POP_WEIGHT + ACCESS_WEIGHT, 10) == 1.0, \
    "Weights must sum to 1.0"

# ── Rome centroid (Piazza Venezia) for drive-time calculations ───────────────
ROME_LON, ROME_LAT = 12.4822, 41.8956


# ── helpers ──────────────────────────────────────────────────────────────────
def mosaic_tiles(tif_dir, bbox_3035):
    # Search recursively for all .tif files under the directory
    tiles = sorted(
        f for f in glob.glob(os.path.join(tif_dir, "**", "*.tif"), recursive=True)
        if " " not in os.path.basename(f)   # skip macOS duplicate files like "file 2.tif"
    )
    matched = [t for t in tiles
               if bbox_3035.intersects(box(*rasterio.open(t).bounds))]
    print(f"    {len(matched)}/{len(tiles)} tiles overlap bbox")
    if not matched:
        return None, None
    srcs = [rasterio.open(t) for t in matched]
    mosaic, transform = merge(srcs)
    [s.close() for s in srcs]
    return mosaic[0], transform


def pct_rank(arr):
    return np.array([percentileofscore(arr, v, kind="rank") for v in arr])


def minmax_norm(arr):
    """Normalise array to [0, 100]. Returns 50 everywhere if all values equal."""
    lo, hi = np.nanmin(arr), np.nanmax(arr)
    if hi == lo:
        return np.full_like(arr, 50.0, dtype=float)
    return (arr - lo) / (hi - lo) * 100.0


# ── 1. Load comuni, filter to target regions ──────────────────────────────────
print("Loading ISTAT comuni shapefile …")
comuni = gpd.read_file(COMUNI_SHP)
name_col = next(c for c in ["COMUNE", "DEN_COM"] if c in comuni.columns)
id_col   = next(c for c in ["PRO_COM_T", "PRO_COM"] if c in comuni.columns)
reg_col  = next(c for c in ["COD_REG", "REGIONE"] if c in comuni.columns)
prov_col = next((c for c in ["COD_PROV", "COD_PRO"] if c in comuni.columns), None)

study = comuni[comuni[reg_col].isin(TARGET_REGIONS.keys())].copy()
study["region_name"] = study[reg_col].map(TARGET_REGIONS)
print(f"  Comuni in study area: {len(study)}")
for code, name in TARGET_REGIONS.items():
    n = (study[reg_col] == code).sum()
    print(f"    {name}: {n}")

study_3035 = study.to_crs(3035)
bbox_3035  = box(*study_3035.total_bounds)
bbox_wgs84 = study.to_crs(4326).total_bounds   # [minx, miny, maxx, maxy] in WGS84


# ── 2. IMD zonal statistics ───────────────────────────────────────────────────
print("\nProcessing IMD (Imperviousness Density) …")
imd_mosaic, imd_tf = mosaic_tiles(IMD_DIR, bbox_3035)

imd_stats = zonal_stats(study_3035, imd_mosaic, affine=imd_tf,
                        stats=["mean", "std"], nodata=255, all_touched=False)
study_3035["imd_mean"] = [round(s["mean"], 2) if s["mean"] is not None else None for s in imd_stats]
study_3035["imd_std"]  = [round(s["std"],  2) if s["std"]  is not None else None for s in imd_stats]


# ── 3. TCD zonal statistics (with fallback) ───────────────────────────────────
print("\nProcessing TCD (Tree Cover Density) …")
tcd_mosaic, tcd_tf = mosaic_tiles(TCD_DIR, bbox_3035)

if tcd_mosaic is not None:
    tcd_stats = zonal_stats(study_3035, tcd_mosaic, affine=tcd_tf,
                            stats=["mean"], nodata=255, all_touched=False)
    study_3035["tcd_raw"] = [s["mean"] for s in tcd_stats]
    covered = study_3035["tcd_raw"].notna().sum()
    print(f"    {covered}/{len(study_3035)} comuni have direct TCD coverage")
else:
    study_3035["tcd_raw"] = None
    covered = 0

valid = study_3035[study_3035["imd_mean"].notna()].copy()

if covered >= 10:
    known = valid[valid["tcd_raw"].notna()]
    slope, intercept, r, *_ = linregress(known["imd_mean"], known["tcd_raw"])
    print(f"    TCD regression: slope={slope:.2f} intercept={intercept:.1f} R²={r**2:.3f}")
    valid["tcd_mean"] = valid.apply(
        lambda row: round(row["tcd_raw"], 2) if (row["tcd_raw"] is not None and not np.isnan(row["tcd_raw"]))
                    else round(float(np.clip(intercept + slope * row["imd_mean"], 0, 100)), 2),
        axis=1
    )
    valid["tcd_source"] = valid["tcd_raw"].apply(
        lambda x: "measured" if (x is not None and not np.isnan(x)) else "modelled")
else:
    print("    No TCD tile coverage — using literature model (TCD ≈ 55 − 0.45·IMD)")
    valid["tcd_mean"]   = (55 - 0.45 * valid["imd_mean"]).clip(0, 100).round(2)
    valid["tcd_source"] = "modelled"


# ── 4. Population Growth Index (local CSVs from demo.istat.it) ───────────────
print("\nLoading population data from local CSV files …")

POP_2025_DIR = os.path.join(BASE, "data/raw/pop_2025")
POP_2023_DIR = os.path.join(BASE, "data/raw/pop_2023")


def load_pop_dir(folder):
    """Read all POSAS CSV files in a folder, return DataFrame with id + totale.
    Files are semicolon-separated, have a title on row 0, columns on row 1,
    and one row per age group — so we sum Totale by comune code."""
    frames = []
    for fpath in sorted(glob.glob(os.path.join(folder, "*.csv"))):
        for enc in ("utf-8-sig", "latin1", "utf-8"):
            try:
                df = pd.read_csv(fpath, dtype=str, encoding=enc,
                                 sep=";", skiprows=1)
                df.columns = [c.strip().strip('"') for c in df.columns]
                # Find comune code column (skip province-level files)
                code_col = next((c for c in df.columns
                                 if "codice comune" in c.lower()), None)
                tot_col  = next((c for c in df.columns
                                 if c.strip().lower() == "totale"), None)
                if code_col and tot_col:
                    tmp = df[[code_col, tot_col]].copy()
                    tmp.columns = ["id", "totale"]
                    tmp["id"] = tmp["id"].astype(str).str.strip().str.strip('"').str.zfill(6)
                    tmp["totale"] = pd.to_numeric(
                        tmp["totale"].astype(str).str.strip().str.strip('"')
                        .str.replace(".", "", regex=False)
                        .str.replace(",", "", regex=False),
                        errors="coerce"
                    )
                    # Sum all age rows per comune to get total population
                    agg = tmp.groupby("id")["totale"].sum().reset_index()
                    frames.append(agg)
                break
            except Exception:
                continue
    if not frames:
        return pd.DataFrame(columns=["id", "totale"])
    return pd.concat(frames, ignore_index=True)


try:
    pop25 = load_pop_dir(POP_2025_DIR)
    pop23 = load_pop_dir(POP_2023_DIR)
    print(f"    Loaded {len(pop25)} comuni for 2025, {len(pop23)} comuni for 2023")

    merged = pop23[["id", "totale"]].merge(
        pop25[["id", "totale"]], on="id", suffixes=("_2023", "_2025")
    )
    merged["pop_growth_pct"] = (
        (merged["totale_2025"] - merged["totale_2023"]) / merged["totale_2023"] * 100
    ).round(2)
    pop_lookup = merged.set_index("id")["pop_growth_pct"].to_dict()
    print(f"    Population growth computed for {len(pop_lookup)} municipalities")

except Exception as e:
    print(f"    WARNING: failed to load population CSVs ({e}). pop_growth_pct will be 0.")
    pop_lookup = {}

# Join population growth onto the GeoDataFrame; unmatched → NaN
valid["id_str"] = valid[id_col].astype(str).str.zfill(6)
valid["pop_growth_pct"] = valid["id_str"].map(pop_lookup)
matched_pop = valid["pop_growth_pct"].notna().sum()
print(f"    Joined pop_growth_pct to {matched_pop}/{len(valid)} comuni")

# Fill remaining NaNs with 0 (neutral — no growth data available)
valid["pop_growth_pct"] = valid["pop_growth_pct"].fillna(0.0)


# ── 5. Accessibility Score (OSRM drive time to Rome) ─────────────────────────
print("\nComputing accessibility (drive time to Rome) …")

def get_drive_minutes(lon, lat, retries=3):
    """Return drive time in minutes from (lon, lat) to Piazza Venezia, Rome."""
    url = (
        f"https://router.project-osrm.org/route/v1/driving/"
        f"{lon},{lat};{ROME_LON},{ROME_LAT}?overview=false"
    )
    for attempt in range(retries):
        try:
            r = requests.get(url, timeout=15)
            r.raise_for_status()
            data = r.json()
            if data.get("code") == "Ok":
                return data["routes"][0]["duration"] / 60.0
        except Exception:
            if attempt < retries - 1:
                time.sleep(1.0 * (attempt + 1))
    return None


# Load from cache if it exists
if os.path.exists(DRIVE_CACHE_CSV):
    print(f"    Loading drive times from cache: {DRIVE_CACHE_CSV}")
    dt_cache = pd.read_csv(DRIVE_CACHE_CSV, dtype={"id": str})
    dt_lookup = dt_cache.set_index("id")["drive_min"].to_dict()
else:
    print(f"    No cache found — querying OSRM for {len(valid)} municipalities (~2–3 min) …")
    out_wgs_tmp = valid.to_crs(4326)
    dt_records  = []
    for i, (idx, row) in enumerate(out_wgs_tmp.iterrows()):
        centroid = row.geometry.centroid
        minutes  = get_drive_minutes(centroid.x, centroid.y)
        dt_records.append({"id": str(row["id_str"]), "drive_min": minutes})
        time.sleep(0.1)   # polite rate limiting
        if (i + 1) % 50 == 0:
            print(f"      {i + 1}/{len(valid)} …")
    dt_df = pd.DataFrame(dt_records)
    dt_df.to_csv(DRIVE_CACHE_CSV, index=False)
    print(f"    Saved drive time cache: {DRIVE_CACHE_CSV}")
    dt_lookup = dt_df.set_index("id")["drive_min"].to_dict()

valid["drive_min"] = valid["id_str"].map(dt_lookup)
matched_acc = valid["drive_min"].notna().sum()
print(f"    Joined drive_min to {matched_acc}/{len(valid)} comuni")

# Fill missing drive times with median (graceful fallback)
median_drive = valid["drive_min"].median()
valid["drive_min"] = valid["drive_min"].fillna(median_drive).round(1)


# ── 5b. Infrastructure Score (OSM via Overpass API — per-category bulk queries) ─
print("\nFetching infrastructure data from OpenStreetMap (Overpass API) …")

OSM_CACHE_CSV = os.path.join(OUT_DIR, "osm_infrastructure.csv")
OVERPASS_URL  = "https://overpass-api.de/api/interpreter"

def overpass_bulk(bbox_str, amenities):
    """Fetch all nodes for a list of amenities in one bbox using GET. Returns list of elements."""
    tags = "".join(f'node["amenity"="{a}"]({bbox_str});' for a in amenities)
    query = f"[out:json][timeout:120];({tags});out;"
    r = requests.get(OVERPASS_URL, params={"data": query}, timeout=150)
    r.raise_for_status()
    return r.json().get("elements", [])

if os.path.exists(OSM_CACHE_CSV):
    print(f"    Loading OSM infrastructure from cache: {OSM_CACHE_CSV}")
    osm_df = pd.read_csv(OSM_CACHE_CSV, dtype={"id": str})
    osm_lookup = osm_df.set_index("id").to_dict(orient="index")
else:
    from shapely.geometry import Point
    b = bbox_wgs84  # [minx, miny, maxx, maxy]
    bbox_str = f"{b[1]:.3f},{b[0]:.3f},{b[3]:.3f},{b[2]:.3f}"  # S,W,N,E

    osm_rows = []
    query_groups = [
        (["hospital", "clinic"],              "hospital"),
        (["school", "university", "college"], "school"),
    ]
    for amenities, cat in query_groups:
        print(f"    Querying {cat} features …")
        try:
            elements = overpass_bulk(bbox_str, amenities)
            print(f"      → {len(elements)} features")
            for el in elements:
                lat = el.get("lat")
                lon = el.get("lon")
                if lat and lon:
                    osm_rows.append({"cat": cat, "lat": lat, "lon": lon})
            time.sleep(2)
        except Exception as e:
            print(f"      WARNING: {cat} query failed ({e}), skipping")

    # Railway stations use a different OSM key (railway=station, not amenity=)
    print(f"    Querying railway stations …")
    try:
        rail_query = f"[out:json][timeout:120];node['railway'='station']({bbox_str});out;"
        r = requests.get(OVERPASS_URL, params={"data": rail_query}, timeout=150)
        r.raise_for_status()
        rail_elements = r.json().get("elements", [])
        print(f"      → {len(rail_elements)} features")
        for el in rail_elements:
            lat = el.get("lat")
            lon = el.get("lon")
            if lat and lon:
                osm_rows.append({"cat": "transit", "lat": lat, "lon": lon})
        time.sleep(2)
    except Exception as e:
        print(f"      WARNING: railway query failed ({e}), skipping")

    if osm_rows:
        osm_gdf = gpd.GeoDataFrame(
            osm_rows,
            geometry=[Point(r["lon"], r["lat"]) for r in osm_rows],
            crs=4326
        )
        valid_wgs = valid.to_crs(4326)[["id_str", "geometry"]].copy()
        joined = gpd.sjoin(osm_gdf, valid_wgs, how="left", predicate="within")
        counts = (joined.groupby(["id_str", "cat"])
                        .size().unstack(fill_value=0).reset_index())
        for col in ["hospital", "school", "transit"]:
            if col not in counts.columns:
                counts[col] = 0
        counts = counts.rename(columns={
            "id_str": "id", "hospital": "hospitals",
            "school": "schools", "transit": "transit"
        })
        osm_df = (valid[["id_str"]].rename(columns={"id_str": "id"})
                  .merge(counts[["id", "hospitals", "schools", "transit"]],
                         on="id", how="left")
                  .fillna(0)
                  .astype({"hospitals": int, "schools": int, "transit": int}))
    else:
        print("    WARNING: no OSM data retrieved. Infrastructure will be 0.")
        osm_df = valid[["id_str"]].rename(columns={"id_str": "id"}).copy()
        osm_df["hospitals"] = 0
        osm_df["schools"]   = 0
        osm_df["transit"]   = 0

    osm_df.to_csv(OSM_CACHE_CSV, index=False)
    print(f"    Saved OSM cache: {OSM_CACHE_CSV}")
    osm_lookup = osm_df.set_index("id").to_dict(orient="index")

valid["osm_hospitals"] = valid["id_str"].map(lambda x: osm_lookup.get(x, {}).get("hospitals", 0))
valid["osm_schools"]   = valid["id_str"].map(lambda x: osm_lookup.get(x, {}).get("schools",   0))
valid["osm_transit"]   = valid["id_str"].map(lambda x: osm_lookup.get(x, {}).get("transit",   0))
valid["osm_infra_total"] = valid["osm_hospitals"] + valid["osm_schools"] + valid["osm_transit"]
print(f"    OSM infra joined: hospitals/schools/transit totals {valid['osm_hospitals'].sum():.0f}/{valid['osm_schools'].sum():.0f}/{valid['osm_transit'].sum():.0f}")


# ── 6. Prospect Score (cross-regional percentile + 4-component composite) ─────
print("\nComputing Prospect Score …")

imd_arr = valid["imd_mean"].values
tcd_arr = valid["tcd_mean"].values
pop_arr = valid["pop_growth_pct"].values
drv_arr = valid["drive_min"].values

# Percentile ranks (retained for backwards compat with existing GeoJSON fields)
imd_pct = pct_rank(imd_arr)
tcd_pct = pct_rank(tcd_arr)

valid["imd_pct"] = np.round(imd_pct, 1)
valid["tcd_pct"] = np.round(tcd_pct, 1)

# Min-max normalised scores (0–100); IMD is inverted (lower sealing = better)
imd_norm    = minmax_norm(imd_arr)
tcd_norm    = minmax_norm(tcd_arr)
pop_norm    = minmax_norm(pop_arr)
access_norm = minmax_norm(1.0 / np.maximum(drv_arr, 1.0))  # shorter = better

valid["imd_score"]    = np.round(imd_norm, 1)
valid["tcd_score"]    = np.round(tcd_norm, 1)
valid["pop_score"]    = np.round(pop_norm, 1)
valid["access_score"] = np.round(access_norm, 1)

valid["prospectScore"] = np.round(
    IMD_WEIGHT    * (100 - imd_norm)   # inverted: low sealing → high contribution
    + TCD_WEIGHT  * tcd_norm
    + POP_WEIGHT  * pop_norm
    + ACCESS_WEIGHT * access_norm,
    1
)


# ── 7. Statistics & insights ──────────────────────────────────────────────────
print("\n" + "═"*65)
print("CENTRAL ITALY (4 REGIONS) — Urban Prospect v2 Summary")
print("═"*65)

imd   = valid["imd_mean"]
tcd   = valid["tcd_mean"]
score = valid["prospectScore"]
pop   = valid["pop_growth_pct"]
drv   = valid["drive_min"]

print(f"\n{'Indicator':<28} {'Min':>7} {'p25':>7} {'Median':>7} {'p75':>7} {'Max':>7}")
print("─"*65)
for label, col in [
    ("IMD mean (%)", imd), ("TCD mean (%)", tcd),
    ("Pop growth (%)", pop), ("Drive time (min)", drv),
    ("Prospect Score", score)
]:
    print(f"  {label:<26} {col.min():>7.1f} {col.quantile(.25):>7.1f} "
          f"{col.median():>7.1f} {col.quantile(.75):>7.1f} {col.max():>7.1f}")

print("\n  Per-region averages:")
for code, rname in TARGET_REGIONS.items():
    mask = valid[reg_col] == code
    rv = valid[mask]
    if len(rv) == 0:
        continue
    print(f"    {rname:<12}: n={len(rv):>3}  "
          f"IMD={rv['imd_mean'].mean():5.1f}%  "
          f"TCD={rv['tcd_mean'].mean():5.1f}%  "
          f"Pop={rv['pop_growth_pct'].mean():+6.1f}%  "
          f"Drive={rv['drive_min'].mean():5.0f}min  "
          f"Score={rv['prospectScore'].mean():5.1f}")

sorted_v = valid.copy()
sorted_v["_name"] = valid[name_col].values

print("\n  Top 10:")
for _, r in sorted_v.nlargest(10, "prospectScore").iterrows():
    print(f"    {r['_name']:<28} {r['region_name']:<12} "
          f"IMD={r['imd_mean']:5.1f}%  TCD~={r['tcd_mean']:5.1f}%  "
          f"Pop={r['pop_growth_pct']:+6.1f}%  "
          f"Drive={r['drive_min']:5.0f}min  Score={r['prospectScore']:5.1f}")

print("\n  Bottom 10:")
for _, r in sorted_v.nsmallest(10, "prospectScore").iterrows():
    print(f"    {r['_name']:<28} {r['region_name']:<12} "
          f"IMD={r['imd_mean']:5.1f}%  TCD~={r['tcd_mean']:5.1f}%  "
          f"Pop={r['pop_growth_pct']:+6.1f}%  "
          f"Drive={r['drive_min']:5.0f}min  Score={r['prospectScore']:5.1f}")

insights = {
    "regions": list(TARGET_REGIONS.values()),
    "n_comuni": int(len(valid)),
    "bbox_wgs84": list(map(float, bbox_wgs84)),
    "score_version": "v2",
    "weights": {
        "imd":    IMD_WEIGHT,
        "tcd":    TCD_WEIGHT,
        "pop":    POP_WEIGHT,
        "access": ACCESS_WEIGHT,
    },
    "imd":   {"min": float(imd.min()),   "median": float(imd.median()),   "max": float(imd.max())},
    "tcd":   {"min": float(tcd.min()),   "median": float(tcd.median()),   "max": float(tcd.max())},
    "pop":   {"min": float(pop.min()),   "median": float(pop.median()),   "max": float(pop.max())},
    "drive": {"min": float(drv.min()),   "median": float(drv.median()),   "max": float(drv.max())},
    "score": {"min": float(score.min()), "median": float(score.median()), "max": float(score.max())},
    "by_region": {
        rname: {
            "n":          int((valid[reg_col] == code).sum()),
            "avg_imd":    float(valid.loc[valid[reg_col] == code, "imd_mean"].mean()),
            "avg_tcd":    float(valid.loc[valid[reg_col] == code, "tcd_mean"].mean()),
            "avg_pop":    float(valid.loc[valid[reg_col] == code, "pop_growth_pct"].mean()),
            "avg_drive":  float(valid.loc[valid[reg_col] == code, "drive_min"].mean()),
            "avg_score":  float(valid.loc[valid[reg_col] == code, "prospectScore"].mean()),
        }
        for code, rname in TARGET_REGIONS.items()
        if (valid[reg_col] == code).sum() > 0
    },
}
with open(OUT_INSIGHTS, "w") as f:
    json.dump(insights, f, indent=2, ensure_ascii=False)
print(f"\n  Saved: {OUT_INSIGHTS}")
print("═"*65)


# ── 8. Export GeoJSON ─────────────────────────────────────────────────────────
print("\nExporting GeoJSON …")
out_wgs = valid.to_crs(4326)
out_wgs["geometry"] = out_wgs["geometry"].simplify(0.001, preserve_topology=True)

keep = [
    id_col, name_col, "region_name",
    "imd_mean", "imd_std", "tcd_mean", "tcd_source",
    "imd_pct", "tcd_pct",
    "pop_growth_pct", "drive_min",
    "osm_hospitals", "osm_schools", "osm_transit", "osm_infra_total",
    "imd_score", "tcd_score", "pop_score", "access_score",
    "prospectScore", "geometry"
]
out_gdf = out_wgs[[c for c in keep if c in out_wgs.columns]].copy()
out_gdf = out_gdf.rename(columns={id_col: "id", name_col: "name"})
out_gdf["id"] = out_gdf["id"].astype(str)
out_gdf.to_file(OUT_GEOJSON, driver="GeoJSON")
print(f"  Saved: {OUT_GEOJSON}  ({len(out_gdf)} features)")


# ── 9. Export neighborhoods JSON ──────────────────────────────────────────────
print("Exporting neighborhoods JSON …")

score_min = float(out_gdf["prospectScore"].min())
score_max = float(out_gdf["prospectScore"].max())
neighborhoods = []

for _, row in out_gdf.iterrows():
    imd_v  = float(row["imd_mean"])
    tcd_v  = float(row["tcd_mean"])
    sc_v   = float(row["prospectScore"])
    imd_p  = float(row["imd_pct"])
    tcd_p  = float(row["tcd_pct"])
    pop_v  = float(row.get("pop_growth_pct", 0.0))
    drv_v  = float(row.get("drive_min", float("nan")))
    imd_s  = float(row.get("imd_score", 0.0))
    tcd_s  = float(row.get("tcd_score", 0.0))
    pop_s  = float(row.get("pop_score", 0.0))
    acc_s  = float(row.get("access_score", 0.0))
    hosp_v = int(row.get("osm_hospitals", 0))
    sch_v  = int(row.get("osm_schools",   0))
    trns_v = int(row.get("osm_transit",   0))
    name_v = str(row["name"])
    id_v   = str(row["id"])
    reg_v  = str(row.get("region_name", ""))
    src    = str(row.get("tcd_source", "modelled"))

    # Narrative drivers
    signals = []
    if imd_p <= 33: signals.append("low soil sealing")
    elif imd_p >= 67: signals.append("high soil sealing")
    if tcd_p >= 67: signals.append("strong tree cover")
    elif tcd_p <= 33: signals.append("limited tree cover")
    if pop_v > 2:  signals.append(f"growing population (+{pop_v:.1f}% 2023–2025)")
    elif pop_v < -2: signals.append(f"declining population ({pop_v:.1f}% 2023–2025)")
    if not np.isnan(drv_v):
        if drv_v < 30:   signals.append(f"close to Rome ({drv_v:.0f} min drive)")
        elif drv_v > 90: signals.append(f"remote from Rome ({drv_v:.0f} min drive)")
    drivers = ", ".join(signals) if signals else "moderate structural signals"

    explanation = (
        f"{name_v} ({reg_v}) is characterised by {drivers}. "
        f"It has {imd_v:.0f}% sealed surface and {tcd_v:.0f}% tree cover. "
        f"Population changed {pop_v:+.1f}% between 2023 and 2025. "
        f"{'Drive time to Rome: ' + f'{drv_v:.0f} min.' if not np.isnan(drv_v) else ''} "
        f"Within the 4-region study area, its imperviousness ranks at the "
        f"{imd_p:.0f}th percentile and tree cover at the {tcd_p:.0f}th percentile."
    ).strip()

    neighborhoods.append({
        "id":         id_v,
        "name":       name_v,
        "region":     reg_v,
        "prospectScore": round(sc_v, 1),
        "scoreMin":   round(score_min, 1),
        "scoreMax":   round(score_max, 1),
        "explanation": explanation,
        "indicators": [
            {
                "key": "imperviousnessDensity", "label": "Imperviousness Density",
                "value": round(imd_v, 1), "score": round(imd_s, 1),
                "pct": round(imd_p, 1), "unit": "%",
                "weight": IMD_WEIGHT,
                "note": f"Study area {imd_p:.0f}th pct",
            },
            {
                "key": "treeCoverDensity", "label": "Tree Cover Density",
                "value": round(tcd_v, 1), "score": round(tcd_s, 1),
                "pct": round(tcd_p, 1), "unit": "%",
                "weight": TCD_WEIGHT,
                "note": (f"Study area {tcd_p:.0f}th pct"
                         + (" · measured" if src == "measured" else " · modelled")),
            },
            {
                "key": "populationGrowth", "label": "Population Growth",
                "value": round(pop_v, 1), "score": round(pop_s, 1),
                "pct": None, "unit": "%",
                "weight": POP_WEIGHT,
                "note": "ISTAT Censimento 2021",
            },
            {
                "key": "accessibilityRome", "label": "Drive Time to Rome",
                "value": round(drv_v, 0) if not np.isnan(drv_v) else None,
                "score": round(acc_s, 1),
                "pct": None, "unit": " min",
                "weight": ACCESS_WEIGHT,
                "note": "OSRM routing API",
            },
        ],
        "infrastructure": {
            "hospitals":        hosp_v,
            "schools":          sch_v,
            "railway_stations": trns_v,
            "total":            hosp_v + sch_v + trns_v,
        },
    })

neighborhoods.sort(key=lambda x: x["prospectScore"], reverse=True)
with open(OUT_JSON, "w", encoding="utf-8") as f:
    json.dump(neighborhoods, f, ensure_ascii=False, indent=2)
print(f"  Saved: {OUT_JSON}  ({len(neighborhoods)} entries)")

# ── 10. Sync to React data directory ─────────────────────────────────────────
import shutil
REACT_DATA_DIR = os.path.join(BASE, "urban-shift/src/data")
os.makedirs(REACT_DATA_DIR, exist_ok=True)

react_nb  = os.path.join(REACT_DATA_DIR, "lazio_neighborhoods.json")
react_geo = os.path.join(REACT_DATA_DIR, "municipalities.geojson")  # served via public/

shutil.copy2(OUT_JSON, react_nb)
print(f"  Synced → {react_nb}")

# municipalities.geojson is fetched at runtime from /public — copy there too
REACT_PUBLIC_DIR = os.path.join(BASE, "urban-shift/public")
os.makedirs(REACT_PUBLIC_DIR, exist_ok=True)
shutil.copy2(OUT_GEOJSON, os.path.join(REACT_PUBLIC_DIR, "municipalities.geojson"))
print(f"  Synced → {REACT_PUBLIC_DIR}/municipalities.geojson")

print("\nAll done.")
