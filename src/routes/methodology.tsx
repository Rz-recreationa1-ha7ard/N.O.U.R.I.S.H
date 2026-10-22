import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { GradeLetter } from "@/components/nourish";
import { IFCT_FOODS } from "@/lib/products";
import { computeNutriScore } from "@/lib/nutriscore";

export const Route = createFileRoute("/methodology")({
  head: () => ({
    meta: [
      { title: "Methodology & limitations | N.O.U.R.I.S.H." },
      {
        name: "description",
        content:
          "How N.O.U.R.I.S.H. scores food: Nutri-Score 2023, NOVA processing, EFSA additive tiers, IFCT 2017 nutrient data, and the Indian calibration limitation.",
      },
      { property: "og:title", content: "Methodology & limitations | N.O.U.R.I.S.H." },
      {
        property: "og:description",
        content:
          "Nutri-Score 2023, NOVA, EFSA additive tiers and IFCT 2017 data — plus an honest account of what this prototype cannot yet do.",
      },
    ],
  }),
  component: Methodology,
});

function Methodology() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-5 pb-20">
        <h1 className="mt-10 text-3xl font-bold leading-tight">Methodology & limitations</h1>
        <p className="mt-3 text-[0.95rem] leading-relaxed text-muted-foreground">
          N.O.U.R.I.S.H. deliberately applies European reference standards to Indian packaged food,
          because EU thresholds are stricter and more consistently enforced than the FSSAI baseline.
          Everything below is open so the score can be argued with.
        </p>

        <section className="mt-8 space-y-4">
          <Block title="1 · Nutri-Score 2023 (objective base grade)">
            Negative points from energy, sugars, saturated fat and salt are offset by positive points
            from fibre, protein and fruit/vegetable/legume content, using category-specific rules for
            general foods, beverages, fats and cheese. Protein points are withheld above 11 negative
            points unless the fruit/vegetable component is maximal. The result is a letter from A to
            E and it is never modified by your profile.
          </Block>
          <Block title="2 · NOVA processing class (currently mocked)">
            The intended implementation is a text classifier trained on ingredient lists labelled
            with NOVA groups 1–4. In this prototype the NOVA value is read from Open Food Facts
            labels instead. The classifier is the next build step and is not yet live — no product
            page implies otherwise.
          </Block>
          <Block title="3 · EFSA additive overlay (the differentiator)">
            E-numbers and Indian INS numbers are parsed out of the declared ingredient text and
            matched against EFSA risk tiers. Any additive that is permitted under FSSAI but banned,
            capped lower, or subject to a mandatory warning label in the EU is surfaced prominently —
            for example titanium dioxide (E171), banned in the EU since 2022, and the azo colours
            E102/E110/E122/E129, which require child-hyperactivity warnings in the EU.
          </Block>
          <Block title="4 · Personalisation layer (additive, never silent)">
            Diabetes applies sugar thresholds (5 g and 15 g per 100 g) and a low-fibre check;
            hypertension applies salt thresholds (0.6 g and 1.5 g per 100 g, i.e. roughly 240 mg and
            600 mg sodium) plus a saturated-fat check. Flags are rendered in a visually separate
            banner so what is objective and what is personal stay distinguishable.
          </Block>
        </section>

        <section className="mt-10 rounded-xl border-2 border-alert/30 bg-alert-soft p-5">
          <h2 className="font-display text-base font-bold text-alert">
            Known limitation: Indian calibration
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Nutri-Score was developed and validated on European consumption patterns and food
            categories. It has not been validated against Indian dietary patterns, and it handles
            categories such as deep-fried namkeen, ghee-based sweets, spiced dals and coconut-heavy
            preparations imprecisely — coconut and ghee are penalised heavily on saturated fat while
            traditional preparation context is ignored. Grades in those categories should be read as
            indicative rather than authoritative. This is a student prototype for demonstration, not
            medical advice or a certified product.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-lg font-semibold">
            Engine check against IFCT 2017 nutrient data
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            The scoring engine run on unpackaged Indian foods from the Indian Food Composition
            Tables (542 foods prepared; a representative slice shown) to verify it behaves sensibly
            on real Indian nutrient values.
          </p>
          <ul className="mt-4 space-y-2">
            {IFCT_FOODS.map((f) => {
              const s = computeNutriScore(f.nutrients);
              return (
                <li
                  key={f.code}
                  className="flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3"
                >
                  <GradeLetter grade={s.grade} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{f.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {f.group} · IFCT {f.code}
                    </p>
                  </div>
                  <span className="ml-auto shrink-0 font-mono text-xs text-muted-foreground">
                    {s.negativePoints} − {s.positivePoints} = {s.score}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      </main>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card-base p-5">
      <h2 className="font-display text-base font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{children}</p>
    </div>
  );
}
