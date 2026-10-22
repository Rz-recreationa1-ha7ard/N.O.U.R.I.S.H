import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import {
  AdditiveRisk,
  CalibrationNote,
  GradeLetter,
  GradeMeaning,
  GradeScale,
  NovaBadge,
  PersonalFlagBanner,
  WhyThisScore,
} from "@/components/nourish";
import { getProductById, PRODUCTS } from "@/lib/products";
import { computeNutriScore } from "@/lib/nutriscore";
import { extractAdditives } from "@/lib/additives";
import { personalFlags } from "@/lib/personalization";
import { useProfile } from "@/lib/profile";

export const Route = createFileRoute("/product/$productId")({
  loader: ({ params }) => {
    const product = getProductById(params.productId);
    if (!product) throw notFound();
    return { product };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Product unavailable — N.O.U.R.I.S.H." }, { name: "robots", content: "noindex" }],
      };
    }
    const { product } = loaderData;
    const title = `${product.name} — score & additive risk | N.O.U.R.I.S.H.`;
    const description = `Nutri-Score, NOVA ${product.nova} processing and EFSA additive risk for ${product.name} by ${product.brand}.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: ProductPage,
});

function ProductPage() {
  const { product } = Route.useLoaderData();
  const { profile, hydrated } = useProfile();

  const score = computeNutriScore(product.nutrients, product.category);
  const additives = extractAdditives(product.ingredients);
  const flags = personalFlags(product.nutrients, profile.conditions);

  const alternative = PRODUCTS.filter(
    (p) => p.group === product.group && p.id !== product.id,
  )
    .map((p) => ({ p, s: computeNutriScore(p.nutrients, p.category) }))
    .sort((a, b) => a.s.score - b.s.score)
    .find(({ s }) => s.score < score.score);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-5 pb-20">
        <Link
          to="/"
          className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to search
        </Link>

        <section className="mt-4 card-base p-5">
          <p className="label-caps">{product.categoryLabel}</p>
          <h1 className="mt-1.5 text-2xl font-bold leading-tight">{product.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {product.brand} · barcode <span className="font-mono">{product.barcode}</span>
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-5">
            <GradeLetter grade={score.grade} />
            <div>
              <p className="label-caps">Nutri-Score (2023 algorithm)</p>
              <p className="font-display text-lg font-semibold">Grade {score.grade}</p>
              <GradeMeaning grade={score.grade} />
            </div>
            <div className="ml-auto">
              <GradeScale grade={score.grade} />
            </div>
          </div>
        </section>

        <div className="mt-4">
          <PersonalFlagBanner
            flags={flags}
            hasProfile={hydrated && profile.conditions.length > 0}
            grade={score.grade}
          />
        </div>

        <div className="mt-4">
          <NovaBadge nova={product.nova} mocked />
        </div>

        <div className="mt-4">
          <AdditiveRisk additives={additives} />
        </div>

        <div className="mt-4">
          <WhyThisScore result={score} />
        </div>

        <section className="mt-4 card-base p-5">
          <h2 className="font-display text-base font-semibold">Declared ingredients</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {product.ingredients}
          </p>
        </section>

        {alternative && (
          <section className="mt-4 card-base p-5">
            <h2 className="font-display text-base font-semibold">Better in this category</h2>
            <Link
              to="/product/$productId"
              params={{ productId: alternative.p.id }}
              className="mt-3 flex items-center gap-4 rounded-xl border border-border bg-surface px-4 py-3.5 hover:bg-surface-strong"
            >
              <GradeLetter grade={alternative.s.grade} size="sm" />
              <div className="min-w-0">
                <p className="truncate font-semibold">{alternative.p.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {alternative.p.brand} · NOVA {alternative.p.nova}
                </p>
              </div>
            </Link>
          </section>
        )}

        <div className="mt-4">
          <CalibrationNote />
        </div>
      </main>
    </div>
  );
}
