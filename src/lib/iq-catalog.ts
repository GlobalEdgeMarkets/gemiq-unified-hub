import themeTariff from "@/assets/theme-tariff.jpg";
import themeUx from "@/assets/theme-ux.jpg";
import themeGlobal from "@/assets/theme-global.jpg";
import themeInvestments from "@/assets/theme-investments.jpg";
import themeStartups from "@/assets/theme-startups.jpg";
import themeAi from "@/assets/theme-ai.jpg";

export type Accent = "mint" | "violet" | "cyan" | "amber" | "blue" | "rose";

export type IQProduct = {
  /** Hub assessment_key */
  key: string;
  /** Hub landing route, e.g. /gtmiq */
  path: string;
  name: string;
  url: string;
  tagline: string;
  body: string;
  live: boolean;
  accent: Accent;
  domain: string;
  image: string;
  /** Marketing summary shown on the landing page */
  intro: string;
  /** Longer editorial narrative — 3 paragraphs shown under the hero */
  overview: string[];
  /** Who this assessment is built for */
  audience: string[];
  dimensions: string[];
  /** Illustrative dimension scores (0-100) used for the sample report visuals */
  sample: number[];
  /** Illustrative composite score for the sample report */
  sampleScore: number;
  /** Illustrative peer benchmark composite */
  benchmark: number;
  outcomes: string[];
};

const IQ_PRODUCTS_UNORDERED: IQProduct[] = [
  {
    key: "tariffiq",
    path: "/tariffiq",
    name: "TariffIQ",
    url: "https://tariffiq.globaledgemarkets.com",
    tagline: "Duty exposure & savings",
    body:
      "Eight dimensions of tariff engineering maturity — HTS classification, first-sale, FTZ readiness. Annualized savings estimate in under 10 minutes.",
    live: true,
    accent: "mint",
    domain: "Global Trade & Supply Chain",
    image: themeTariff,
    intro:
      "Quantify what tariffs actually cost you and where duty engineering can claw it back — classification discipline, valuation strategy, and program controls scored against global trade practice.",
    overview: [
      "Tariff cost is rarely a line item anyone owns. It is spread across a customs broker's classification habits, an ERP field nobody validates, a valuation model set years ago, and a compliance function measured on clearance speed rather than landed cost. TariffIQ makes that invisible spend legible: eight dimensions of tariff engineering maturity, each scored independently, each mapped to a specific recoverable dollar mechanism.",
      "The assessment interrogates the places duty leaks in practice — HTS codes inherited from a supplier's invoice, first-sale structures left unused, free trade agreements claimed on a fraction of eligible volume, foreign trade zone and bonded warehouse options never modelled, drawback filings abandoned because the data was too messy to reconstruct. Each answer is weighted by both exposure and effort-to-fix, so the output tells you not only where you are weak but which weakness is worth attacking first.",
      "You finish with an annualized savings estimate grounded in your own trade profile, a dimension-level maturity tier, and a sequenced remediation roadmap that a trade lead can walk into a CFO conversation with. Most teams complete it in under ten minutes; the median first-pass finding is a six-figure recoverable duty position.",
    ],
    audience: [
      "Heads of global trade and customs compliance",
      "Supply chain and procurement leaders carrying landed-cost targets",
      "CFOs pressure-testing duty spend before a tariff cycle",
    ],
    dimensions: [
      "HTS classification discipline",
      "Valuation & first-sale strategy",
      "Free trade agreement utilization",
      "FTZ & bonded warehouse readiness",
      "Country-of-origin governance",
      "Broker & data quality controls",
      "Duty drawback capture",
      "Trade compliance program maturity",
    ],
    sample: [72, 48, 61, 35, 68, 54, 29, 66],
    sampleScore: 54,
    benchmark: 61,
    outcomes: [
      "Annualized duty savings estimate",
      "Dimension-level maturity tiering",
      "Prioritized remediation roadmap",
    ],
  },
  {
    key: "gtmiq",
    path: "/gtmiq",
    name: "GTMIQ",
    url: "https://gtmiq.globaledgemarkets.com",
    tagline: "Market entry & go-to-market readiness",
    body:
      "Nine dimensions of market readiness — technology, commercial model, operations, capital, and regulatory posture — scored for the market you are entering next.",
    live: true,
    accent: "violet",
    domain: "GoToMarket Strategy",
    image: themeGlobal,
    intro:
      "Before you commit budget to a new market, find out whether the product, the commercial model, and the operating base are actually ready to carry it.",
    overview: [
      "Market entry decisions are usually made on conviction and a spreadsheet, then unwound eighteen months later for reasons that were visible at the start — a product that needed localization nobody scoped, a pricing model that did not survive contact with local procurement, a regulatory approval that gated revenue for three quarters. GTMIQ turns that hindsight into a pre-mortem you can run in ten minutes.",
      "Nine readiness dimensions are scored against the specific market you are entering next, not against a generic ideal. Technology and integration readiness test whether the product can actually be deployed there. Commercial and investment readiness test whether the model and the capital behind it survive a longer sales cycle. Operational, cultural, and regulatory readiness test whether the organization can support customers once they sign.",
      "The report reads as a gate review: composite readiness score, per-dimension go / fix / hold guidance, and a sequenced launch preparation plan that tells you what must be true before spend escalates. Teams typically use it to defend a phased entry rather than a full commitment — or to kill an entry early and cheaply.",
    ],
    audience: [
      "Founders and CEOs sequencing international expansion",
      "Corp dev and strategy teams building the entry case",
      "Regional GMs inheriting a launch mandate",
    ],
    dimensions: [
      "Technology readiness",
      "Market readiness",
      "Commercial readiness",
      "Operational readiness",
      "Investment readiness",
      "System integration",
      "Cultural readiness",
      "Growth readiness",
      "Regulatory & compliance",
    ],
    sample: [74, 58, 52, 46, 63, 69, 41, 55, 38],
    sampleScore: 55,
    benchmark: 59,
    outcomes: [
      "Composite market-entry readiness score",
      "Gate-by-gate go / fix / hold guidance",
      "Sequenced launch preparation plan",
    ],
  },
  {
    key: "salesiq",
    path: "/salesiq",
    name: "SalesIQ",
    url: "https://salesiq.globaledgemarkets.com",
    tagline: "Enterprise sales readiness",
    body:
      "Nine dimensions of enterprise selling maturity — pipeline process, procurement navigation, commercial terms, and post-sale success capacity.",
    live: true,
    accent: "amber",
    domain: "Revenue & Enterprise Sales",
    image: themeInvestments,
    intro:
      "Enterprise deals stall on process, procurement, and proof — not on pitch. SalesIQ scores the machine behind the deal and shows where cycles are leaking.",
    overview: [
      "The gap between mid-market selling and enterprise selling is almost never the pitch. It is the security questionnaire that takes six weeks, the MSA redlines nobody internally can approve, the reference architecture the buyer's platform team asks for, the procurement portal that needs a vendor record before a PO can exist. SalesIQ scores the machine that has to absorb all of that.",
      "Nine dimensions cover the full deal surface: pipeline and sales process discipline, procurement and legal navigation, commercial terms and pricing flexibility, the technical and compliance artifacts enterprise buyers demand, and the customer success capacity that determines whether the second year renews. Each dimension is scored against how enterprise buyers actually evaluate vendors, not against internal sales-methodology theory.",
      "The output diagnoses where cycle time and win rate are actually leaking, ranks the fixes by revenue impact rather than by effort, and gives revenue leadership a defensible readiness tier to share with the board. It is most useful just before a move upmarket — or just after the first few enterprise deals stalled without a clear reason.",
    ],
    audience: [
      "CROs and VPs of Sales moving upmarket",
      "Revenue operations leaders diagnosing cycle friction",
      "Founders selling into their first enterprise logos",
    ],
    dimensions: [
      "Technology readiness",
      "Sales process maturity",
      "Procurement readiness",
      "Commercial readiness",
      "Investment readiness",
      "Customer success readiness",
      "Regulatory & compliance",
      "Operational readiness",
      "Integration ecosystem",
    ],
    sample: [68, 61, 39, 57, 64, 44, 47, 53, 71],
    sampleScore: 56,
    benchmark: 62,
    outcomes: [
      "Enterprise-readiness maturity tier",
      "Deal-cycle friction diagnosis",
      "Ranked fixes by revenue impact",
    ],
  },
  {
    key: "productiq",
    path: "/productiq",
    name: "ProductIQ",
    url: "https://productiq.globaledgemarkets.com",
    tagline: "Productization & scale readiness",
    body:
      "Nine dimensions of turning services and prototypes into a repeatable product — packaging, documentation, automation, and self-service experience.",
    live: true,
    accent: "blue",
    domain: "Product & Platform",
    image: themeStartups,
    intro:
      "Bespoke delivery does not scale. ProductIQ measures how far your offer has travelled from custom work toward a packaged, repeatable, sellable product.",
    overview: [
      "Every services business eventually tries to productize, and most stall in the same place: the offer is repeatable in theory but every engagement still needs the founder, the pricing is quoted rather than published, and the knowledge lives in three people's heads. ProductIQ measures exactly how far along that journey you actually are, using nine dimensions that separate genuine packaging from marketing language.",
      "The assessment probes the mechanics of repeatability — whether pricing and packaging are defined enough to be sold without negotiation, whether documentation lets a new customer or a new hire succeed unassisted, whether delivery is automated or merely templated, and whether the self-service experience carries a customer from interest to value without human intervention. Commercial, operational, and regulatory readiness are scored alongside, because a product that cannot be supported or contracted at scale is not a product.",
      "You get a productization maturity tier, a map of where margin leaks between bespoke and packaged delivery, and a staged roadmap that sequences the transition without stranding existing customers. It is the assessment most often run twice — once to set the baseline, once a quarter or two later to prove the margin shift.",
    ],
    audience: [
      "Services firms building a productized offer",
      "Product leaders scaling from pilot to platform",
      "Operators chasing gross-margin expansion",
    ],
    dimensions: [
      "Technology readiness",
      "Packaging & pricing",
      "Documentation & knowledge",
      "Scalability & automation",
      "Commercial readiness",
      "Investment readiness",
      "Operational readiness",
      "Regulatory & compliance",
      "UX & self-service",
    ],
    sample: [70, 43, 36, 49, 58, 62, 51, 55, 40],
    sampleScore: 52,
    benchmark: 58,
    outcomes: [
      "Productization maturity tier",
      "Repeatability and margin leak map",
      "Roadmap from bespoke to packaged",
    ],
  },
  {
    key: "aitransformiq",
    path: "/aitransformiq",
    name: "AITransformIQ",
    url: "https://aitransformiq.globaledgemarkets.com",
    tagline: "AI transformation readiness",
    body:
      "Nine dimensions of enterprise AI readiness — strategy, data foundation, talent, governance, and the operating discipline to run models in production.",
    live: true,
    accent: "rose",
    domain: "AI & Innovation",
    image: themeAi,
    intro:
      "Most AI programs fail on data foundations and governance, not models. AITransformIQ scores the whole stack — from board-level strategy to production operations.",
    overview: [
      "The failure mode of enterprise AI is remarkably consistent: an impressive pilot, an enthusiastic board, and then eighteen months of stalling on data lineage, model governance, and the absence of anyone accountable for a model once it is live. AITransformIQ scores the whole stack that determines whether AI investment converts into operating advantage.",
      "Nine dimensions run from strategy and vision — is there a thesis, or a portfolio of experiments? — through data infrastructure, model and platform readiness, talent depth, and the governance and ethics apparatus that regulators and enterprise customers now require. Commercial and investment readiness test whether AI capability is being priced into the offer, and AI operations readiness tests whether anything you deploy can actually be monitored, retrained, and rolled back.",
      "The report produces an enterprise AI readiness tier, a specific gap analysis on data and governance (the two dimensions that most reliably predict program failure), and a phased adoption roadmap that ties each phase to a prerequisite rather than a date. Boards tend to find it more useful than a vendor's capability deck because the score is about the organization, not the technology.",
    ],
    audience: [
      "CIOs, CTOs, and Chief Data Officers",
      "Transformation leads owning an AI mandate",
      "Boards pressure-testing an AI investment case",
    ],
    dimensions: [
      "AI strategy & vision",
      "Data infrastructure",
      "AI technology readiness",
      "AI talent & skills",
      "AI governance & ethics",
      "Commercial AI readiness",
      "Investment readiness",
      "AI operations readiness",
      "AI regulatory readiness",
    ],
    sample: [66, 42, 59, 48, 34, 53, 67, 38, 45],
    sampleScore: 50,
    benchmark: 57,
    outcomes: [
      "Enterprise AI readiness tier",
      "Data and governance gap analysis",
      "Phased AI adoption roadmap",
    ],
  },
  {
    key: "uxiq",
    path: "/uxiq",
    name: "UXIQ",
    url: "https://uxreadiness.globaledgemarkets.com",
    tagline: "Digital & AI experience",
    body:
      "Benchmark research, design system, accessibility, and conversion craft against best-in-class peers — dimension-level tiering with prioritized recommendations.",
    live: true,
    accent: "cyan",
    domain: "Digital & AI Experience",
    image: themeUx,
    intro:
      "Experience maturity decides whether digital investment converts. UXIQ benchmarks research rigour, design systems, accessibility, and conversion craft.",
    overview: [
      "Digital spend converts at wildly different rates across organizations that have bought roughly the same technology. The difference is experience maturity: whether decisions are informed by research or by opinion, whether the interface is assembled from a governed system or rebuilt each quarter, whether accessibility is designed in or retrofitted under legal pressure, and whether anyone measures the funnel closely enough to know what changed.",
      "UXIQ scores eight dimensions against best-in-class peer practice rather than against a design-team wish list. Research practice, design system maturity, accessibility and inclusion, content and information architecture, conversion craft, experience measurement, AI-assisted experience, and the design operations discipline that determines whether good work ships consistently.",
      "The result is an experience maturity tier, a peer benchmark percentile that makes the gap legible to non-designers, and a prioritized experience backlog ordered by conversion and risk impact. It is the assessment most often used to justify design investment to a finance function that has never funded it before.",
    ],
    audience: [
      "Heads of Digital, Design, and Product",
      "Marketing leaders accountable for conversion",
      "Teams facing accessibility or compliance exposure",
    ],
    dimensions: [
      "User research practice",
      "Design system maturity",
      "Accessibility & inclusion",
      "Content & information architecture",
      "Conversion & funnel craft",
      "Experience measurement",
      "AI-assisted experience",
      "Delivery & design operations",
    ],
    sample: [45, 63, 37, 58, 66, 41, 52, 49],
    sampleScore: 51,
    benchmark: 60,
    outcomes: [
      "Experience maturity tier",
      "Peer benchmark percentile",
      "Prioritized experience backlog",
    ],
  },
];

/** Display order across the site: GTM, Sales, Product, AITransform, UX, Tariff. */
const DISPLAY_ORDER = ["gtmiq", "salesiq", "productiq", "aitransformiq", "uxiq", "tariffiq"];

export const IQ_PRODUCTS: IQProduct[] = [...IQ_PRODUCTS_UNORDERED].sort(
  (a, b) => DISPLAY_ORDER.indexOf(a.key) - DISPLAY_ORDER.indexOf(b.key),
);

export const IQ_BY_PATH = Object.fromEntries(
  IQ_PRODUCTS.map((p) => [p.path, p]),
) as Record<string, IQProduct>;

export const TIER_SCALE = ["reactive", "developing", "defined", "advanced", "optimized"] as const;

export function tierForScore(score: number): (typeof TIER_SCALE)[number] {
  if (score < 30) return "reactive";
  if (score < 50) return "developing";
  if (score < 70) return "defined";
  if (score < 85) return "advanced";
  return "optimized";
}

export const ACCENT: Record<
  Accent,
  { hex: string; text: string; ring: string; dot: string; glow: string; chip: string }
> = {
  mint:   { hex: "#4ade80", text: "text-[#4ade80]", ring: "hover:border-[#4ade80]/50", dot: "bg-[#4ade80]", glow: "shadow-[0_0_40px_-8px_rgba(74,222,128,0.6)]",  chip: "bg-[#4ade80]/10 text-[#4ade80]" },
  violet: { hex: "#a78bfa", text: "text-[#a78bfa]", ring: "hover:border-[#a78bfa]/50", dot: "bg-[#a78bfa]", glow: "shadow-[0_0_40px_-8px_rgba(167,139,250,0.6)]", chip: "bg-[#a78bfa]/10 text-[#a78bfa]" },
  cyan:   { hex: "#67e8f9", text: "text-[#67e8f9]", ring: "hover:border-[#67e8f9]/50", dot: "bg-[#67e8f9]", glow: "shadow-[0_0_40px_-8px_rgba(103,232,249,0.6)]", chip: "bg-[#67e8f9]/10 text-[#67e8f9]" },
  amber:  { hex: "#fbbf24", text: "text-[#fbbf24]", ring: "hover:border-[#fbbf24]/50", dot: "bg-[#fbbf24]", glow: "shadow-[0_0_40px_-8px_rgba(251,191,36,0.5)]",  chip: "bg-[#fbbf24]/10 text-[#fbbf24]" },
  blue:   { hex: "#60a5fa", text: "text-[#60a5fa]", ring: "hover:border-[#60a5fa]/50", dot: "bg-[#60a5fa]", glow: "shadow-[0_0_40px_-8px_rgba(96,165,250,0.6)]",  chip: "bg-[#60a5fa]/10 text-[#60a5fa]" },
  rose:   { hex: "#fb7185", text: "text-[#fb7185]", ring: "hover:border-[#fb7185]/50", dot: "bg-[#fb7185]", glow: "shadow-[0_0_40px_-8px_rgba(251,113,133,0.6)]", chip: "bg-[#fb7185]/10 text-[#fb7185]" },
};
