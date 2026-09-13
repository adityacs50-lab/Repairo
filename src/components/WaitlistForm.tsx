"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { signInWithGoogle, signOutGoogle } from "@/lib/auth/google-actions";

async function submitWaitlist(email: string, isGoogle: boolean) {
  const response = await fetch("https://formsubmit.co/ajax/info@heyrepairo.in", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      email,
      provider: isGoogle ? "google" : "email",
      _subject: `Repairo Beta Signup (${isGoogle ? "Google" : "Work Email"})`,
      _honey: "",
    }),
  });
  return response.ok;
}

export function WaitlistForm() {
  const { data: session, status: sessionStatus } = useSession();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle",
  );
  const registeredGoogleEmail = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("signup") === "success") {
      setStatus("success");
      document.getElementById("waitlist")?.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  // After Google OAuth returns, register the verified email once for beta access.
  useEffect(() => {
    const googleEmail = session?.user?.email;
    if (!googleEmail || sessionStatus !== "authenticated") return;
    if (registeredGoogleEmail.current === googleEmail) return;
    if (status === "success" || status === "loading") return;

    registeredGoogleEmail.current = googleEmail;
    setStatus("loading");

    void (async () => {
      try {
        const ok = await submitWaitlist(googleEmail, true);
        setStatus(ok ? "success" : "error");
        if (ok && typeof window !== "undefined") {
          const url = new URL(window.location.href);
          url.searchParams.set("signup", "success");
          window.history.replaceState({}, "", `${url.pathname}${url.search}`);
          document.getElementById("waitlist")?.scrollIntoView({ behavior: "smooth" });
        }
      } catch {
        setStatus("error");
        registeredGoogleEmail.current = null;
      }
    })();
  }, [session, sessionStatus, status]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus("loading");
    try {
      const ok = await submitWaitlist(email, false);
      if (ok) {
        setStatus("success");
        setEmail("");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="form-success">
        <p className="mono-label" style={{ color: "var(--repairo-teal)" }}>
          BETA SPOT RESERVED
        </p>
        <h3>You&apos;re on the list.</h3>
        <p>
          {session?.user?.email
            ? `Signed in as ${session.user.email}. We'll email launch updates.`
            : "We've reserved your early access spot. Check your inbox for launch updates."}
        </p>
        {session && (
          <form action={signOutGoogle} style={{ marginTop: "1rem" }}>
            <button type="submit" className="text-link">
              Sign out
            </button>
          </form>
        )}
      </div>
    );
  }

  return (
    <div className="demo-form" style={{ gap: "0.85rem" }}>
      <form action={signInWithGoogle}>
        <button
          type="submit"
          disabled={sessionStatus === "loading" || status === "loading"}
          className="button button-dark form-submit"
          style={{ width: "100%", display: "inline-flex", gap: "0.65rem" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s0-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85 2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>
            {status === "loading" && session
              ? "Registering..."
              : "Sign up with Google"}
          </span>
        </button>
      </form>

      <p
        className="mono-label"
        style={{ textAlign: "center", margin: "0.25rem 0" }}
      >
        OR
      </p>

      <form onSubmit={handleSubmit} className="demo-form" style={{ gap: "0.75rem" }}>
        <label htmlFor="waitlist-email">
          Work email
          <input
            id="waitlist-email"
            type="email"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (status === "error") setStatus("idle");
            }}
            disabled={status === "loading"}
            placeholder="you@company.com"
          />
        </label>
        {status === "error" && (
          <p className="form-note" style={{ color: "#c0392b" }}>
            Something went wrong. Please try again.
          </p>
        )}
        <button
          className="button button-dark form-submit"
          type="submit"
          disabled={status === "loading"}
        >
          {status === "loading" && !session ? "Requesting..." : "Request Invite"}{" "}
          <span aria-hidden="true" className="arrow-mark">
            ↗
          </span>
        </button>
      </form>
    </div>
  );
}
