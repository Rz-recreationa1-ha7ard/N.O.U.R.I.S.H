# Nourish Health Score

What the app is

N.O.U.R.I.S.H. is a food-rating app for Indian consumers that scores packaged food products using European nutrition standards (Nutri-Score, NOVA, EFSA additive risk) instead of India's FSSAI baseline — because EU standards are stricter and more consistently enforced — while adding a feature Indian and most European apps lack: personalized health-condition flags, so a product's rating adjusts to whether the user is managing diabetes, hypertension, etc.

It's positioned as more rigorous than TruthIn (the closest Indian competitor) and more personalized than Yuka (the closest European reference app), while being transparent about a real limitation: Nutri-Score wasn't originally validated on Indian food categories, and the prototype should visibly flag this rather than hide it.

Core scoring model (implement or mock this logic)

Base Nutri-Score (2023 algorithm) — letter grade A–E from energy, sugar, saturated fat, salt (negative points) vs. fiber, protein, fruit/veg/legume content (positive points), using category-specific rules (general foods / beverages / fats / cheese).

NOVA processing badge (1–4) — how processed the product is, ideally inferred from ingredient list text (this is the ML component: a text classifier trained on ingredient lists with NOVA labels).

Additive risk overlay — cross-reference E-numbers in the ingredient list against EFSA risk tiers, and explicitly flag any additive that's approved in India (FSSAI) but restricted/banned in the EU — this is the app's core "stricter standard" differentiator, so make it visually prominent.

Personalization layer — user selects health condition(s) at onboarding (start with just diabetes and hypertension for the prototype — sugar/fiber thresholds and sodium thresholds respectively). Each condition adds a separate flag/warning on top of the base score, never silently changing it — e.g. "Nutri-Score: B — but flagged for you: high sodium (hypertension)."

Data to use in the prototype

IFCT 2017 dataset (already prepared, 542 Indian foods with energy/protein/fat/saturated fat/fiber/sugar/sodium per 100g) — use this to demo the base scoring engine working correctly on real Indian nutrient data.

Open Food Facts (India-filtered export) — for packaged products with ingredient text, if barcode/product-lookup is part of the demo.

If building fast, a small hand-picked set of ~15–20 real Indian packaged products (labels photographed or manually entered) is enough to make the demo feel real without needing the full pipeline working end-to-end.

Key screens / flow

Onboarding — pick health condition(s) (multi-select: diabetes, hypertension, none). Store as user profile.

Scan/search — barcode scan or search-by-name to look up a product.

Product result screen — show:

Nutri-Score letter (color-coded A=green through E=red)

NOVA processing badge (1–4)

Additive risk section — list flagged additives, explicitly noting "restricted in EU, permitted in India" where applicable

Personalized flag banner (only shown if user has a relevant condition) — clearly visually distinct from the base score

Expandable "why this score" breakdown (nutrient values driving the grade)

Comparison/alternatives (optional stretch) — suggest a better-scoring product in the same category.

Design direction

Clean, trustworthy, health-app aesthetic — not playful/gamified. Think clarity over cuteness, since the core value prop is rigor and transparency.

A–E score uses the standard Nutri-Score color spectrum (dark green → red) so it reads as familiar/credible.

Personalization flags should look distinct from the base score (e.g. a separate colored banner or icon) — never blended into the main letter grade, to preserve transparency about what's objective vs. personalized.

Include a small, honest "About this score" or info icon noting the Indian-food calibration limitation — this is a legitimate design choice for a college project, not a weakness to hide.

Scope reminders for the prototype

This is a demo, not a certified medical or commercial product — no need for authentication, real payment, or production data pipelines.

Two health conditions (diabetes, hypertension) is enough to prove the personalization concept — don't try to build all condition modules.

If full ML (ingredient-text NOVA classifier) isn't feasible in the prototype timeline, mock it with the NOVA values already present in Open Food Facts data and clearly note in the demo that the ML classifier is the next build step, not yet live.


## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
