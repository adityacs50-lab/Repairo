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
      <div className="form-success" style={{ paddingTop: 0 }}>
        <p className="mono-label" style={{ color: "var(--repairo-teal)" }}>
          MESSAGE SENT
        </p>
        <p>
          Thanks — we received your note at{" "}
          <a href={`mailto:${CONTACT_INBOX}`}>{CONTACT_INBOX}</a>.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="demo-form contact-form">
      <div className="contact-form-row">
        <label htmlFor="contact-name">
          Name
          <input
            id="contact-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label htmlFor="contact-email">
          Work email
          <input
            id="contact-email"
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
      </div>
      <label htmlFor="contact-company">
        Company
        <input
          id="contact-company"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        />
      </label>
      <label htmlFor="contact-topic">
        Topic
        <select
          id="contact-topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        >
          <option value="enterprise">Enterprise / Pro</option>
          <option value="security">Security review</option>
          <option value="partnership">Design partner</option>
          <option value="support">Product support</option>
        </select>
      </label>
      <label htmlFor="contact-message">
        Message
        <textarea
          id="contact-message"
          required
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </label>
      {status === "error" && (
        <p className="form-note" style={{ color: "#c0392b" }}>
          Something went wrong. Email us at {CONTACT_INBOX}.
        </p>
      )}
      <p className="form-note">
        Prefer docs?{" "}
        <Link href="/docs" className="text-link inline-link">
          Read the docs <span aria-hidden="true" className="arrow-mark">↗</span>
        </Link>
      </p>
      <button
        type="submit"
        disabled={status === "loading"}
        className="button button-dark form-submit"
      >
        {status === "loading" ? "Sending..." : "Send message"}{" "}
        <span aria-hidden="true" className="arrow-mark">
          ↗
        </span>
      </button>
    </form>
  );
}
