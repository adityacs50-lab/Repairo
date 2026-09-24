"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { WaitlistForm } from "@/components/WaitlistForm";
import { FORMSUBMIT_ENDPOINT } from "@/lib/contact";
import { SOCIAL } from "@/lib/seo";
import { FAQ_LIST } from "@/lib/faq";
import {
  ENGINE_METRICS,
  HOMEPAGE_PROBLEM,
  VENDOR_MARKS,
} from "@/lib/social-proof";
import { MarketingHeader } from "@/components/MarketingHeader";
import { HomeCliSandbox } from "@/components/HomeCliSandbox";
import { HomePatchPreview } from "@/components/HomePatchPreview";
import { HomeTrustBadges } from "@/components/HomeTrustBadges";
import { HomeVendorStatus } from "@/components/HomeVendorStatus";
import { HomeCommunityBand } from "@/components/HomeCommunityBand";
import { HomeHeroTerminal } from "@/components/HomeHeroTerminal";
import { HomeVerifyPreview } from "@/components/HomeVerifyPreview";
import { HomePrReviewPreview } from "@/components/HomePrReviewPreview";

const GITHUB_APP_INSTALL_URL = `https://github.com/apps/${
  process.env.NEXT_PUBLIC_GITHUB_APP_SLUG?.trim() || "repairo-ai"
}/installations/new`;

const PROVIDERS_AVAILABLE = [
  { name: "Stripe", note: "OpenAPI watch + AST repair" },
  { name: "OpenAI", note: "Platform & Chat APIs" },
  { name: "Anthropic", note: "Messages API / SDK drift" },
  { name: "Supabase", note: "Management API contract" },
  { name: "Google Gemini", note: "Generative AI Discovery" },
  { name: "GitHub REST", note: "Official OpenAPI pin" },
] as const;

const PROVIDERS_UPCOMING = [
  { name: "Clerk", note: "Auth SDK migrations" },
  { name: "Private OpenAPI", note: "Enterprise / VPC" },
  { name: "Custom vendors", note: "Team-pinned specs" },
] as const;

type TabId = "impact" | "repair" | "verify";

interface TabContent {
  eyebrow: string;
  title: string;
  description: string;
  statusText: string;
  statusType: "review" | "verified";
  rows: Array<{
    label: string;
    code: string;
    stateText: string;
    stateType: "neutral" | "review" | "verified";
  }>;
  foot: [string, string, string];
}

const TAB_DATA: Record<TabId, TabContent> = {
  impact: {
    eyebrow: "Impact",
    title: "Which files actually call this API?",
    description:
      "From the OpenAPI diff we list call sites and types that reference the changed field or route — file and line, not a heatmap.",
    statusText: "Needs review",
    statusType: "review",
    rows: [
      { label: "stripe-node", code: "src/payments/customer.ts", stateText: "12 references", stateType: "neutral" },
      { label: "stripe-python", code: "src/shipments_client.py", stateText: "breaking", stateType: "review" },
      { label: "billing.sync", code: "src/jobs/reconcile.ts", stateText: "indirect", stateType: "neutral" },
    ],
    foot: ["confidence / 0.86", "provenance / vendor diff + compiler", "review / required"],
  },
  repair: {
    eyebrow: "Repair",
    title: "A diff, not a rewrite.",
    description:
      "We apply small AST edits where the spec change is unambiguous. If we are not sure, we flag it — we do not silently guess.",
    statusText: "Generated",
    statusType: "review",
    rows: [
      { label: "paymentIntents.create", code: "src/payments/customer.ts", stateText: "migrated", stateType: "review" },
      { label: "customer.default_source", code: "src/payments/customer.ts", stateText: "renamed", stateType: "review" },
      { label: "charges.retrieve", code: "src/jobs/reconcile.ts", stateText: "unaffected", stateType: "neutral" },
    ],
    foot: ["confidence / 0.94", "provenance / ts-morph + compiler AST", "review / optional"],
  },
  verify: {
    eyebrow: "Verify",
    title: "Does it still compile?",
    description:
      "TypeScript goes through tsc when we can. Python has to parse. We run your test script if the repo defines one.",
    statusText: "Passed",
    statusType: "verified",
    rows: [
      { label: "tsc --noEmit", code: "0 type errors", stateText: "passed", stateType: "verified" },
      { label: "python syntax", code: "balanced tokens", stateText: "passed", stateType: "verified" },
      { label: "vitest run", code: "48 / 48 tests passing", stateText: "passed", stateType: "verified" },
    ],
    foot: ["confidence / 1.00", "provenance / tsc + Python syntax gate", "review / ready to ship"],
  },
};

export function HomePage() {
  const [activeTab, setActiveTab] = useState<TabId>("impact");
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormLoading(true);
    const form = e.currentTarget;
    const data = new FormData(form);
    try {
      const response = await fetch(FORMSUBMIT_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          name: data.get("name"),
          email: data.get("email"),
          message: data.get("team"),
          _subject: "New Demo Request - Repairo",
          _honey: "",
        }),
      });
      if (response.ok) {
        setFormSubmitted(true);
      }
    } catch {
      // keep form visible so they can retry
    } finally {
      setFormLoading(false);
    }
  };

  const currentTab = TAB_DATA[activeTab];

  return (
    <main id="top">
      <MarketingHeader variant="warp" />

      {/* 2. HERO SECTION */}
      <section className="hero-section section-rule">
        <div className="hero-copy">
          <div>
            <p className="eyebrow">OpenAPI diff → repair PR</p>
            <h1>Dependabot updated the package. The build is still broken.</h1>
            <p className="hero-lede">
              Repairo diffs the vendor spec, finds the call sites that still use the old shape, and
              opens a PR with patches that typecheck. You merge when it looks right.
            </p>
            <div className="hero-actions">
              <Link className="button button-dark" href="/demo">
                Try the demo
              </Link>
              <a
                className="button button-outline"
                href="https://www.npmjs.com/package/repairo-cli"
                rel="noreferrer"
                target="_blank"
              >
                Install CLI
              </a>
            </div>
            <p className="hero-promo mono-label">
              OpenAPI diff · impact map · PR you merge ·{" "}
              <a
                className="hero-promo-link"
                href={GITHUB_APP_INSTALL_URL}
                rel="noreferrer"
                target="_blank"
              >
                GitHub App
              </a>
            </p>
            <div className="hero-trust-marquee" aria-label="Available vendors and install command">
              <div className="hero-trust-track">
                {[0, 1].map((copy) => (
                  <p
                    key={copy}
                    className="hero-trust"
                    aria-hidden={copy > 0 ? true : undefined}
                  >
                    Languages: TypeScript · JavaScript · Python · Go
                    <span className="hero-trust-sep" aria-hidden="true">
                      /
                    </span>
                    Available: Stripe · OpenAI · Anthropic · Supabase · Gemini · GitHub
                    <span className="hero-trust-sep" aria-hidden="true">
                      /
                    </span>
                    <a
                      href="https://www.npmjs.com/package/repairo-cli"
                      rel="noreferrer"
                      target="_blank"
                      tabIndex={copy > 0 ? -1 : undefined}
                    >
                      npm i -g repairo-cli
                    </a>
                    <span className="hero-trust-sep" aria-hidden="true">
                      ·
                    </span>
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
        <HomeHeroTerminal />
      </section>

      <HomeCliSandbox />

      {/* 3. SOCIAL PROOF */}
      <section className="social-section section-rule" id="proof">
        <div className="social-proof-stack">
          <div className="home-logo-strip" aria-label="Vendors Repairo watches">
            <p className="mono-label">Vendors we watch today</p>
            <div className="home-logo-strip-scroll">
              <ul className="logo-strip-list">
                {VENDOR_MARKS.map((name) => (
                  <li key={name} className="logo-mark">
                    {name}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="home-proof-grid">
            <figure className="home-proof-card social-quote-block">
              <p className="eyebrow">{HOMEPAGE_PROBLEM.eyebrow}</p>
              <blockquote className="social-quote social-quote-sm">
                {HOMEPAGE_PROBLEM.quote}
              </blockquote>
            </figure>
            <figure className="home-proof-card home-proof-card--trust social-quote-block">
              <p className="eyebrow">CLI + engine</p>
              <blockquote className="social-quote social-quote-sm">
                The same repair path runs on your laptop: <code>npm i -g repairo-cli</code>, point it
                at a repo, read the diff before anything hits GitHub.
              </blockquote>
              <figcaption className="social-attrib">
                <a className="text-link" href={SOCIAL.npm} rel="noreferrer" target="_blank">
                  npm <span aria-hidden="true" className="arrow-mark">↗</span>
                </a>
                <span className="hero-trust-sep" aria-hidden="true">
                  /
                </span>
                <a className="text-link" href={SOCIAL.github} rel="noreferrer" target="_blank">
                  GitHub <span aria-hidden="true" className="arrow-mark">↗</span>
                </a>
              </figcaption>
            </figure>
          </div>

          <HomeTrustBadges />

          <div className="home-metrics-strip" aria-label="Engine-verified metrics">
            {ENGINE_METRICS.map((m) => (
              <div key={m.label} className="home-metric-card">
                <span className="metric-value">{m.value}</span>
                <span className="metric-label">{m.label}</span>
              </div>
            ))}
          </div>
          <p className="home-metrics-footnote">
            Numbers from our test suite and vendor catalog — not customer analytics.
          </p>
        </div>
      </section>

      {/* 4. WORKFLOW SECTION */}
      <section className="workflow-section section-rule" id="workflow">
        <div className="section-intro">
          <p className="eyebrow">How it works</p>
          <h2>Four steps, same order every time.</h2>
          <p>
            Diff the spec, map the repo, generate the patch, open the PR. Nothing auto-merges.
          </p>
        </div>
        <div className="workflow-list">
          <div className="workflow-step">
            <div className="step-number">01</div>
            <div className="step-copy">
              <p className="mono-label">Diff</p>
              <p>What changed in the vendor OpenAPI?</p>
            </div>
          </div>
          <div className="workflow-step">
            <div className="step-number">02</div>
            <div className="step-copy">
              <p className="mono-label">Impact</p>
              <p>Which files still use the old API?</p>
            </div>
          </div>
          <div className="workflow-step">
            <div className="step-number">03</div>
            <div className="step-copy">
              <p className="mono-label">Repair</p>
              <p>Patch + typecheck (or syntax check)</p>
            </div>
          </div>
          <div className="workflow-step">
            <div className="step-number">04</div>
            <div className="step-copy">
              <p className="mono-label">PR</p>
              <p>You review and merge on GitHub</p>
            </div>
          </div>
        </div>
      </section>

      <HomePatchPreview />

      {/* 4. PROOF SECTION / WHY REPAIRO */}
      <section className="proof-section section-rule" id="why-repairo">
        <div className="proof-media">
          <HomeVerifyPreview />
        </div>
        <div className="proof-copy">
          <p className="eyebrow">Why bother</p>
          <h2>CI should not be the first place you learn the API moved.</h2>
          <p>
            When Stripe or OpenAI ships a breaking field rename, someone on your team still greps the
            repo. Repairo is the grep — plus a proposed fix and a compile check.
          </p>
          <a className="text-link" href="#review">
            See the repair UI <span aria-hidden="true" className="arrow-mark">↗</span>
          </a>
        </div>
      </section>

      {/* 5. PRODUCT / INTERACTIVE REVIEW SECTION */}
      <section className="product-section section-rule" id="review">
        <div className="section-intro">
          <p className="eyebrow">What you get in the PR</p>
          <h2>Detected, patched, checked — labeled separately.</h2>
          <p>
            Flip through impact, the diff, and verify. Optional AI only suggests enum mappings when
            the spec alone is ambiguous; it never writes files by itself.
          </p>
        </div>
        <div className="product-demo">
          <div className="tabs" role="tablist" aria-label="Repair system views">
            <button
              type="button"
              onClick={() => setActiveTab("impact")}
              className={`tab ${activeTab === "impact" ? "tab-active" : ""}`}
              role="tab"
              aria-selected={activeTab === "impact"}
            >
              Impact
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("repair")}
              className={`tab ${activeTab === "repair" ? "tab-active" : ""}`}
              role="tab"
              aria-selected={activeTab === "repair"}
            >
              Repair
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("verify")}
              className={`tab ${activeTab === "verify" ? "tab-active" : ""}`}
              role="tab"
              aria-selected={activeTab === "verify"}
            >
              Verify
            </button>
          </div>
          <div className="demo-panel">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
              >
                <div className="demo-panel-head">
                  <div>
                    <p className="mono-label">{currentTab.eyebrow}</p>
                    <h3>{currentTab.title}</h3>
                    <p>{currentTab.description}</p>
                  </div>
                  <span
                    className={`status-tag ${
                      currentTab.statusType === "verified" ? "status-verified" : "status-review"
                    }`}
                  >
                    {currentTab.statusText}
                  </span>
                </div>
                <div className="demo-rows">
                  {currentTab.rows.map((row, i) => (
                    <div key={i} className="demo-row">
                      <span className="row-label">{row.label}</span>
                      <code>{row.code}</code>
                      <span
                        className={`row-state ${
                          row.stateType === "verified"
                            ? "state-verified"
                            : row.stateType === "review"
                            ? "state-review"
                            : "state-neutral"
                        }`}
                      >
                        {row.stateText}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="demo-panel-foot">
                  <span>{currentTab.foot[0]}</span>
                  <span>{currentTab.foot[1]}</span>
                  <span>{currentTab.foot[2]}</span>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* 6. HUMAN REVIEW SECTION */}
      <section className="human-section section-rule">
        <div className="human-copy">
          <p className="eyebrow">You own the merge</p>
          <h2>We open the PR. You decide.</h2>
          <p>
            Repairo is not an agent that force-pushes to main. It shows what changed in the spec,
            what it touched in your code, and whether tsc complained.
          </p>
          <div className="control-list">
            <span>Detected</span>
            <span>Inferred</span>
            <span>Generated</span>
            <span>Verified</span>
          </div>
        </div>
        <div className="human-media">
          <HomePrReviewPreview />
        </div>
      </section>

      {/* 8. PROVIDER COVERAGE */}
      <section className="providers-section section-rule" id="providers">
        <div className="section-intro">
          <p className="eyebrow">Vendors</p>
          <h2>Who we watch today.</h2>
          <p>
            Public OpenAPI or Discovery pins for the list on the left. Everything else is on the
            roadmap — we would rather say &quot;not yet&quot; than fake it.
          </p>
        </div>
        <div className="provider-matrix">
          <div className="provider-col">
            <p className="mono-label">Available</p>
            <ul className="provider-list">
              {PROVIDERS_AVAILABLE.map((p) => (
                <li key={p.name}>
                  <span className="provider-name">{p.name}</span>
                  <span className="provider-note">{p.note}</span>
                </li>
              ))}
            </ul>
            <Link className="text-link" href="/agents">
              Browse agents <span aria-hidden="true" className="arrow-mark">
                ↗
              </span>
            </Link>
          </div>
          <div className="provider-col">
            <p className="mono-label">Upcoming</p>
            <ul className="provider-list">
              {PROVIDERS_UPCOMING.map((p) => (
                <li key={p.name}>
                  <span className="provider-name">{p.name}</span>
                  <span className="provider-note">{p.note}</span>
                </li>
              ))}
            </ul>
            <a className="text-link" href="#waitlist">
              Get notified <span aria-hidden="true" className="arrow-mark">
                ↗
              </span>
            </a>
          </div>
        </div>
        <HomeVendorStatus />
      </section>

      {/* 9. SECURITY BOUNDARY */}
      <section className="security-section section-rule" id="security">
        <div className="section-intro">
          <p className="eyebrow">Security</p>
          <h2>Your code is not our training set.</h2>
          <p>
            Files are read for a repair job, processed in memory, then dropped. PRs do not
            auto-merge. Details on /security.
          </p>
        </div>
        <div className="security-list">
          <div className="security-item">
            <p className="mono-label">01 / CODE</p>
            <p>Spec and consumer files are fetched for a repair, processed in memory for that job, then discarded. We do not train on customer code.</p>
          </div>
          <div className="security-item">
            <p className="mono-label">02 / ACCESS</p>
            <p>GitHub OAuth with <code>repo</code> and <code>read:user</code> only. Tokens encrypted at rest. You revoke anytime in GitHub.</p>
          </div>
          <div className="security-item">
            <p className="mono-label">03 / REVIEW</p>
            <p>Repairo opens a PR with evidence and stops. A human on your side merges — or closes it.</p>
          </div>
        </div>
        <Link className="text-link security-more" href="/security">
          Full security model <span aria-hidden="true" className="arrow-mark">↗</span>
        </Link>
      </section>

      {/* 10. PUBLIC EVIDENCE */}
      <section className="evidence-section section-rule" id="evidence">
        <div className="section-intro">
          <p className="eyebrow">Fixture you can replay</p>
          <h2>
            Stripe removes <code className="evidence-inline">customer.source</code> — we ship a PR
            that still typechecks.
          </h2>
          <p>
            Same story as the demo: spec diff, file list, patch, then{" "}
            <code className="evidence-inline">tsc --noEmit</code>. Clone the repo and run{" "}
            <code className="evidence-inline">npm test</code> if you want proof.
          </p>
        </div>
        <div className="evidence-metrics">
          <div className="evidence-metric">
            <span className="metric-value">2</span>
            <span className="metric-label">Shipping fixture files repaired cross-domain</span>
          </div>
          <div className="evidence-metric">
            <span className="metric-value">tsc</span>
            <span className="metric-label">Clean compile on repaired consumers</span>
          </div>
          <div className="evidence-metric">
            <span className="metric-value">113/113</span>
            <span className="metric-label">Engine suite green (local CI)</span>
          </div>
          <div className="evidence-metric">
            <span className="metric-value">fail-closed</span>
            <span className="metric-label">Ambiguous AI mappings never auto-merge</span>
          </div>
        </div>
        <ol className="evidence-steps">
          <li>
            <p className="mono-label">01 / Detect</p>
            <p>
              OpenAPI pin shows <code>customer.source</code> removed on the Stripe API version your
              SDK targets.
            </p>
          </li>
          <li>
            <p className="mono-label">02 / Impact</p>
            <p>
              AST scan marks <code>src/payments/customer.ts</code> and related jobs — references,
              not guesses.
            </p>
          </li>
          <li>
            <p className="mono-label">03 / Repair</p>
            <p>AST rewrite on the impacted lines — not a whole-file LLM paste.</p>
          </li>
          <li>
            <p className="mono-label">04 / Verify</p>
            <p>
              Typecheck (and tests when configured) must pass before Repairo opens the pull
              request.
            </p>
          </li>
        </ol>
        <div className="evidence-actions">
          <Link className="text-link" href="/docs">
            Read the docs path <span aria-hidden="true" className="arrow-mark">
              ↗
            </span>
          </Link>
          <a className="text-link" href="#demo">
            Book this walkthrough live <span aria-hidden="true" className="arrow-mark">
              ↗
            </span>
          </a>
          <a className="text-link" href={SOCIAL.github} rel="noreferrer" target="_blank">
            Inspect tests on GitHub <span aria-hidden="true" className="arrow-mark">
              ↗
            </span>
          </a>
        </div>
      </section>

      {/* FAQ */}
      <section className="pricing-faq-section section-rule" id="faq">
        <div className="section-intro pricing-faq-intro">
          <p className="eyebrow">FAQ</p>
          <h2>FAQ</h2>
          <p>Short answers. No sales script.</p>
        </div>
        <div className="pricing-faq-list">
          {FAQ_LIST.map((item) => (
            <details key={item.id} className="pricing-faq-item">
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      {/* 11. DEMO BOOKING FORM SECTION */}
      <section className="demo-section" id="demo">
        <div className="demo-intro">
          <p className="eyebrow">Talk to us</p>
          <h2>Walk through your API on a call.</h2>
          <p>
            Tell us which vendor bit you and we will run the tool on a similar change live. No deck.
          </p>
        </div>
        <div className="demo-form-wrap">
          {formSubmitted ? (
            <div className="form-success">
              <p className="mono-label" style={{ color: "var(--repairo-teal)" }}>
                REQUEST RECEIVED
              </p>
              <h3>We&apos;ll be in touch.</h3>
              <p>Your walkthrough will be focused on your specific integration change.</p>
            </div>
          ) : (
            <form className="demo-form" onSubmit={handleFormSubmit}>
              <label htmlFor="name">
                Name
                <input id="name" type="text" placeholder="Your name" required name="name" />
              </label>
              <label htmlFor="email">
                Work email
                <input id="email" type="email" placeholder="you@company.com" required name="email" />
              </label>
              <label htmlFor="team">
                What are you working on?
                <textarea
                  id="team"
                  name="team"
                  placeholder="Your APIs, stack, or a breaking change you've hit recently"
                  rows={3}
                />
              </label>
              <button className="button button-dark form-submit" type="submit" disabled={formLoading}>
                {formLoading ? "Sending..." : "Request a demo"}{" "}
                <span aria-hidden="true" className="arrow-mark">↗</span>
              </button>
              <p className="form-note">
                No pitch deck required. Just the integration you need to understand.
              </p>
            </form>
          )}
        </div>
      </section>

      {/* 9. BETA WAITLIST (secondary capture) */}
      <section className="demo-section section-rule" id="waitlist">
        <div className="demo-intro">
          <p className="eyebrow">Hosted workspace</p>
          <h2>Early access list</h2>
          <p>
            Try /demo first. Leave an email if you want the GitHub-connected workspace when we open
            the next batch.
          </p>
        </div>
        <div className="demo-form-wrap" style={{ maxWidth: "28rem" }}>
          <WaitlistForm />
        </div>
      </section>

      <HomeCommunityBand />

      {/* 13. PRICING PATH */}
      <section className="pricing-strip section-rule" id="pricing-path">
        <p className="mono-label">PRICING</p>
        <p className="pricing-strip-copy">
          Free CLI on npm · Hosted Free for public repos · Pro from $79/mo per org
        </p>
        <Link className="text-link" href="/pricing">
          See plans &amp; FAQ <span aria-hidden="true" className="arrow-mark">↗</span>
        </Link>
      </section>

      {/* 14. FOOTER */}
      <footer className="site-footer section-rule">
        <div>
          <Link href="#top" className="wordmark" aria-label="Repairo AI home">
            <span style={{ fontFamily: '"Pixelify Sans", monospace' }}>Repairo</span>
            <span className="wordmark-ai" style={{ fontFamily: "var(--font-sans)" }}>AI</span>
          </Link>
          <p className="footer-note">Spec diff · call sites · PR you merge</p>
        </div>
        <div className="footer-links">
          <div>
            <p className="mono-label">Explore</p>
            <a href="#workflow">How it works</a>
            <a href="#providers">Providers</a>
            <a href="#faq">FAQ</a>
            <a href="#security">Security</a>
            <Link href="/docs">Docs</Link>
            <Link href="/changelog">Changelog</Link>
          </div>
          <div>
            <p className="mono-label">Company</p>
            <Link href="/pricing">Pricing</Link>
            <Link href="/demo">Demo</Link>
            <a href="#demo">Book a demo</a>
            <a href="#waitlist">Request access</a>
            <a href={SOCIAL.npm} rel="noreferrer" target="_blank">
              npm
            </a>
            <a href={SOCIAL.github} rel="noreferrer" target="_blank">
              GitHub
            </a>
            <a href="#community">Community</a>
            <Link href="/changelog">Changelog</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
