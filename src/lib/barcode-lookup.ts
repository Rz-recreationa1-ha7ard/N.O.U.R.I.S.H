import type { FoodCategory, Nutrients } from "./nutriscore";
import { getAllProducts, saveCustomProduct, type Product } from "./products";

/**
 * Barcode -> Product lookup.
 *
 * Order of lookup:
 *   1. Products already in the app (built-in list + products saved from scans).
 *   2. The team's own database backend (not connected yet, see lookupInBackend).
 *   3. The public Open Food Facts API (temporary fallback).
 *
 * To connect the real database, only lookupInBackend() needs to change.
 */

export type LookupResult =
  | { status: "found"; product: Product; origin: "app" | "backend" | "off"; notes: string[] }
  | { status: "incomplete"; name: string; brand: string; missing: string[] }
  | { status: "not-found" }
  | { status: "error"; message: string };

/** Keep digits only. Camera and typed input can both contain spaces or dashes. */
export function cleanBarcode(raw: string): string {
  return raw.replace(/\D/g, "");
}

/** EAN-8, UPC-A (12), EAN-13 and GTIN-14 are all between 8 and 14 digits. */
export function isPlausibleBarcode(code: string): boolean {
  return /^\d{8,14}$/.test(code);
}

/** UPC-A is an EAN-13 with a leading zero, so compare without leading zeros. */
function sameBarcode(a: string, b: string): boolean {
  return a.replace(/^0+/, "") === b.replace(/^0+/, "");
}

/**
 * Placeholder for the team's real database.
 * Replace the body with a call to the backend, for example:
 *   const res = await fetch(`/api/product?barcode=${code}`);
 * and return a Product, or null if the barcode is unknown.
 */
async function lookupInBackend(_code: string): Promise<Product | null> {
  return null;
}

// ---- Open Food Facts fallback ----------------------------------------------

const OFF_FIELDS = [
  "code",
  "product_name",
  "brands",
  "categories_tags",
  "ingredients_text",
  "nova_group",
  "nutriments",
].join(",");

type OffNutriments = Record<string, number | string | undefined>;

function num(n: OffNutriments, key: string): number | undefined {
  const v = n[key];
  if (v === undefined || v === null || v === "") return undefined;
  const parsed = typeof v === "number" ? v : Number(v);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function pickCategory(tags: string[]): FoodCategory {
  if (tags.some((t) => t === "en:cheeses" || t === "en:processed-cheese")) return "cheese";
  if (tags.some((t) => t === "en:beverages" || t === "en:non-alcoholic-beverages")) return "beverage";
  if (tags.some((t) => t === "en:fats" || t === "en:vegetable-oils" || t === "en:butters")) return "fat";
  return "general";
}

async function lookupInOpenFoodFacts(code: string): Promise<LookupResult> {
  let res: Response;
  try {
    res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=${OFF_FIELDS}`,
    );
  } catch {
    return { status: "error", message: "Could not reach Open Food Facts. Check your internet connection." };
  }
  if (res.status === 404) return { status: "not-found" };
  if (!res.ok) return { status: "error", message: `Open Food Facts returned an error (${res.status}).` };

  const data = await res.json();
  if (data.status !== 1 || !data.product) return { status: "not-found" };

  const p = data.product;
  const n: OffNutriments = p.nutriments ?? {};
  const name: string = (p.product_name || "").trim() || "Unnamed product";
  const brand: string = String(p.brands || "").split(",")[0].trim() || "Unknown brand";

  // Salt: use salt if present, otherwise convert sodium (salt = sodium x 2.5).
  const sodium = num(n, "sodium_100g");
  const salt = num(n, "salt_100g") ?? (sodium !== undefined ? sodium * 2.5 : undefined);

  const energyKcal = num(n, "energy-kcal_100g");
  const sugars = num(n, "sugars_100g");
  const saturatedFat = num(n, "saturated-fat_100g");
  const protein = num(n, "proteins_100g");

  // These five decide the grade. If any is missing we do not guess a grade.
  const missing: string[] = [];
  if (energyKcal === undefined) missing.push("energy");
  if (sugars === undefined) missing.push("sugars");
  if (saturatedFat === undefined) missing.push("saturated fat");
  if (salt === undefined) missing.push("salt");
  if (protein === undefined) missing.push("protein");
  if (missing.length > 0) return { status: "incomplete", name, brand, missing };

  const notes: string[] = [];

  // Undeclared fibre is scored as 0 (same assumption as the Python grader).
  const fiber = num(n, "fiber_100g");
  if (fiber === undefined) notes.push("Fibre is not declared, so it is counted as 0.");

  const fruitVeg =
    num(n, "fruits-vegetables-legumes-estimate-from-ingredients_100g") ??
    num(n, "fruits-vegetables-nuts-estimate-from-ingredients_100g");
  if (fruitVeg === undefined) notes.push("Fruit/vegetable content is not available, so it is counted as 0%.");

  const novaRaw = Number(p.nova_group);
  const novaKnown = [1, 2, 3, 4].includes(novaRaw);
  if (!novaKnown) notes.push("Open Food Facts has no NOVA group for this product, so NOVA 3 is shown as a placeholder.");

  const category = pickCategory(Array.isArray(p.categories_tags) ? p.categories_tags : []);
  const fat = num(n, "fat_100g");
  const nutrients: Nutrients = {
    energyKcal: energyKcal!,
    sugars: sugars!,
    saturatedFat: saturatedFat!,
    salt: salt!,
    fiber: fiber ?? 0,
    protein: protein!,
    fruitVegLegume: fruitVeg ?? 0,
    ...(fat !== undefined ? { totalFat: fat } : {}),
  };

  const product: Product = {
    id: `off-${code}`,
    name,
    brand,
    barcode: code,
    categoryLabel: category === "beverage" ? "Beverage" : "Packaged food",
    category,
    nova: (novaKnown ? novaRaw : 3) as 1 | 2 | 3 | 4,
    novaSource: "off",
    ingredients: p.ingredients_text || "Ingredients are not listed on Open Food Facts for this product.",
    source: "off",
    group: "scanned",
    nutrients,
  };
  return { status: "found", product, origin: "off", notes };
}

// ---- Public entry point ----------------------------------------------------

export async function lookupProduct(rawBarcode: string): Promise<LookupResult> {
  const code = cleanBarcode(rawBarcode);
  if (!isPlausibleBarcode(code)) return { status: "not-found" };

  const local = getAllProducts().find((p) => sameBarcode(p.barcode, code));
  if (local) return { status: "found", product: local, origin: "app", notes: [] };

  try {
    const fromBackend = await lookupInBackend(code);
    if (fromBackend) return { status: "found", product: fromBackend, origin: "backend", notes: [] };
  } catch (err) {
    console.error("Backend lookup failed, falling back to Open Food Facts", err);
  }

  return lookupInOpenFoodFacts(code);
}

/** Save a looked-up product so the product page can open it, and return its id. */
export function saveLookedUpProduct(product: Product): string {
  saveCustomProduct(product);
  return product.id;
}
