import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { Search, ScanLine, Check, ArrowRight, Camera, Sparkles } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { CalibrationNote, GradeLetter, NovaBadge } from "@/components/nourish";
import { getAllProducts, PRODUCTS, type Product } from "@/lib/products";
import { computeNutriScore } from "@/lib/nutriscore";
import { CONDITION_LABEL, personalFlags, type Condition } from "@/lib/personalization";
import { useProfile } from "@/lib/profile";
import { OCRScannerModal } from "@/components/ocr-scanner-modal";
import { BarcodeScannerModal } from "@/components/barcode-scanner-modal";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "N.O.U.R.I.S.H. — EU-standard food scores for India" },
      {
        name: "description",
        content:
          "Rate Indian packaged foods with Nutri-Score, NOVA and EFSA additive risk, plus personalised flags for diabetes and hypertension.",
      },
      { property: "og:title", content: "N.O.U.R.I.S.H. — EU-standard food scores for India" },
      {
        property: "og:description",
        content:
          "Nutri-Score, NOVA processing and EFSA additive risk for Indian packaged foods, personalised for diabetes and hypertension.",
      },
    ],
  }),
  component: Home,
});

const CONDITIONS: Condition[] = ["diabetes", "hypertension"];

function Home() {
  const { profile, hydrated, save } = useProfile();
  const [query, setQuery] = useState("");
  const [isOcrOpen, setIsOcrOpen] = useState(false);
  const [isBarcodeOpen, setIsBarcodeOpen] = useState(false);
  const [productList, setProductList] = useState<Product[]>(PRODUCTS);

  useEffect(() => {
    setProductList(getAllProducts());
  }, []);

  const toggle = (c: Condition) => {
    const next = profile.conditions.includes(c)
      ? profile.conditions.filter((x) => x !== c)
      : [...profile.conditions, c];
    save({ conditions: next, onboarded: true });
  };

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? productList.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.brand.toLowerCase().includes(q) ||
            p.categoryLabel.toLowerCase().includes(q) ||
            p.barcode.includes(q),
        )
      : productList;
    return list.map((p) => {
      const score = computeNutriScore(p.nutrients, p.category);
      return {
        product: p,
        grade: score.grade,
        flags: personalFlags(p.nutrients, profile.conditions).length,
      };
    });
  }, [query, productList, profile.conditions]);

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main className="mx-auto max-w-3xl px-5 pb-20">
        <OCRScannerModal
          isOpen={isOcrOpen}
          onClose={() => setIsOcrOpen(false)}
          onProductCreated={() => setProductList(getAllProducts())}
        />

        <BarcodeScannerModal
          isOpen={isBarcodeOpen}
          onClose={() => setIsBarcodeOpen(false)}
          onUseLabelScan={() => setIsOcrOpen(true)}
        />

        <section className="pt-10">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="label-caps">Nutrition · Objective · Unbiased · Rating · Index · Score · Health</p>
            <button
              type="button"
              onClick={() => setIsOcrOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 hover:bg-primary/20 px-3.5 py-1.5 text-xs font-bold text-primary transition-colors cursor-pointer border border-primary/20 shadow-sm"
            >
              <Camera className="h-3.5 w-3.5" /> Scan Label with OCR
            </button>
          </div>
          <h1 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl">
            Indian packaged food, graded against European standards.
          </h1>
          <p className="mt-3 max-w-xl text-[0.95rem] leading-relaxed text-muted-foreground">
            Nutri-Score 2023 for nutritional quality, NOVA for processing, and the EFSA additive
            overlay that flags what India permits but the EU restricts — then adjusted with flags
            for your own health conditions.
          </p>
        </section>

        <section className="mt-8 card-base p-5">
          <h2 className="font-display text-base font-semibold">Your health profile</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Select any conditions you manage. This adds separate flags on top of every score — it
            never changes the objective letter grade.
          </p>
          <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {CONDITIONS.map((c) => {
              const active = hydrated && profile.conditions.includes(c);
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggle(c)}
                  aria-pressed={active}
                  className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3.5 text-left transition-colors ${
                    active
                      ? "border-flag-border bg-flag-soft"
                      : "border-border bg-card hover:bg-surface"
                  }`}
                >
                  <span
                    className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 ${
                      active ? "border-flag bg-flag text-flag-foreground" : "border-input"
                    }`}
                  >
                    {active && <Check className="h-3 w-3" />}
                  </span>
                  <span className="text-sm font-semibold">{CONDITION_LABEL[c]}</span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => save({ conditions: [], onboarded: true })}
            className="mt-3 text-xs font-semibold text-muted-foreground underline"
          >
            None — clear my conditions
          </button>
        </section>

        <section className="mt-8">
          <div className="flex items-center gap-2 rounded-xl border border-input bg-card px-4 py-3 shadow-[var(--shadow-card)]">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search a product or enter a barcode…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <button
              type="button"
              onClick={() => setIsBarcodeOpen(true)}
              className="flex shrink-0 items-center gap-1.5 border-l border-border pl-3 text-xs font-semibold text-primary hover:text-primary/80 transition-colors cursor-pointer"
            >
              <ScanLine className="h-4 w-4" /> Scan Barcode
            </button>
            <button
              type="button"
              onClick={() => setIsOcrOpen(true)}
              className="flex shrink-0 items-center gap-1.5 border-l border-border pl-3 text-xs font-semibold text-primary hover:text-primary/80 transition-colors cursor-pointer"
            >
              <Camera className="h-4 w-4" /> Scan Label (OCR)
            </button>
          </div>
          <p className="mt-2 px-1 text-xs text-muted-foreground">
            Prototype catalogue: {PRODUCTS.length} real Indian packaged products entered from labels
            and Open Food Facts. Scan a barcode or a nutrition label to add more.
          </p>

          <ul className="mt-4 space-y-2.5">
            {results.map(({ product, grade, flags }) => (
              <li key={product.id}>
                <Link
                  to="/product/$productId"
                  params={{ productId: product.id }}
                  className="flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3.5 transition-shadow hover:shadow-[var(--shadow-lift)]"
                >
                  <GradeLetter grade={grade} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{product.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {product.brand} · {product.categoryLabel} · NOVA {product.nova}
                    </p>
                  </div>
                  <div className="ml-auto flex shrink-0 items-center gap-2">
                    {flags > 0 && (
                      <span className="rounded-md bg-flag px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-flag-foreground">
                        {flags} flag{flags > 1 ? "s" : ""}
                      </span>
                    )}
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              </li>
            ))}
            {results.length === 0 && (
              <li className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                No product in the prototype catalogue matches “{query}”.
              </li>
            )}
          </ul>
        </section>

        <div className="mt-8 space-y-4">
          <NovaBadge nova={4} mocked />
          <CalibrationNote />
        </div>
      </main>
    </div>
  );
}
