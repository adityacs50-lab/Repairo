/** Shared release notes for /changelog and homepage feed. */

export type ChangelogEntry = {
  date: string;
  title: string;
  items: string[];
};

export const CHANGELOG_ENTRIES: ChangelogEntry[] = [
  {
    date: "2026-09-14",
    title: "Go joins TypeScript/JavaScript/Python as a fully-repaired language",
    items: [
      "Deterministic Go repairs for URL literals, enum renames, and required map fields",
      "CLI repair scopes transforms to impacted files only",
    ],
  },
  {
    date: "2026-09-14",
    title: "First-class Python consumer repair",
    items: [
      "GitHub App and CLI scan .py consumers",
      "Python syntax gate before auto-fix PRs",
    ],
  },
  {
    date: "2026-07-26",
    title: "Vendor poll cron + multi-language patches + agent marketplace",
    items: [
      "Secured /api/cron/poll-vendors",
      "Public /agents install pages",
    ],
  },
];
