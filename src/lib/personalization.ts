import type { Nutrients } from "./nutriscore";

export type Condition = "diabetes" | "hypertension";

export interface PersonalFlag {
  condition: Condition;
  severity: "warning" | "caution" | "ok";
  title: string;
  detail: string;
}

export const CONDITION_LABEL: Record<Condition, string> = {
  diabetes: "Diabetes / pre-diabetes",
  hypertension: "Hypertension / high blood pressure",
};

/**
 * Personalisation NEVER changes the Nutri-Score. It only adds separate flags
 * layered on top of the objective grade.
 */
export function personalFlags(n: Nutrients, conditions: Condition[]): PersonalFlag[] {
  const flags: PersonalFlag[] = [];

  if (conditions.includes("diabetes")) {
    if (n.sugars >= 15) {
      flags.push({
        condition: "diabetes",
        severity: "warning",
        title: `High sugar — ${n.sugars} g per 100 g`,
        detail:
          "Above the 15 g/100 g high-sugar threshold. A single serving can cause a sharp post-meal glucose rise.",
      });
    } else if (n.sugars >= 5) {
      flags.push({
        condition: "diabetes",
        severity: "caution",
        title: `Moderate sugar — ${n.sugars} g per 100 g`,
        detail: "Between 5 and 15 g/100 g. Portion size matters; pair with protein or fibre.",
      });
    }
    if (n.fiber < 3 && n.energyKcal > 150) {
      flags.push({
        condition: "diabetes",
        severity: "caution",
        title: `Low fibre — ${n.fiber} g per 100 g`,
        detail:
          "Under 3 g/100 g in an energy-dense food means faster carbohydrate absorption and a higher glycaemic response.",
      });
    }
  }

  if (conditions.includes("hypertension")) {
    const sodiumMg = Math.round(n.salt * 400);
    if (n.salt >= 1.5) {
      flags.push({
        condition: "hypertension",
        severity: "warning",
        title: `High sodium — ${sodiumMg} mg per 100 g`,
        detail: `Salt at ${n.salt.toFixed(2)} g/100 g exceeds the 1.5 g high-salt threshold. WHO advises under 2,000 mg sodium per day in total.`,
      });
    } else if (n.salt >= 0.6) {
      flags.push({
        condition: "hypertension",
        severity: "caution",
        title: `Moderate sodium — ${sodiumMg} mg per 100 g`,
        detail: "Between 0.6 and 1.5 g salt/100 g. Watch cumulative intake across the day.",
      });
    }
    if (n.saturatedFat >= 5) {
      flags.push({
        condition: "hypertension",
        severity: "caution",
        title: `High saturated fat — ${n.saturatedFat} g per 100 g`,
        detail: "Relevant to overall cardiovascular risk alongside blood pressure management.",
      });
    }
  }

  return flags;
}
