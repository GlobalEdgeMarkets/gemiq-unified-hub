import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GEM.IQ Hub — Shared identity, billing & submissions" },
      { name: "description", content: "The GEM.IQ Hub powers shared authentication, subscription billing, and result submission across every GEM.IQ assessment." },
      { property: "og:title", content: "GEM.IQ Hub" },
      { property: "og:description", content: "Shared identity, billing, and submissions for the GEM.IQ assessment platform." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Index,
});

const ASSESSMENTS = [
  { key: "tariffiq", label: "TariffIQ", desc: "Tariff exposure & mitigation readiness" },
  { key: "readinessiq", label: "ReadinessIQ", desc: "Global market entry readiness" },
  { key: "uxiq", label: "UXIQ", desc: "Digital experience & conversion" },
  { key: "techservicesiq", label: "TechServicesIQ", desc: "Tech services delivery maturity" },
];

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="font-semibold tracking-tight">GEM.IQ Hub</div>
          <nav className="flex gap-3 text-sm">
            <Link to="/auth" search={{ mode: "signin" }} className="px-3 py-1.5 rounded-md hover:bg-accent">Sign in</Link>
            <Link to="/auth" search={{ mode: "signup" }} className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90">Create account</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-16">
        <section className="text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">One identity across every GEM.IQ assessment</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            The GEM.IQ Hub is the central service for authentication, subscription billing, and result submission
            — powering all GlobalEdgeMarkets assessment tools.
          </p>
        </section>

        <section className="mt-16 grid gap-4 sm:grid-cols-2">
          {ASSESSMENTS.map(a => (
            <div key={a.key} className="rounded-lg border p-5">
              <div className="font-medium">{a.label}</div>
              <div className="mt-1 text-sm text-muted-foreground">{a.desc}</div>
            </div>
          ))}
        </section>

        <section className="mt-16 grid gap-6 sm:grid-cols-3">
          <Card title="Shared auth" body="Sign in once. Your session is available across every assessment on globaledgemarkets.com." />
          <Card title="Unified billing" body="Manage your GEM.IQ Professional subscription in one place — powered by Stripe." />
          <Card title="Central submissions" body="Assessment results flow through the Hub into HubSpot with automatic retry." />
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto max-w-5xl px-6 py-6 text-xs text-muted-foreground">
          © GlobalEdgeMarkets — GEM.IQ Hub
        </div>
      </footer>
    </div>
  );
}

function Card({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border p-5">
      <div className="font-medium">{title}</div>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
