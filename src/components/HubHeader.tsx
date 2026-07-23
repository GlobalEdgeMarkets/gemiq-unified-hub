import { Link } from "@tanstack/react-router";
import gemLogo from "@/assets/gem-logo-standard.png.asset.json";
import { ThemeToggle } from "@/components/ThemeToggle";

type Props = {
  /** Which auth CTA to emphasize (used on the auth page to hint the other mode). */
  variant?: "landing" | "auth";
  /** Optional right-side slot to add page-specific actions. */
  right?: React.ReactNode;
};

/**
 * Shared header used across the Hub (landing + auth + any future step pages).
 * Both the logo AND the "GEM.IQ Hub" wordmark link back to /.
 * Kept as a single Link for the brand lockup so it acts as one target — matches
 * the landing page and is easier to click.
 */
export function HubHeader({ variant = "landing", right }: Props) {
  return (
    <header className="sticky top-0 z-30 border-b border-gem-navy/10 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link
          to="/"
          aria-label="GEM.IQ Hub — home"
          className="flex items-center gap-3 rounded-md outline-none transition hover:opacity-80 focus-visible:ring-2 focus-visible:ring-gem-mint"
        >
          <img src={gemLogo.url} alt="GEM" className="h-8 w-auto" />
          <span className="hidden h-6 w-px bg-gem-navy/20 sm:block" />
          <span className="hidden font-display text-lg font-bold tracking-tight text-gem-navy sm:inline">
            GEM.IQ Hub
          </span>
        </Link>

        <nav className="flex items-center gap-1 text-sm sm:gap-3">
          {right}
          <ThemeToggle compact />
          {variant === "landing" ? (
            <>
              <a
                href="/#assessments"
                className="hidden text-gem-navy/70 hover:text-gem-navy sm:inline"
              >
                Assessments
              </a>
              <a
                href="/#pricing"
                className="hidden text-gem-navy/70 hover:text-gem-navy sm:inline"
              >
                Pricing
              </a>
              <Link
                to="/auth"
                search={{ mode: "signin" }}
                className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-gem-navy hover:bg-gem-navy/5"
              >
                Sign in
              </Link>
              <Link
                to="/auth"
                search={{ mode: "signup" }}
                className="inline-flex items-center gap-2 rounded-md bg-gem-navy px-3 py-2 text-sm font-semibold text-white hover:brightness-110"
              >
                Create account
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/"
                className="hidden text-gem-navy/70 hover:text-gem-navy sm:inline"
              >
                ← Back to home
              </Link>
              <Link
                to="/auth"
                search={{ mode: "signin" }}
                className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-gem-navy hover:bg-gem-navy/5"
              >
                Sign in
              </Link>
              <Link
                to="/auth"
                search={{ mode: "signup" }}
                className="inline-flex items-center gap-2 rounded-md bg-gem-navy px-3 py-2 text-sm font-semibold text-white hover:brightness-110"
              >
                Create account
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
