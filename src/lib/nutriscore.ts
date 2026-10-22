// Nutri-Score (2023 algorithm, simplified for prototype use).
// Values are per 100 g (solids) or per 100 ml (beverages).

export type FoodCategory = "general" | "beverage" | "fat" | "cheese";

export interface Nutrients {
  /** kcal per 100g/ml */
  energyKcal: number;
  sugars: number;
  saturatedFat: number;
  /** grams of salt (NOT sodium) */
  salt: number;
  fiber: number;
  protein: number;
  /** % fruit, vegetables, legumes */
  fruitVegLegume: number;
  /** only used for the fats/oils category */
  totalFat?: number;
}

export type Grade = "A" | "B" | "C" | "D" | "E";

export interface ScoreBreakdownRow {
  label: string;
  value: string;
  points: number;
  direction: "negative" | "positive";
}

export interface NutriScoreResult {
  grade: Grade;
  score: number;
  negativePoints: number;
  positivePoints: number;
  rows: ScoreBreakdownRow[];
  category: FoodCategory;
  proteinWithheld: boolean;
}

const kJ = (kcal: number) => kcal * 4.184;

function pointsFrom(value: number, thresholds: number[]): number {
  let p = 0;
  for (const t of thresholds) {
    if (value > t) p += 1;
    else break;
  }
  return p;
}

// --- negative component thresholds -------------------------------------------
const ENERGY_GENERAL = [335, 670, 1005, 1340, 1675, 2010, 2345, 2680, 3015, 3350];
const ENERGY_BEVERAGE = [30, 90, 150, 210, 240, 270, 300, 330, 360, 390];
const SUGAR_GENERAL = [3.4, 6.8, 10, 14, 17, 20, 24, 27, 31, 34, 37, 41, 44, 48, 51];
const SUGAR_BEVERAGE = [0.5, 2, 3.5, 5, 6, 7, 8, 9, 10, 11];
const SATFAT_GENERAL = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const SALT = [0.2, 0.4, 0.6, 0.8, 1, 1.2, 1.4, 1.6, 1.8, 2, 2.2, 2.4, 2.6, 2.8, 3, 3.2, 3.4, 3.6, 3.8, 4];

// --- positive component thresholds -------------------------------------------
const FIBER = [3, 4.1, 5.2, 6.3, 7.4];
const PROTEIN_GENERAL = [2.4, 4.8, 7.2, 9.6, 12, 14, 17];
const PROTEIN_BEVERAGE = [1.2, 1.5, 1.8, 2.1, 2.4, 2.7, 3];
const FRUITVEG_GENERAL = [40, 60, 80];
const FRUITVEG_BEVERAGE = [40, 60, 80];

export function computeNutriScore(n: Nutrients, category: FoodCategory = "general"): NutriScoreResult {
  const rows: ScoreBreakdownRow[] = [];
  const isBev = category === "beverage";

  const energyKJ = kJ(n.energyKcal);
  const energyPts = isBev
    ? pointsFrom(energyKJ, ENERGY_BEVERAGE)
    : pointsFrom(energyKJ, ENERGY_GENERAL);
  rows.push({
    label: "Energy",
    value: `${Math.round(n.energyKcal)} kcal (${Math.round(energyKJ)} kJ)`,
    points: energyPts,
    direction: "negative",
  });

  const sugarPts = isBev ? pointsFrom(n.sugars, SUGAR_BEVERAGE) : pointsFrom(n.sugars, SUGAR_GENERAL);
  rows.push({ label: "Sugars", value: `${n.sugars} g`, points: sugarPts, direction: "negative" });

  // Fats/oils category scores the saturated/total fat ratio instead.
  let satPts: number;
  let satLabel: string;
  if (category === "fat" && n.totalFat && n.totalFat > 0) {
    const ratio = (n.saturatedFat / n.totalFat) * 100;
    satPts = pointsFrom(ratio, [10, 16, 22, 28, 34, 40, 46, 52, 58, 64]);
    satLabel = `${ratio.toFixed(0)}% of total fat`;
  } else {
    satPts = pointsFrom(n.saturatedFat, SATFAT_GENERAL);
    satLabel = `${n.saturatedFat} g`;
  }
  rows.push({
    label: "Saturated fat",
    value: satLabel,
    points: satPts,
    direction: "negative",
  });

  const saltPts = pointsFrom(n.salt, SALT);
  rows.push({
    label: "Salt",
    value: `${n.salt.toFixed(2)} g (${Math.round((n.salt * 400))} mg sodium)`,
    points: saltPts,
    direction: "negative",
  });

  const negativePoints = energyPts + sugarPts + satPts + saltPts;

  const fiberPts = pointsFrom(n.fiber, FIBER);
  rows.push({ label: "Fibre", value: `${n.fiber} g`, points: fiberPts, direction: "positive" });

  const proteinPts = isBev
    ? pointsFrom(n.protein, PROTEIN_BEVERAGE)
    : pointsFrom(n.protein, PROTEIN_GENERAL);
  rows.push({ label: "Protein", value: `${n.protein} g`, points: proteinPts, direction: "positive" });

  const fvPts = isBev
    ? pointsFrom(n.fruitVegLegume, FRUITVEG_BEVERAGE) * 2
    : pointsFrom(n.fruitVegLegume, FRUITVEG_GENERAL);
  rows.push({
    label: "Fruit, veg & legumes",
    value: `${n.fruitVegLegume}%`,
    points: fvPts,
    direction: "positive",
  });

  const positivePoints = fiberPts + proteinPts + fvPts;

  // 2023 rule: if negatives are high, protein points are not counted
  // (except for the cheese category and when fruit/veg points are maxed).
  const proteinCounts =
    category === "cheese" || negativePoints < 11 || fvPts >= (isBev ? 6 : 3);
  const usedPositives = proteinCounts ? positivePoints : fiberPts + fvPts;
  const score = negativePoints - usedPositives;

  const grade = gradeFor(score, category);

  if (!proteinCounts) {
    const proteinRow = rows.find((r) => r.label === "Protein");
    if (proteinRow) proteinRow.points = 0;
  }

  return {
    grade,
    score,
    negativePoints,
    positivePoints: usedPositives,
    rows,
    category,
    proteinWithheld: !proteinCounts,
  };
}

function gradeFor(score: number, category: FoodCategory): Grade {
  if (category === "beverage") {
    if (score <= 1) return "B";
    if (score <= 5) return "C";
    if (score <= 9) return "D";
    return "E";
  }
  if (category === "fat") {
    if (score <= -6) return "A";
    if (score <= 2) return "B";
    if (score <= 10) return "C";
    if (score <= 18) return "D";
    return "E";
  }
  if (score <= 0) return "A";
  if (score <= 2) return "B";
  if (score <= 10) return "C";
  if (score <= 18) return "D";
  return "E";
}

export const GRADE_LABEL: Record<Grade, string> = {
  A: "Excellent nutritional quality",
  B: "Good nutritional quality",
  C: "Average nutritional quality",
  D: "Poor nutritional quality",
  E: "Very poor nutritional quality",
};
