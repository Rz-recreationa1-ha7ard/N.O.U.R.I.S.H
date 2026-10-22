// EFSA-oriented additive risk overlay.
// riskTier: 1 = low concern, 2 = moderate, 3 = high concern
// euRestricted: approved / widely used in India (FSSAI) but banned or
// restricted in the EU — the core "stricter standard" differentiator.

export interface Additive {
  code: string;
  name: string;
  riskTier: 1 | 2 | 3;
  euRestricted: boolean;
  note: string;
}

export const ADDITIVES: Record<string, Additive> = {
  E102: {
    code: "E102",
    name: "Tartrazine (yellow colour)",
    riskTier: 3,
    euRestricted: true,
    note: "EU requires a mandatory warning label linking it to reduced attention in children; permitted without warning in India.",
  },
  E110: {
    code: "E110",
    name: "Sunset Yellow FCF",
    riskTier: 3,
    euRestricted: true,
    note: "EU mandates a child-hyperactivity warning and lowered the ADI; freely permitted in India.",
  },
  E122: {
    code: "E122",
    name: "Carmoisine (red colour)",
    riskTier: 3,
    euRestricted: true,
    note: "Carries an EU warning label; withdrawn from many EU products but common in Indian confectionery and drinks.",
  },
  E129: {
    code: "E129",
    name: "Allura Red AC",
    riskTier: 3,
    euRestricted: true,
    note: "EU warning-label colour; not restricted under FSSAI.",
  },
  E171: {
    code: "E171",
    name: "Titanium dioxide",
    riskTier: 3,
    euRestricted: true,
    note: "Banned as a food additive in the EU since 2022 (EFSA could not exclude genotoxicity). Still permitted in India.",
  },
  E250: {
    code: "E250",
    name: "Sodium nitrite",
    riskTier: 3,
    euRestricted: true,
    note: "EU tightened maximum levels in 2023 due to nitrosamine formation; Indian limits remain higher.",
  },
  E320: {
    code: "E320",
    name: "BHA (butylated hydroxyanisole)",
    riskTier: 3,
    euRestricted: true,
    note: "Classified as possibly carcinogenic; EU use is tightly restricted while Indian fried snacks use it broadly.",
  },
  E321: {
    code: "E321",
    name: "BHT (butylated hydroxytoluene)",
    riskTier: 2,
    euRestricted: true,
    note: "Restricted to specific EU categories at low levels; widely used in Indian packaged fats and snacks.",
  },
  E621: {
    code: "E621",
    name: "Monosodium glutamate",
    riskTier: 2,
    euRestricted: true,
    note: "EFSA set a group ADI of 30 mg/kg body weight in 2017; India has no equivalent numerical ADI.",
  },
  E951: {
    code: "E951",
    name: "Aspartame",
    riskTier: 2,
    euRestricted: false,
    note: "IARC classified it as possibly carcinogenic (2023); EFSA keeps the ADI at 40 mg/kg body weight.",
  },
  E950: {
    code: "E950",
    name: "Acesulfame K",
    riskTier: 2,
    euRestricted: false,
    note: "Under EFSA re-evaluation; long-term intake data remain limited.",
  },
  E955: {
    code: "E955",
    name: "Sucralose",
    riskTier: 2,
    euRestricted: false,
    note: "Recent studies flag heat-degradation products; EFSA re-evaluation pending.",
  },
  E338: {
    code: "E338",
    name: "Phosphoric acid",
    riskTier: 2,
    euRestricted: false,
    note: "EFSA cut the group phosphate ADI in 2019; high cola intake can exceed it.",
  },
  E450: {
    code: "E450",
    name: "Diphosphates",
    riskTier: 2,
    euRestricted: false,
    note: "Part of the reduced EFSA phosphate group ADI.",
  },
  E322: {
    code: "E322",
    name: "Lecithin",
    riskTier: 1,
    euRestricted: false,
    note: "No safety concern identified by EFSA.",
  },
  E330: {
    code: "E330",
    name: "Citric acid",
    riskTier: 1,
    euRestricted: false,
    note: "No safety concern identified by EFSA.",
  },
  E500: {
    code: "E500",
    name: "Sodium carbonates",
    riskTier: 1,
    euRestricted: false,
    note: "Raising agent, no safety concern; contributes to sodium load.",
  },
  E160a: {
    code: "E160a",
    name: "Carotenes",
    riskTier: 1,
    euRestricted: false,
    note: "Natural colour, no safety concern at normal use levels.",
  },
  E296: {
    code: "E296",
    name: "Malic acid",
    riskTier: 1,
    euRestricted: false,
    note: "No safety concern identified by EFSA.",
  },
  E1442: {
    code: "E1442",
    name: "Modified starch (HDP)",
    riskTier: 1,
    euRestricted: false,
    note: "No safety concern; marker of ultra-processing (NOVA 4).",
  },
};

/** Extracts E-numbers referenced in an ingredient string, e.g. "INS 102", "E102". */
export function extractAdditives(ingredients: string): Additive[] {
  const found = new Map<string, Additive>();
  const re = /(?:E|INS)\s?-?\s?(\d{3,4}[a-c]?)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(ingredients))) {
    const num = m[1] ?? "";
    const direct =
      ADDITIVES[`E${num}`] ??
      ADDITIVES[`E${num.toLowerCase()}`] ??
      ADDITIVES[`E${num.toUpperCase()}`];
    if (direct) found.set(direct.code, direct);
  }
  return [...found.values()].sort((a, b) => {
    if (a.euRestricted !== b.euRestricted) return a.euRestricted ? -1 : 1;
    return b.riskTier - a.riskTier;
  });
}

export const RISK_LABEL: Record<1 | 2 | 3, string> = {
  1: "Low concern",
  2: "Moderate concern",
  3: "High concern",
};
