import { GITHUB_REPO_URL } from "@/lib/seo";

/** Optional override, e.g. Discord invite — falls back to GitHub Discussions. */
const COMMUNITY_HUB =
  process.env.NEXT_PUBLIC_COMMUNITY_URL?.trim() ||
  `${GITHUB_REPO_URL}/discussions`;

export const COMMUNITY_LINKS = {
  hub: COMMUNITY_HUB,
  hubLabel: process.env.NEXT_PUBLIC_COMMUNITY_URL?.trim()
    ? "Community chat"
    : "GitHub Discussions",
  issues: `${GITHUB_REPO_URL}/issues`,
  repo: GITHUB_REPO_URL,
} as const;
