"use client";

import { useState } from "react";
import Link from "next/link";
import { CONTACT_INBOX, FORMSUBMIT_ENDPOINT } from "@/lib/contact";

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [topic, setTopic] = useState("enterprise");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">(
    "idle",
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      const response = await fetch(FORMSUBMIT_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          company,
          topic,
          message,
          _subject: `[Repairo] ${topic} — ${company || name}`,
          _honey: "",
        }),
      });
      setStatus(response.ok ? "sent" : "error");
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <p className="text-sm text-safe">
        Thanks — we received your message at{" "}
        <a href={`mailto:${CONTACT_INBOX}`} className="text-fg underline">
          {CONTACT_INBOX}
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
      {status === "error" && (
        <p className="text-xs text-accent-red">
          Something went wrong. Email us at {CONTACT_INBOX}.
        </p>
      )}
      <p className="text-xs text-muted-dim">
        Prefer docs?{" "}
        <Link href="/docs" className="text-fg underline">
          Read the docs
        </Link>
      </p>
      <button
        type="submit"
        disabled={status === "loading"}
        className="btn-primary !py-2 !text-sm"
      >
        {status === "loading" ? "Sending..." : "Send message"}
      </button>
    </form>
  );
}
