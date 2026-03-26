"""
OMI Price Pipeline for Urban Prospect
Downloads OMI residential price data (2018 S2) and merges into
lazio_neighborhoods.json as a contextual price block.
"""

import json
import pathlib
import requests
import pandas as pd

ROOT = pathlib.Path(__file__).parent.parent
OMI_CSV = ROOT / "data/raw/omi/valori_2018_2.csv"
NEIGHBORHOODS_JSON = ROOT / "urban-shift/src/data/lazio_neighborhoods.json"
COMUNI_URL = "https://raw.githubusercontent.com/matteocontrini/comuni-json/master/comuni.json"
COMUNI_LOCAL = ROOT / "data/raw/omi/comuni.json"
SEMESTER_LABEL = "2018_2"
OUR_REGIONS = {"LAZIO", "TOSCANA", "UMBRIA", "ABRUZZO"}

# ── 1. Load OMI data ─────────────────────────────────────────────────────────
print("Loading OMI CSV...")
df = pd.read_csv(OMI_CSV, dtype=str)

# Normalise decimal commas → dots, convert to float
for col in ["Compr_min", "Compr_max"]:
    df[col] = df[col].str.replace(",", ".", regex=False)
    df[col] = pd.to_numeric(df[col], errors="coerce")

# Filter: our 4 regions, Abitazioni civili (Cod_Tip=20), NORMALE state
res = df[
    df["Regione"].isin(OUR_REGIONS) &
    (df["Cod_Tip"] == "20") &
    (df["Stato"] == "NORMALE") &
    df["Compr_min"].notna() &
    df["Compr_max"].notna() &
    (df["Compr_min"] > 0) &
    (df["Compr_max"] > 0)
].copy()

res["price_mid"] = (res["Compr_min"] + res["Compr_max"]) / 2
print(f"  Residential NORMALE rows: {len(res)}")

# ── 2. Aggregate to comune via Comune_cat (Belfiore code) ────────────────────
print("Aggregating to comune level...")
res["Comune_amm"] = res["Comune_amm"].str.strip()
comune_prices = (
    res.groupby("Comune_amm")
    .agg(
        price_mid=("price_mid", "mean"),
        price_min=("Compr_min", "min"),
        price_max=("Compr_max", "max"),
        price_zones=("Zona", "count"),
        comune_name=("Comune_descrizione", "first"),
    )
    .reset_index()
)
comune_prices[["price_mid", "price_min", "price_max"]] = (
    comune_prices[["price_mid", "price_min", "price_max"]].round(0).astype(int)
)
print(f"  Comuni with price data: {len(comune_prices)}")

# ── 3. Join Belfiore → ISTAT 6-digit code ───────────────────────────────────
print("Loading Belfiore → ISTAT lookup...")
with open(COMUNI_LOCAL, encoding="utf-8") as f:
    comuni_raw = json.load(f)
lookup = pd.DataFrame([
    {"belfiore": c["codiceCatastale"], "istat": c["codice"]}
    for c in comuni_raw
])

prices = comune_prices.merge(lookup, left_on="Comune_amm", right_on="belfiore", how="left")
unmatched = prices["istat"].isna().sum()
print(f"  Unmatched Belfiore codes: {unmatched}")
prices = prices.dropna(subset=["istat"])

# ── 4. Compute value_signal (low / mid / high vs. regional median) ──────────
# Load neighborhoods to get region per ISTAT code
with open(NEIGHBORHOODS_JSON) as f:
    neighborhoods = json.load(f)

region_map = {n["id"]: n["region"] for n in neighborhoods}
prices["region"] = prices["istat"].map(region_map)
prices = prices.dropna(subset=["region"])

# Per-region 25th/75th percentile of price_mid
q25 = prices.groupby("region")["price_mid"].transform(lambda x: x.quantile(0.25))
q75 = prices.groupby("region")["price_mid"].transform(lambda x: x.quantile(0.75))

def value_signal(row):
    if pd.isna(row["price_mid"]):
        return None
    if row["price_mid"] <= q25[row.name]:
        return "low"
    if row["price_mid"] >= q75[row.name]:
        return "high"
    return "mid"

prices["value_signal"] = prices.apply(value_signal, axis=1)

# Show regional stats
print("\nRegional price medians (€/m²):")
for region, grp in prices.groupby("region"):
    print(f"  {region:12s}  median={grp['price_mid'].median():.0f}  "
          f"min={grp['price_min'].min():.0f}  max={grp['price_max'].max():.0f}  "
          f"n={len(grp)}")

# ── 5. Build lookup dict and merge into neighborhoods JSON ───────────────────
print("\nMerging into lazio_neighborhoods.json...")
price_lookup = {
    row["istat"]: {
        "mid":      int(row["price_mid"]),
        "min":      int(row["price_min"]),
        "max":      int(row["price_max"]),
        "zones":    int(row["price_zones"]),
        "signal":   row["value_signal"],
        "semester": SEMESTER_LABEL,
    }
    for _, row in prices.iterrows()
}

matched = 0
missing = 0
for n in neighborhoods:
    pr = price_lookup.get(n["id"])
    if pr:
        n["price"] = pr
        matched += 1
    else:
        n["price"] = None
        missing += 1

print(f"  Matched: {matched}  |  Missing (price=null): {missing}")

# ── 6. Write updated JSON ────────────────────────────────────────────────────
with open(NEIGHBORHOODS_JSON, "w", encoding="utf-8") as f:
    json.dump(neighborhoods, f, ensure_ascii=False, separators=(",", ":"))

print(f"\nDone. Updated: {NEIGHBORHOODS_JSON}")
print(f"Sample (first match):")
sample = next(n for n in neighborhoods if n["price"])
print(f"  {sample['name']} ({sample['id']}): {sample['price']}")
