#!/usr/bin/env python3
"""Search the Food Grader product database.

CLI:
    python search.py "hide & seek choco chip mocha"
    python search.py --barcode 8901719101861
Library:
    from search import ProductSearch
    ps = ProductSearch("foods.db")
    ps.search("parle g biscut", limit=5)     # typo-tolerant
    ps.by_barcode("8901719101861")

Ranking idea: a product ranks high when it covers MOST of the words you typed
(typos allowed), contains few extra words, and has real data (brand, nutrients).
Junk entries such as a bare "choco" cover only one word, so they rank low.
"""
import argparse
import re
import sqlite3
from collections import defaultdict

from rapidfuzz import fuzz, process

STOP = {"and", "the", "of", "a"}


def normalise(text):
    text = (text or "").lower().replace("&", " and ")
    text = re.sub(r"[^\w\s]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def content_tokens(text):
    return [t for t in normalise(text).split() if t not in STOP]


class ProductSearch:
    def __init__(self, db_path="foods.db"):
        self.conn = sqlite3.connect(db_path)
        self.conn.row_factory = sqlite3.Row
        rows = self.conn.execute(
            "SELECT id, search_text, source, completeness, brand FROM products").fetchall()
        self.ids = [r["id"] for r in rows]
        self.verified = [r["source"] == "verified" for r in rows]
        self.completeness = [r["completeness"] or 0 for r in rows]
        self.has_brand = [bool(r["brand"]) for r in rows]
        self.tokens = [set(content_tokens(r["search_text"])) for r in rows]
        self.inv = defaultdict(list)            # token -> product positions
        for pos, toks in enumerate(self.tokens):
            for t in toks:
                self.inv[t].append(pos)
        self.vocab = list(self.inv)

    def _expand(self, qtoken):
        """Vocabulary tokens that match a query token (exact, or fuzzy for len >= 4)."""
        if len(qtoken) < 4:
            return {qtoken} if qtoken in self.inv else set()
        hits = process.extract(qtoken, self.vocab, scorer=fuzz.ratio,
                               score_cutoff=80, limit=60)
        return {v for v, _score, _i in hits}

    def search(self, query, limit=10, min_coverage=0.5):
        qtoks = content_tokens(query)
        if not qtoks:
            return []
        expansions = [self._expand(t) for t in qtoks]
        matched_vocab = set().union(*expansions)

        covered = defaultdict(int)              # position -> query words matched
        for exp in expansions:
            seen = set()
            for v in exp:
                seen.update(self.inv[v])
            for pos in seen:
                covered[pos] += 1

        scored = []
        for pos, n in covered.items():
            coverage = n / len(qtoks)
            if coverage < min_coverage:
                continue
            ptoks = self.tokens[pos]
            precision = len(ptoks & matched_vocab) / max(len(ptoks), 1)
            score = 65 * coverage + 20 * precision
            score += 16 * self.completeness[pos]    # prefer entries with nutrient data
            score += 8 if self.has_brand[pos] else 0
            score += 3 if self.verified[pos] else 0
            scored.append((score, pos))
        scored.sort(reverse=True)

        out = []
        for score, pos in scored[:limit]:
            d = dict(self.conn.execute("SELECT * FROM products WHERE id=?", (self.ids[pos],)).fetchone())
            d["score"] = round(score, 1)
            out.append(d)
        return out

    def by_barcode(self, barcode):
        row = self.conn.execute("SELECT * FROM products WHERE barcode=?", (barcode.strip(),)).fetchone()
        return dict(row) if row else None


def show(p):
    title = " | ".join(filter(None, [p.get("brand"), p["name"], p.get("variant")]))
    extra = f"  [{p['source']}, {int((p['completeness'] or 0) * 100)}% nutrients]"
    score = f"  score {p['score']}" if "score" in p else ""
    print(f"{title}{extra}{score}\n   barcode {p['barcode']}  {p.get('quantity') or ''}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("query", nargs="?")
    ap.add_argument("--barcode")
    ap.add_argument("--db", default="foods.db")
    ap.add_argument("--limit", type=int, default=8)
    ap.add_argument("--details", action="store_true",
                    help="with --barcode: print every filled-in field of the product")
    a = ap.parse_args()
    ps = ProductSearch(a.db)
    if a.barcode:
        p = ps.by_barcode(a.barcode)
        if not p:
            print("Not found")
        elif a.details:
            for k, v in p.items():
                if v not in (None, "") and k != "search_text":
                    print(f"{k:18} {v}")
        else:
            show(p)
    elif a.query:
        results = ps.search(a.query, a.limit)
        if not results:
            print("No match. This is where the app would fall back to the label scanner.")
        for r in results:
            show(r)
    else:
        ap.error("give a query or --barcode")