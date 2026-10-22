import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ChevronDown,
  Info,
  ShieldAlert,
  UserRound,
  CheckCircle2,
} from "lucide-react";
import {
  GRADE_LABEL,
  type Grade,
  type NutriScoreResult,
} from "@/lib/nutriscore";
import { RISK_LABEL, type Additive } from "@/lib/additives";
import { CONDITION_LABEL, type PersonalFlag } from "@/lib/personalization";

const GRADE_BG: Record<Grade, string> = {
  A: "bg-grade-a",
  B: "bg-grade-b",
  C: "bg-grade-c",
  D: "bg-grade-d",
  E: "bg-grade-e",
};

export function GradeLetter({ grade, size = "lg" }: { grade: Grade; size?: "sm" | "lg" }) {
  const dims =
    size === "lg" ? "h-20 w-20 text-4xl rounded-2xl" : "h-9 w-9 text-base rounded-lg";
  return (
    <span
      aria-label={`Nutri-Score ${grade}`}
      className={`${GRADE_BG[grade]} ${dims} inline-flex shrink-0 items-center justify-center font-display font-bold text-grade-foreground`}
    >
      {grade}
    </span>
  );
}

export function GradeScale({ grade }: { grade: Grade }) {
  const letters: Grade[] = ["A", "B", "C", "D", "E"];
  return (
    <div className="flex items-end gap-1" aria-hidden>
      {letters.map((l) => (
        <span
          key={l}
          className={`${GRADE_BG[l]} inline-flex items-center justify-center font-display font-bold text-grade-foreground transition-all ${
            l === grade ? "h-9 w-9 text-sm rounded-md" : "h-6 w-6 text-[0.65rem] rounded opacity-45"
          }`}
        >
          {l}
        </span>
      ))}
    </div>
  );
}

const NOVA_TEXT: Record<number, { title: string; body: string }> = {
  1: { title: "Unprocessed / minimally processed", body: "Whole foods, no industrial formulation." },
  2: { title: "Processed culinary ingredient", body: "Oils, sugars, salt used to prepare food." },
  3: { title: "Processed food", body: "Few added ingredients, recognisably food-based." },
  4: { title: "Ultra-processed", body: "Industrial formulation with additives and isolated ingredients." },
};

export function NovaBadge({ nova, mocked }: { nova: 1 | 2 | 3 | 4; mocked?: boolean }) {
  const info = NOVA_TEXT[nova]!;
  return (
    <div className="card-base p-4">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary font-display text-lg font-bold text-primary-foreground">
          {nova}
        </span>
        <div>
          <p className="label-caps">NOVA processing</p>
          <p className="mt-0.5 font-semibold">{info.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{info.body}</p>
        </div>
      </div>
      {mocked && (
        <p className="mt-3 flex gap-2 rounded-lg bg-surface p-2.5 text-xs text-muted-foreground">
          <Info className="mt-px h-3.5 w-3.5 shrink-0" />
          Sourced from Open Food Facts labels. The ingredient-text NOVA classifier is the next
          build step and is not yet live.
        </p>
      )}
    </div>
  );
}

const RISK_DOT: Record<1 | 2 | 3, string> = {
  1: "bg-risk-low",
  2: "bg-risk-mid",
  3: "bg-risk-high",
};

export function AdditiveRisk({ additives }: { additives: Additive[] }) {
  const restricted = additives.filter((a) => a.euRestricted);

  return (
    <section className="card-base overflow-hidden">
      <header className="flex items-center gap-2 border-b border-border px-5 py-4">
        <ShieldAlert className="h-4 w-4 text-primary" />
        <h2 className="font-display text-base font-semibold">Additive risk (EFSA overlay)</h2>
      </header>

      {restricted.length > 0 && (
        <div className="border-b border-border bg-alert-soft px-5 py-4">
          <p className="flex items-center gap-2 font-display text-sm font-bold text-alert">
            <AlertTriangle className="h-4 w-4" />
            {restricted.length} additive{restricted.length > 1 ? "s" : ""} restricted or banned in
            the EU — permitted in India
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            These pass FSSAI rules but would fail or require warning labels under EU regulation.
          </p>
        </div>
      )}

      {additives.length === 0 ? (
        <p className="flex items-center gap-2 px-5 py-4 text-sm text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 text-risk-low" />
          No E-number additives detected in the declared ingredients.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {additives.map((a) => (
            <li key={a.code} className="px-5 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-semibold text-foreground">{a.code}</span>
                <span className="font-semibold">{a.name}</span>
                <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className={`h-2 w-2 rounded-full ${RISK_DOT[a.riskTier]}`} />
                  {RISK_LABEL[a.riskTier]}
                </span>
              </div>
              {a.euRestricted && (
                <span className="mt-2 inline-block rounded-md bg-alert px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-alert-foreground">
                  Restricted in EU · permitted in India
                </span>
              )}
              <p className="mt-2 text-sm text-muted-foreground">{a.note}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function PersonalFlagBanner({
  flags,
  hasProfile,
  grade,
}: {
  flags: PersonalFlag[];
  hasProfile: boolean;
  grade: Grade;
}) {
  if (!hasProfile) {
    return (
      <div className="rounded-xl border border-dashed border-flag-border bg-flag-soft px-5 py-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-flag">
          <UserRound className="h-4 w-4" /> No health conditions selected
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Add diabetes or hypertension to your profile to see personalised flags layered on top of
          this score.{" "}
          <Link to="/" className="font-semibold text-flag underline">
            Update profile
          </Link>
        </p>
      </div>
    );
  }

  if (flags.length === 0) {
    return (
      <div className="rounded-xl border border-flag-border bg-flag-soft px-5 py-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-flag">
          <CheckCircle2 className="h-4 w-4" /> No flags for your conditions
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Nothing in this product crosses the thresholds set for your selected conditions.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border-2 border-flag-border bg-flag-soft">
      <div className="flex items-center gap-2 bg-flag px-5 py-3 text-flag-foreground">
        <UserRound className="h-4 w-4" />
        <p className="font-display text-sm font-bold">
          Nutri-Score {grade} — but flagged for you
        </p>
      </div>
      <ul className="divide-y divide-flag-border">
        {flags.map((f, i) => (
          <li key={i} className="px-5 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <AlertTriangle
                className={`h-4 w-4 ${f.severity === "warning" ? "text-alert" : "text-risk-mid"}`}
              />
              <span className="font-semibold">{f.title}</span>
              <span className="ml-auto rounded-md border border-flag-border bg-card px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-flag">
                {CONDITION_LABEL[f.condition].split(" /")[0]}
              </span>
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground">{f.detail}</p>
          </li>
        ))}
      </ul>
      <p className="border-t border-flag-border bg-card/60 px-5 py-3 text-xs text-muted-foreground">
        Personal flags never change the objective Nutri-Score letter — they sit alongside it.
      </p>
    </div>
  );
}

export function WhyThisScore({ result }: { result: NutriScoreResult }) {
  const [open, setOpen] = useState(false);
  const negatives = result.rows.filter((r) => r.direction === "negative");
  const positives = result.rows.filter((r) => r.direction === "positive");

  return (
    <section className="card-base overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-5 py-4 text-left"
      >
        <h2 className="font-display text-base font-semibold">Why this score</h2>
        <span className="text-sm text-muted-foreground">
          {result.score > 0 ? `+${result.score}` : result.score} points → {result.grade}
        </span>
        <ChevronDown
          className={`ml-auto h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="border-t border-border px-5 py-4">
          <p className="label-caps">Negative points ({result.negativePoints})</p>
          <PointsTable rows={negatives} />
          <p className="label-caps mt-5">Positive points ({result.positivePoints})</p>
          <PointsTable rows={positives} />
          {result.proteinWithheld && (
            <p className="mt-2 text-xs font-semibold text-alert">
              Protein points are withheld here: negative points reached 11 or more.
            </p>
          )}
          <p className="mt-4 rounded-lg bg-surface p-3 text-xs text-muted-foreground">
            Nutri-Score 2023 algorithm, {result.category} category rules. Final score ={" "}
            {result.negativePoints} − {result.positivePoints} = {result.score}. Protein points are
            withheld when negative points reach 11 or more, unless the fruit/vegetable component is
            maximal or the product is cheese.
          </p>
        </div>
      )}
    </section>
  );
}

function PointsTable({ rows }: { rows: NutriScoreResult["rows"] }) {
  return (
    <table className="mt-2 w-full text-sm">
      <tbody>
        {rows.map((r) => (
          <tr key={r.label} className="border-b border-border last:border-0">
            <td className="py-2 pr-3 font-medium">{r.label}</td>
            <td className="py-2 pr-3 text-right font-mono text-xs text-muted-foreground">
              {r.value}
            </td>
            <td className="w-12 py-2 text-right font-mono font-semibold">
              {r.direction === "negative" ? "+" : "−"}
              {r.points}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function CalibrationNote({ children }: { children?: ReactNode }) {
  return (
    <div className="flex gap-3 rounded-xl border border-border bg-surface px-4 py-3">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <p className="text-xs leading-relaxed text-muted-foreground">
        {children ?? (
          <>
            <span className="font-semibold text-foreground">About this score.</span> Nutri-Score was
            developed and validated on European food categories. It was never calibrated on Indian
            staples such as fried namkeen, ghee-based sweets or spiced dals, so grades for those
            categories should be read as indicative. We show this openly rather than implying
            Indian-specific validation.{" "}
            <Link to="/methodology" className="font-semibold text-primary underline">
              Read the methodology
            </Link>
          </>
        )}
      </p>
    </div>
  );
}

export function GradeMeaning({ grade }: { grade: Grade }) {
  return <p className="text-sm text-muted-foreground">{GRADE_LABEL[grade]}</p>;
}
