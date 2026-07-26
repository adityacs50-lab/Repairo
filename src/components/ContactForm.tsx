"use client";

import { useState } from "react";
import Link from "next/link";

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [topic, setTopic] = useState("enterprise");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const subject = encodeURIComponent(`[Repairo] ${topic} — ${company || name}`);
    const body = encodeURIComponent(
      `Name: ${name}\nEmail: ${email}\nCompany: ${company}\nTopic: ${topic}\n\n${message}`,
    );
    window.location.href = `mailto:hello@repairo.dev?subject=${subject}&body=${body}`;
    setSent(true);
  }

  if (sent) {
    return (
      <p className="text-sm text-safe">
        Your mail client should open with a draft. If it didn’t, email{" "}
        <a href="mailto:hello@repairo.dev" className="text-fg underline">
          hello@repairo.dev
        </a>
        .
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1 text-sm">
          <span className="font-mono text-[11px] uppercase text-muted-dim">
            Name
          </span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-line bg-bg px-3 py-2 text-sm text-fg outline-none focus:border-accent"
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-mono text-[11px] uppercase text-muted-dim">
            Work email
          </span>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-line bg-bg px-3 py-2 text-sm text-fg outline-none focus:border-accent"
          />
        </label>
      </div>
      <label className="block space-y-1 text-sm">
        <span className="font-mono text-[11px] uppercase text-muted-dim">
          Company
        </span>
        <input
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          className="w-full border border-line bg-bg px-3 py-2 text-sm text-fg outline-none focus:border-accent"
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span className="font-mono text-[11px] uppercase text-muted-dim">
          Topic
        </span>
        <select
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="w-full border border-line bg-bg px-3 py-2 text-sm text-fg outline-none focus:border-accent"
        >
          <option value="enterprise">Enterprise / Pro</option>
          <option value="security">Security review</option>
          <option value="partnership">Design partner</option>
          <option value="support">Product support</option>
        </select>
      </label>
      <label className="block space-y-1 text-sm">
        <span className="font-mono text-[11px] uppercase text-muted-dim">
          Message
        </span>
        <textarea
          required
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full border border-line bg-bg p-3 text-sm text-fg outline-none focus:border-accent"
        />
      </label>
      <p className="text-xs text-muted-dim">
        Prefer docs?{" "}
        <Link href="/docs" className="text-fg underline">
          Read the docs
        </Link>
      </p>
      <button type="submit" className="btn-primary !py-2 !text-sm">
        Open email draft
      </button>
    </form>
  );
}
