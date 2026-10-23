#!/usr/bin/env python3
"""Build the Food Grader product database (SQLite) from Open Food Facts.

Usage:
    python build_db.py --off en.openfoodfacts.org.products.csv.gz [--seed seed_verified.csv] [--out foods.db]

Inputs
  --off   OFF CSV export (.csv or .csv.gz, tab separated). Only rows sold in India are kept.
  --seed  Optional CSV of products you verified against the real pack. These win over OFF
          on a barcode clash and are marked source='verified'.

The OFF file is streamed, so the multi-GB full export is fine.
"""
import argparse
import csv
import gzip
import re
import sqlite3
import sys

csv.field_size_limit(sys.maxsize)

SCHEMA = """
DROP TABLE IF EXISTS products;
CREATE TABLE products (
    id               INTEGER PRIMARY KEY,
    barcode          TEXT UNIQUE,
    name             TEXT NOT NULL,
    brand            TEXT,
    variant          TEXT,
    category         TEXT,
    quantity         TEXT,
    serving_size     TEXT,
    serving_g        REAL,
    ingredients_text TEXT,
    allergens        TEXT,
    -- nutrients per 100 g (g unless noted)
    energy_kcal_100g REAL,
    protein_100g     REAL,
    carbs_100g       REAL,
    sugars_100g      REAL,
    added_sugars_100g REAL,
    fat_100g         REAL,
    sat_fat_100g     REAL,
    trans_fat_100g   REAL,
    fiber_100g       REAL,
    sodium_100g      REAL,
    salt_100g        REAL,
    nutriscore_grade TEXT,
    nova_group       INTEGER,
    additives        TEXT,
    image_url        TEXT,
    source           TEXT NOT NULL,      -- 'verified' | 'off'
    completeness     REAL,               -- 0..1, share of key nutrients present
    search_text      TEXT NOT NULL       -- normalised name/brand/variant for search
);
CREATE INDEX idx_products_brand ON products(brand);
CREATE INDEX idx_products_source ON products(source);
"""

NUTRIENT_COLS = ["energy_kcal_100g", "protein_100g", "carbs_100g", "sugars_100g",
                 "fat_100g", "sat_fat_100g", "fiber_100g", "sodium_100g"]


def normalise(text):
    """Lowercase, '&' -> 'and', strip punctuation, collapse spaces."""
    text = (text or "").lower().replace("&", " and ")
    text = re.sub(r"[^\w\s]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def num(value):
    try:
        v = float(str(value).strip())
        return v if v == v else None
    except (TypeError, ValueError):
        return None


def clean_tags(value):
    """'en:snacks,en:biscuits' -> 'Snacks, Biscuits' (last 2 tags kept = most specific)."""
    parts = [p.split(":", 1)[-1].replace("-", " ").strip().title()
             for p in (value or "").split(",") if p.strip()]
    return ", ".join(parts[-2:])


def completeness(row):
    return round(sum(row.get(c) is not None for c in NUTRIENT_COLS) / len(NUTRIENT_COLS), 2)


def serving_grams(raw_qty, raw_text):
    q = num(raw_qty)
    if q:
        return q
    text = (raw_text or "").lower().strip()
    m = re.search(r"(\d+(?:\.\d+)?)\s*(g|ml)\b", text)
    if m:
        return float(m.group(1))
    # Some contributors enter a bare number such as "16.5"; treat it as grams.
    if re.fullmatch(r"\d+(?:\.\d+)?", text):
        return float(text)
    return None


def open_text(path):
    if path.endswith(".gz"):
        return gzip.open(path, "rt", encoding="utf-8", errors="replace", newline="")
    return open(path, "r", encoding="utf-8", errors="replace", newline="")


def off_rows(path):
    with open_text(path) as fh:
        # OFF exports are tab-separated and unquoted; stray quotes in product text
        # would otherwise make the reader merge many rows into one.
        reader = csv.DictReader(fh, delimiter="\t", quoting=csv.QUOTE_NONE)
        for r in reader:
            countries = (r.get("countries_tags") or r.get("countries") or "").lower()
            if "en:india" not in countries and "india" not in countries.split(","):
                continue
            name = (r.get("product_name") or "").strip()
            barcode = (r.get("code") or "").strip()
            if not name or not barcode:
                continue
            brand = (r.get("brands") or "").split(",")[0].strip()
            sodium = num(r.get("sodium_100g"))
            salt = num(r.get("salt_100g"))
            if sodium is None and salt is not None:
                sodium = round(salt / 2.5, 4)
            if salt is None and sodium is not None:
                salt = round(sodium * 2.5, 4)
            kcal = num(r.get("energy-kcal_100g"))
            if kcal is None and num(r.get("energy-kj_100g")) is not None:
                kcal = round(num(r["energy-kj_100g"]) / 4.184, 1)
            row = dict(
                barcode=barcode, name=name, brand=brand, variant=None,
                category=clean_tags(r.get("categories_tags")),
                quantity=(r.get("quantity") or "").strip() or None,
                serving_size=(r.get("serving_size") or "").strip() or None,
                serving_g=serving_grams(r.get("serving_quantity"), r.get("serving_size")),
                ingredients_text=(r.get("ingredients_text") or "").strip() or None,
                allergens=clean_tags(r.get("allergens")) or None,
                energy_kcal_100g=kcal, protein_100g=num(r.get("proteins_100g")),
                carbs_100g=num(r.get("carbohydrates_100g")), sugars_100g=num(r.get("sugars_100g")),
                added_sugars_100g=num(r.get("added-sugars_100g")),
                fat_100g=num(r.get("fat_100g")), sat_fat_100g=num(r.get("saturated-fat_100g")),
                trans_fat_100g=num(r.get("trans-fat_100g")), fiber_100g=num(r.get("fiber_100g")),
                sodium_100g=sodium, salt_100g=salt,
                nutriscore_grade=(r.get("nutriscore_grade") or "").lower() or None,
                nova_group=int(num(r.get("nova_group"))) if num(r.get("nova_group")) else None,
                additives=clean_tags(r.get("additives_tags")) or None,
                image_url=(r.get("image_small_url") or r.get("image_url") or "").strip() or None,
                source="off",
            )
            yield row


def seed_rows(path):
    """Seed CSV uses the same column names as the products table (see seed_template.csv)."""
    with open(path, "r", encoding="utf-8-sig", newline="") as fh:
        for r in csv.DictReader(fh):
            if not (r.get("name") or "").strip():
                continue
            row = dict(
                barcode=(r.get("barcode") or "").strip() or None,
                name=r["name"].strip(), brand=(r.get("brand") or "").strip(),
                variant=(r.get("variant") or "").strip() or None,
                category=(r.get("category") or "").strip() or None,
                quantity=(r.get("quantity") or "").strip() or None,
                serving_size=(r.get("serving_size") or "").strip() or None,
                serving_g=num(r.get("serving_g")),
                ingredients_text=(r.get("ingredients_text") or "").strip() or None,
                allergens=(r.get("allergens") or "").strip() or None,
                nutriscore_grade=(r.get("nutriscore_grade") or "").strip().lower() or None,
                nova_group=int(num(r.get("nova_group"))) if num(r.get("nova_group")) else None,
                additives=(r.get("additives") or "").strip() or None,
                image_url=(r.get("image_url") or "").strip() or None,
                source="verified",
            )
            for c in ["energy_kcal_100g", "protein_100g", "carbs_100g", "sugars_100g",
                      "added_sugars_100g", "fat_100g", "sat_fat_100g", "trans_fat_100g",
                      "fiber_100g", "sodium_100g", "salt_100g"]:
                row[c] = num(r.get(c))
            if row["salt_100g"] is None and row["sodium_100g"] is not None:
                row["salt_100g"] = round(row["sodium_100g"] * 2.5, 4)
            if row["sodium_100g"] is None and row["salt_100g"] is not None:
                row["sodium_100g"] = round(row["salt_100g"] / 2.5, 4)
            yield row


COLUMNS = ["barcode", "name", "brand", "variant", "category", "quantity", "serving_size",
           "serving_g", "ingredients_text", "allergens", "energy_kcal_100g", "protein_100g",
           "carbs_100g", "sugars_100g", "added_sugars_100g", "fat_100g", "sat_fat_100g",
           "trans_fat_100g", "fiber_100g", "sodium_100g", "salt_100g", "nutriscore_grade",
           "nova_group", "additives", "image_url", "source", "completeness", "search_text"]


def insert(conn, row, replace):
    row["completeness"] = completeness(row)
    row["search_text"] = normalise(" ".join(filter(None, [row.get("brand"), row["name"], row.get("variant")])))
    values = [row.get(c) for c in COLUMNS]
    verb = "INSERT OR REPLACE" if replace else "INSERT OR IGNORE"
    cur = conn.execute(f"{verb} INTO products ({','.join(COLUMNS)}) VALUES ({','.join('?' * len(COLUMNS))})", values)
    return cur.rowcount > 0


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--off", help="Open Food Facts CSV export (.csv / .csv.gz)")
    ap.add_argument("--seed", help="CSV of verified products")
    ap.add_argument("--out", default="foods.db")
    ap.add_argument("--min-completeness", type=float, default=0.0,
                    help="Drop OFF rows whose key-nutrient completeness is below this (0..1)")
    args = ap.parse_args()
    if not (args.off or args.seed):
        ap.error("give at least one of --off / --seed")

    conn = sqlite3.connect(args.out)
    conn.executescript(SCHEMA)
    n_seed = n_off = skipped = 0

    # Seed first with REPLACE semantics, then OFF with IGNORE so verified rows always win.
    if args.seed:
        for row in seed_rows(args.seed):
            n_seed += insert(conn, row, replace=True)
    if args.off:
        for row in off_rows(args.off):
            if completeness(row) < args.min_completeness:
                skipped += 1
                continue
            if insert(conn, row, replace=False):
                n_off += 1
            if n_off % 5000 == 0 and n_off:
                conn.commit()
                print(f"  ...{n_off} OFF products loaded", file=sys.stderr)
    conn.commit()

    total = conn.execute("SELECT COUNT(*) FROM products").fetchone()[0]
    full = conn.execute("SELECT COUNT(*) FROM products WHERE completeness >= 0.75").fetchone()[0]
    conn.close()
    print(f"Done -> {args.out}\n  verified: {n_seed}\n  off (India): {n_off}  (skipped low-completeness: {skipped})"
          f"\n  total: {total}\n  with >=75% key nutrients: {full}")


if __name__ == "__main__":
    main()