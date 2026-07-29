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
  dimensions: string[];
  outcomes: string[];
};

export const IQ_PRODUCTS: IQProduct[] = [
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
    outcomes: [
      "Experience maturity tier",
      "Peer benchmark percentile",
      "Prioritized experience backlog",
    ],
  },
];

export const IQ_BY_PATH = Object.fromEntries(
  IQ_PRODUCTS.map((p) => [p.path, p]),
) as Record<string, IQProduct>;

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
