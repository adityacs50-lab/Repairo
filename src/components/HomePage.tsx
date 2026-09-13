"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

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

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setTimeout(() => {
      setFormLoading(false);
      setFormSubmitted(true);
    }, 600);
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
            <a href="#why-repairo">Why Repairo</a>
            <a href="#review">For engineering teams</a>
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
              <a className="button button-dark" href="#demo">
                Book a demo <span aria-hidden="true" className="arrow-mark">↗</span>
              </a>
              <a className="text-link" href="#workflow">
                See the repair workflow <span aria-hidden="true" className="arrow-mark">↗</span>
              </a>
            </div>
          </div>
        </div>
        <div className="hero-art-wrap">
          <div className="asset-frame hero-art-frame">
            <Image
              alt="Abstract API impact network and breaking change visualization"
              width={1600}
              height={1000}
              priority
              className="hero-art"
              src="/assets/repairo-api-diff.png"
            />
            <div className="asset-caption">
              <span>CHANGE / 0001</span>
              <span>VISIBLE BEFORE CI</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. WORKFLOW SECTION */}
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

      {/* 7. DEMO BOOKING FORM SECTION */}
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

      {/* 8. FOOTER */}
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
            <a href="#why-repairo">Why Repairo</a>
            <a href="#demo">Book a demo</a>
          </div>
          <div>
            <p className="mono-label">Repairo AI</p>
            <span>For engineering teams</span>
            <span>Built for review</span>
            <span>2026</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
