/** Home-page FAQ content. Plain module so both the client accordion and server JSON-LD can import it. */
export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  hasSpecialContent?: boolean;
}

export const FAQ_LIST: FaqItem[] = [
  {
    id: "codeStorage",
    question: "What happens to our code?",
    answer:
      "For a repair job we fetch the OpenAPI spec and consumer files you point us at, process them in memory, and use that output to build a diff. We do not sell your code or use it to train third-party models. Workspace metadata (integration config, run status, PR links) is stored in our database; file contents are not kept as a long-term archive after the job finishes. See /security for OAuth scopes and retention details.",
  },
  {
    id: "whatItDoes",
    question: "What does Repairo fix?",
    answer:
      "Breaking and risky changes in third-party OpenAPI specs — renames, removed fields, URL moves, enum changes, and similar contract drift. Repairo diffs the spec, finds affected TypeScript, JavaScript, Python, and Go call sites where we have transforms, runs compiler or syntax checks when configured, and opens a GitHub pull request for your team to review. It is not a general-purpose code generator.",
  },
  {
    id: "whyUse",
    question: "Why would my team use this?",
    answer:
      "Because API updates still land in your repo as surprise compile errors, flaky tests, or production incidents. Repairo shortens the loop from “the vendor changed something” to “here is the diff that updates our clients,” with evidence attached instead of a manual file-by-file hunt.",
  },
  {
    id: "modelUpdate",
    question: "What happens when an API changes?",
    answer:
      "On hosted plans, Repairo can poll vendor OpenAPI pins or react to spec changes in your repo (GitHub App or webhooks, depending on setup). When a breaking change is detected, it maps impact, prepares patches, and opens a PR. Nothing merges automatically — you review and merge on your schedule.",
  },
  {
    id: "securityVuln",
    question: "Does Repairo find security vulnerabilities too?",
    answer:
      "No. Repairo focuses on API contract drift and client repairs, not CVE scanning or dependency advisories. Use your existing security tooling for vulns; use Repairo when the API shape changed and your integration code needs to catch up.",
  },
  {
    id: "setupDifficulty",
    question: "How do I get started?",
    answer:
      "Fastest path: try the in-browser demo at /demo, or install the CLI (npm i -g repairo-cli) against a local repo. For your own GitHub repo, install the GitHub App or sign in to the workspace, pick a repository, and tell Repairo where the OpenAPI spec and client files live. Vendor agents add remote spec watching once an integration is configured.",
  },
];
