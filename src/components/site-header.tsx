import { Link } from "@tanstack/react-router";
import { Leaf } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-5 py-3.5">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Leaf className="h-4 w-4" />
          </span>
          <span className="font-display text-sm font-bold tracking-[0.18em]">N.O.U.R.I.S.H.</span>
        </Link>
        <nav className="ml-auto flex items-center gap-4 text-sm">
          <Link to="/" className="text-muted-foreground hover:text-foreground">
            Scan
          </Link>
          <Link to="/methodology" className="text-muted-foreground hover:text-foreground">
            Methodology
          </Link>
        </nav>
      </div>
    </header>
  );
}
