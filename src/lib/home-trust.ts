import { GITHUB_REPO_URL, SOCIAL } from "@/lib/seo";

export const HOME_TRUST_BADGES = [
  { label: "Open source", href: GITHUB_REPO_URL, detail: "Apache-2.0" },
  { label: "Security model", href: "/security", detail: "No training on your code" },
  { label: "npm package", href: SOCIAL.npm, detail: "repairo-cli" },
  { label: "Engine tests", href: `${GITHUB_REPO_URL}/actions`, detail: "CI on main" },
] as const;
