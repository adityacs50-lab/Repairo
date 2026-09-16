import type { NavGroup } from "@/components/ContentPage";

/** Shared sidebar for /docs and nested doc routes. */
export const DOCS_NAV: NavGroup[] = [
  {
    title: "GETTING STARTED",
    items: [
      { href: "/docs#overview", label: "Overview & architecture" },
      { href: "/docs#quickstart", label: "Quickstart" },
      { href: "/docs#cli", label: "CLI installation" },
      { href: "/docs#commands", label: "Command reference" },
    ],
  },
  {
    title: "REFERENCE",
    items: [
      { href: "/docs/architecture", label: "Engine architecture" },
      { href: "/docs/deploy", label: "Self-host on Vercel" },
      { href: "/docs#diffing-engine", label: "OpenAPI diffing" },
      { href: "/docs#impact-mapping", label: "Impact mapping" },
      { href: "/docs#ast-transforms", label: "AST transforms" },
    ],
  },
  {
    title: "INTEGRATIONS",
    items: [
      { href: "/docs#github-app", label: "GitHub App" },
      { href: "/docs#hosted-integrations", label: "Hosted integrations" },
      { href: "/docs#vendors", label: "Supported vendors" },
      { href: "/agents", label: "Vendor agents" },
    ],
  },
  {
    title: "SECURITY",
    items: [
      { href: "/docs#data-handling", label: "Code & data handling" },
      { href: "/docs#oauth", label: "GitHub OAuth scopes" },
      { href: "/security", label: "Security & trust" },
      { href: "/privacy", label: "Privacy policy" },
    ],
  },
];
