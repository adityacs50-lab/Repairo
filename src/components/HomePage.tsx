"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { WaitlistForm } from "@/components/WaitlistForm";
import { FORMSUBMIT_ENDPOINT } from "@/lib/contact";
import {
  DESIGN_PARTNER,
  ENGINE_METRICS,
  VENDOR_MARKS,
} from "@/lib/social-proof";

const SOCIAL = {
  github: "https://github.com/sanjaynandanj/Repairo",
  npm: "https://www.npmjs.com/package/repairo-cli",
} as const;

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
    eyebrow: "02 / semantic impact analysis",
    title: "Know what changed before you touch the code.",
    description:
      "Repairo follows a vendor change through the dependency graph and identifies the application code that needs attention.",
    statusText: "Needs review",
    statusType: "review",
    rows: [
      { label: "stripe-node", code: "src/payments/customer.ts", stateText: "12 references", stateType: "neutral" },
      { label: "customer.source", code: "src/payments/customer.ts", stateText: "breaking", stateType: "review" },
      { label: "billing.sync", code: "src/jobs/reconcile.ts", stateText: "indirect", stateType: "neutral" },
    ],
    foot: ["confidence / 0.86", "provenance / vendor diff + compiler", "review / required"],
  },
  repair: {
    eyebrow: "03 / ast repair generation",
    title: "Propose changes grounded in compiler proof.",
    description:
      "Targeted transforms update symbol paths and method invocations without hallucinating unverified edits.",
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
    eyebrow: "04 / compiler verification",
    title: "Prove the code compiles before opening the PR.",
    description:
      "Repairo runs type checking and test suites in a clean environment to ensure zero runtime drift.",
    statusText: "Passed",
    statusType: "verified",
    rows: [
      { label: "tsc --noEmit", code: "0 type errors", stateText: "passed", stateType: "verified" },
      { label: "vitest run", code: "48 / 48 tests passing", stateText: "passed", stateType: "verified" },
      { label: "ast-integrity", code: "14 nodes verified", stateText: "passed", stateType: "verified" },
    ],
    foot: ["confidence / 1.00", "provenance / TypeScript 5.7", "review / ready to ship"],
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
    <main id="top" className="site-shell">
      {/* 1. SITE HEADER */}
      <header className="site-header">
        <div className="header-inner">
          <Link href="#top" className="wordmark" aria-label="Repairo AI home">
            <span style={{ fontFamily: '"Pixelify Sans", monospace' }}>Repairo</span>
            <span className="wordmark-ai" style={{ fontFamily: '"Figtree", sans-serif' }}>AI</span>
          </Link>
          <nav className="main-nav" aria-label="Main navigation">
            <a href="#workflow">Workflow</a>
            <a href="#providers">Providers</a>
            <a href="#security">Security</a>
            <Link href="/pricing">Pricing</Link>
          </nav>
          <a className="button button-dark button-small" href="#demo">
            Book a demo <span aria-hidden="true" className="arrow-mark">↗</span>
          </a>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="hero-section section-rule">
        <div className="hero-copy">
          <div>
            <p className="eyebrow">AI-ASSISTED API REPAIR / 01</p>
            <h1>When the API changes, know exactly what to repair.</h1>
            <p className="hero-lede">
              Repairo detects breaking third-party API changes, traces their impact into application code, and proposes a compiler-verified repair.
            </p>
            <div className="hero-actions">
              <a
                className="button button-dark"
                href={GITHUB_APP_INSTALL_URL}
                rel="noreferrer"
                target="_blank"
              >
                Install GitHub App <span aria-hidden="true" className="arrow-mark">↗</span>
              </a>
              <Link className="text-link" href="/docs#github-app">
                View docs <span aria-hidden="true" className="arrow-mark">↗</span>
              </Link>
              <a className="text-link" href="#demo">
                Book a demo <span aria-hidden="true" className="arrow-mark">↗</span>
              </a>
            </div>
            <div className="hero-trust-marquee" aria-label="Available vendors and install command">
              <div className="hero-trust-track">
                {[0, 1, 2, 3].map((copy) => (
                  <p
                    key={copy}
                    className="hero-trust"
                    aria-hidden={copy > 0 ? true : undefined}
                  >
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
        <div className="hero-art-wrap">
          <motion.div
            className="asset-frame hero-product-frame"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="hero-product-bar">
              <span>repairo · scan</span>
              <span>tsc --noEmit · pass</span>
            </div>
            <pre className="hero-product-body" aria-label="Example Repairo CLI output">
              <code>{`$ npx repairo-cli scan ./src --vendors stripe,openai
watching 2 vendors · OpenAPI diff · AST impact

stripe   breaking  high   src/payments/customer.ts:42
  customer.source → removed in 2024-06-20
openai   rename    med    src/ai/embeddings.ts:18
  createEmbedding → embeddings.create

2 call sites · compiler-verified repair ready
$ npx repairo-cli repair --open-pr
opened PR #184  fix(stripe): migrate customer.source`}</code>
            </pre>
            <div className="asset-caption">
              <span>PRODUCT / CLI</span>
              <span>EVIDENCE BEFORE MERGE</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 3. SOCIAL PROOF */}
      <section className="social-section section-rule" id="proof">
        <div className="social-proof-stack">
          <div className="logo-strip" aria-label="Vendors Repairo watches">
            <p className="mono-label">Works with</p>
            <ul className="logo-strip-list">
              {VENDOR_MARKS.map((name) => (
                <li key={name} className="logo-mark">
                  {name}
                </li>
              ))}
            </ul>
          </div>

          <div className="social-quotes">
            <figure className="social-quote-block">
              <p className="eyebrow">DESIGN PARTNER</p>
              <blockquote className="social-quote">
                “{DESIGN_PARTNER.beforeCode}
                <code>{DESIGN_PARTNER.code}</code>
                {DESIGN_PARTNER.afterCode}”
              </blockquote>
              <figcaption className="social-attrib">
                <span className="social-attrib-name">{DESIGN_PARTNER.role}</span>
                <span className="hero-trust-sep" aria-hidden="true">
                  /
                </span>
                {DESIGN_PARTNER.org}
              </figcaption>
            </figure>
            <figure className="social-quote-block social-quote-secondary">
              <p className="eyebrow">WORKS WITH</p>
              <blockquote className="social-quote social-quote-sm">
                Apache-2.0 CLI on npm. Public engine suite. Human merge required — including every
                AI-assisted mapping.
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

          <div className="metrics-strip" aria-label="Engine-verified metrics">
            {ENGINE_METRICS.map((m) => (
              <div key={m.label} className="metric-cell">
                <span className="metric-value">{m.value}</span>
                <span className="metric-label">{m.label}</span>
              </div>
            ))}
          </div>
          <p className="metrics-footnote">
            Engine facts from the open catalog, change taxonomy, and test suite — not production
            usage telemetry.
          </p>
        </div>
      </section>

      {/* 4. WORKFLOW SECTION */}
      <section className="workflow-section section-rule" id="workflow">
        <div className="section-intro">
          <p className="eyebrow">THE REPAIR WORKFLOW</p>
          <h2>From external change to reviewable repair.</h2>
          <p>
            One chain from what the vendor changed to what your code needs, with the evidence intact at every step.
          </p>
        </div>
        <div className="workflow-list">
          <div className="workflow-step">
            <div className="step-number">01</div>
            <div className="step-copy">
              <p className="mono-label">API DIFF</p>
              <p>Detect breaking changes</p>
            </div>
          </div>
          <div className="workflow-step">
            <div className="step-number">02</div>
            <div className="step-copy">
              <p className="mono-label">IMPACT ANALYSIS</p>
              <p>Trace semantic impact into your code</p>
            </div>
          </div>
          <div className="workflow-step">
            <div className="step-number">03</div>
            <div className="step-copy">
              <p className="mono-label">AST REPAIR</p>
              <p>Propose compiler-aware changes</p>
            </div>
          </div>
          <div className="workflow-step">
            <div className="step-number">04</div>
            <div className="step-copy">
              <p className="mono-label">COMPILER VERIFY</p>
              <p>Prove the repair builds cleanly</p>
            </div>
          </div>
          <div className="workflow-step">
            <div className="step-number">05</div>
            <div className="step-copy">
              <p className="mono-label">HUMAN REVIEW</p>
              <p>Keep your engineer in control</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. PROOF SECTION / WHY REPAIRO */}
      <section className="proof-section section-rule" id="why-repairo">
        <div className="proof-media">
          <div className="asset-frame proof-art-frame">
            <Image
              alt="Compiler verification workspace with structured code panes"
              width={1200}
              height={900}
              loading="lazy"
              src="/assets/repairo-code-reality.png"
            />
            <div className="asset-caption">
              <span>CODE REALITY</span>
              <span>COMPILER / PASS</span>
            </div>
          </div>
        </div>
        <div className="proof-copy">
          <p className="eyebrow">A CONCRETE WORKFLOW IMPROVEMENT</p>
          <h2>Stop finding vendor breakage only after it reaches CI.</h2>
          <p>
            Repairo turns a brittle integration update into a traceable path: detect the API diff, locate the affected code, generate a repair, then verify what the compiler can prove.
          </p>
          <div className="proof-stat">
            <span className="stat-number">01</span>
            <span>change surface mapped before manual repair begins</span>
          </div>
          <a className="text-link" href="#review">
            See what stays in your hands <span aria-hidden="true" className="arrow-mark">↗</span>
          </a>
        </div>
      </section>

      {/* 5. PRODUCT / INTERACTIVE REVIEW SECTION */}
      <section className="product-section section-rule" id="review">
        <div className="section-intro">
          <p className="eyebrow">EVIDENCE AT THE AMBIGUITY BOUNDARY</p>
          <h2>AI where it helps. Judgment where it matters.</h2>
          <p>
            Switch between the parts of the repair system. Each result separates what was detected, inferred, generated, and verified.
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
          <p className="eyebrow">HUMAN REVIEW / ALWAYS IN THE LOOP</p>
          <h2>Make the next safe change, not just the next change.</h2>
          <p>
            Repairo does not blindly fix arbitrary code. It keeps confidence, provenance, compiler results, limitations, and the exact review boundary visible to the engineer who owns the integration.
          </p>
          <div className="control-list">
            <span>Detected</span>
            <span>Inferred</span>
            <span>Generated</span>
            <span>Verified</span>
          </div>
        </div>
        <div className="human-media">
          <div className="asset-frame human-art-frame">
            <Image
              alt="Engineer reviewing an API repair workspace"
              width={1200}
              height={900}
              loading="lazy"
              src="/assets/repairo-human-review.png"
            />
            <div className="asset-caption">
              <span>FOCUS &amp; CONTROL</span>
              <span>REVIEW / REQUIRED</span>
            </div>
          </div>
        </div>
      </section>

      {/* 8. PROVIDER COVERAGE */}
      <section className="providers-section section-rule" id="providers">
        <div className="section-intro">
          <p className="eyebrow">PROVIDER COVERAGE</p>
          <h2>Available now. Clear about what&apos;s next.</h2>
          <p>
            Live agents watch public OpenAPI (and Discovery) pins. Upcoming vendors ship when the
            contract path is solid — we don&apos;t pretend coverage we don&apos;t have.
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
      </section>

      {/* 9. SECURITY BOUNDARY */}
      <section className="security-section section-rule" id="security">
        <div className="section-intro">
          <p className="eyebrow">TRUST BOUNDARY</p>
          <h2>Your source stays under your control.</h2>
          <p>
            Repairo is built for teams that will not send a repo to a model to “see what happens.”
            Processing is job-scoped. Pull requests never auto-merge.
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
          <p className="eyebrow">PUBLIC EVIDENCE</p>
          <h2>
            Stripe <code className="evidence-inline">customer.source</code> → compile-checked
            repair.
          </h2>
          <p>
            A concrete walkthrough of the loop peers ask for: vendor contract move, call-site
            impact, AST patch, then <code className="evidence-inline">tsc --noEmit</code> before
            the PR.
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
            <p>
              Deterministic transform migrates the call path; confidence and provenance travel with
              the diff.
            </p>
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

      {/* 11. DEMO BOOKING FORM SECTION */}
      <section className="demo-section" id="demo">
        <div className="demo-intro">
          <p className="eyebrow">SEE THE REPAIR PATH</p>
          <h2>Bring your hardest integration change.</h2>
          <p>
            Book a technical walkthrough of how Repairo moves from API diff to compiler-verified repair.
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
                What are you repairing?
                <textarea
                  id="team"
                  name="team"
                  placeholder="A third-party API or integration you maintain"
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
          <p className="eyebrow">PRIVATE BETA</p>
          <h2>Not ready for a walkthrough?</h2>
          <p>
            Join the waitlist with Google or work email. We only email when beta access opens.
          </p>
        </div>
        <div className="demo-form-wrap" style={{ maxWidth: "28rem" }}>
          <WaitlistForm />
        </div>
      </section>

      {/* 13. PRICING PATH */}
      <section className="pricing-strip section-rule" id="pricing-path">
        <p className="mono-label">PRICING</p>
        <p className="pricing-strip-copy">
          Free CLI on npm · Hosted Free for early teams · Pro from $29/mo
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
            <span className="wordmark-ai" style={{ fontFamily: '"Figtree", sans-serif' }}>AI</span>
          </Link>
          <p className="footer-note">API change. Impact. Repair. Verified.</p>
        </div>
        <div className="footer-links">
          <div>
            <p className="mono-label">Explore</p>
            <a href="#workflow">Workflow</a>
            <a href="#providers">Providers</a>
            <a href="#evidence">Evidence</a>
            <a href="#security">Security</a>
            <Link href="/docs">Docs</Link>
          </div>
          <div>
            <p className="mono-label">Company</p>
            <Link href="/pricing">Pricing</Link>
            <a href="#demo">Book a demo</a>
            <a href="#waitlist">Beta waitlist</a>
            <a href={SOCIAL.npm} rel="noreferrer" target="_blank">
              npm
            </a>
            <a href={SOCIAL.github} rel="noreferrer" target="_blank">
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
