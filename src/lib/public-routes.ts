/** Indexable marketing routes — keep in sync with sitemap and llms.txt. */
export type PublicRoute = {
  path: string;
  priority: number;
  changeFrequency: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  /** Short label for AI / llms summaries */
  label: string;
  description: string;
};

export const PUBLIC_MARKETING_ROUTES: PublicRoute[] = [
  {
    path: "/",
    label: "Home",
    description: "Product overview, CLI sandbox, and FAQ.",
    priority: 1,
    changeFrequency: "weekly",
  },
  {
    path: "/docs",
    label: "Documentation",
    description: "CLI quickstart, command reference, GitHub App, security.",
    priority: 0.9,
    changeFrequency: "weekly",
  },
  {
    path: "/docs/architecture",
    label: "Engine architecture",
    description: "runRepair graph, CLI vs hosted validation.",
    priority: 0.85,
    changeFrequency: "monthly",
  },
  {
    path: "/docs/deploy",
    label: "Self-host on Vercel",
    description: "Neon, OAuth, env vars, Stripe, smoke tests.",
    priority: 0.85,
    changeFrequency: "monthly",
  },
  {
    path: "/pricing",
    label: "Pricing",
    description: "Free, Pro, and Enterprise plans.",
    priority: 0.9,
    changeFrequency: "monthly",
  },
  {
    path: "/agents",
    label: "Vendor agents",
    description: "Stripe, OpenAI, Anthropic, Supabase, Gemini, GitHub REST.",
    priority: 0.8,
    changeFrequency: "weekly",
  },
  {
    path: "/use-cases",
    label: "Use cases",
    description: "When teams use Repairo for API drift.",
    priority: 0.8,
    changeFrequency: "monthly",
  },
  {
    path: "/demo",
    label: "Live demo",
    description: "Browser OpenAPI diff → impact → patch without install.",
    priority: 0.7,
    changeFrequency: "monthly",
  },
  {
    path: "/blog",
    label: "Blog",
    description: "Engineering posts on AST repairs.",
    priority: 0.7,
    changeFrequency: "weekly",
  },
  {
    path: "/changelog",
    label: "Changelog",
    description: "Product and CLI release notes.",
    priority: 0.6,
    changeFrequency: "weekly",
  },
  {
    path: "/security",
    label: "Security",
    description: "OAuth scopes, data handling, compliance roadmap.",
    priority: 0.6,
    changeFrequency: "monthly",
  },
  {
    path: "/about",
    label: "About",
    description: "Company and mission.",
    priority: 0.5,
    changeFrequency: "monthly",
  },
  {
    path: "/contact",
    label: "Contact",
    description: "Sales, security questionnaires, support.",
    priority: 0.5,
    changeFrequency: "yearly",
  },
  {
    path: "/privacy",
    label: "Privacy",
    description: "Privacy policy.",
    priority: 0.2,
    changeFrequency: "yearly",
  },
  {
    path: "/terms",
    label: "Terms",
    description: "Terms of service.",
    priority: 0.2,
    changeFrequency: "yearly",
  },
];

/** Routes that should not appear in search or AI corpora. */
export const NOINDEX_PATH_PREFIXES = ["/app", "/results", "/api"];
