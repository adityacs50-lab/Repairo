import type { Metadata } from "next";
import { getAppUrl } from "@/lib/auth/config";
import { PLANS } from "@/lib/billing/plans";
import pkg from "../../package.json";

/** Shares the auth resolver (APP_URL, NEXT_PUBLIC_APP_URL, Vercel/Railway env) so every URL agrees. */
export const SITE_URL = getAppUrl();
export const SITE_NAME = "Repairo";
export const SITE_TAGLINE = "Dependabot for third-party APIs";
export const SITE_TITLE = `${SITE_NAME} — ${SITE_TAGLINE}`;
export const SITE_DESCRIPTION =
  "Repairo detects breaking changes in third-party APIs (Stripe, OpenAI, Supabase, Clerk, Gemini, Anthropic), maps the impact across your TypeScript codebase, and opens compiler-validated AST repair pull requests automatically.";

export const SITE_KEYWORDS = [
  "breaking API changes",
  "OpenAPI diff",
  "API drift detection",
  "AST refactoring",
  "automated code repair",
  "Dependabot for APIs",
  "SDK migration",
  "TypeScript codemod",
  "GitHub pull request automation",
  "API maintenance",
];

export const SOCIAL = {
  github: "https://github.com/sanjaynandanj/Repairo",
  npm: "https://www.npmjs.com/package/repairo-cli",
};

export function absoluteUrl(path = "/"): string {
  return new URL(path, SITE_URL).toString();
}

/**
 * Build page metadata with a canonical URL and consistent Open Graph / Twitter
 * cards. `title` is inserted into the root template ("%s · Repairo").
 */
export function pageMetadata(options: {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  type?: "website" | "article";
  noIndex?: boolean;
  publishedTime?: string;
  modifiedTime?: string;
}): Metadata {
  const url = absoluteUrl(options.path);
  const ogTitle = `${options.title} · ${SITE_NAME}`;
  return {
    title: options.title,
    description: options.description,
    // Only set keys we mean to override — a present-but-undefined key replaces
    // the root layout value instead of inheriting it.
    ...(options.keywords ? { keywords: [...SITE_KEYWORDS, ...options.keywords] } : {}),
    alternates: { canonical: url },
    ...(options.noIndex
      ? { robots: { index: false, follow: false, googleBot: { index: false, follow: false } } }
      : {}),
    openGraph: {
      title: ogTitle,
      description: options.description,
      url,
      siteName: SITE_NAME,
      type: options.type ?? "website",
      locale: "en_US",
      ...(options.type === "article"
        ? { publishedTime: options.publishedTime, modifiedTime: options.modifiedTime }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: options.description,
    },
  };
}

/* ------------------------------------------------------------------ */
/* JSON-LD builders (schema.org)                                       */
/* ------------------------------------------------------------------ */

export type JsonLdObject = Record<string, unknown>;

export function organizationJsonLd(): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    logo: absoluteUrl("/logo.png"),
    description: SITE_DESCRIPTION,
    sameAs: [SOCIAL.github, SOCIAL.npm],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "sales",
      url: absoluteUrl("/contact"),
    },
  };
}

export function webSiteJsonLd(): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: SITE_NAME,
    alternateName: SITE_TAGLINE,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    publisher: { "@id": `${SITE_URL}/#organization` },
    inLanguage: "en",
  };
}

export function softwareApplicationJsonLd(options?: {
  name?: string;
  description?: string;
  url?: string;
}): JsonLdObject {
  const url = options?.url ?? SITE_URL;
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `${url}#software`,
    ...(options?.url ? { isPartOf: { "@id": `${SITE_URL}/#software` } } : {}),
    name: options?.name ?? SITE_NAME,
    url,
    description: options?.description ?? SITE_DESCRIPTION,
    applicationCategory: "DeveloperApplication",
    applicationSubCategory: "API maintenance / code repair",
    operatingSystem: "Windows, macOS, Linux",
    softwareVersion: pkg.version,
    license: "https://www.apache.org/licenses/LICENSE-2.0",
    downloadUrl: SOCIAL.npm,
    installUrl: SOCIAL.npm,
    programmingLanguage: ["TypeScript", "JavaScript"],
    featureList: [
      "OpenAPI 3.0/3.1 spec diffing with breaking-change classification",
      "TypeScript impact mapping with ts-morph",
      "Deterministic AST repairs validated by the TypeScript compiler",
      "Automatic GitHub pull requests",
      "Background polling of vendor API specs",
    ],
    offers: Object.values(PLANS).map((plan) => ({
      "@type": "Offer",
      name: `${plan.name} plan`,
      price: (plan.priceCents / 100).toFixed(2),
      priceCurrency: "USD",
      url: absoluteUrl("/pricing"),
    })),
    publisher: { "@id": `${SITE_URL}/#organization` },
  };
}

export function faqPageJsonLd(
  items: { question: string; answer: string }[],
): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

export function articleJsonLd(options: {
  title: string;
  description: string;
  path: string;
  datePublished: string;
  dateModified?: string;
  authorName?: string;
}): JsonLdObject {
  const url = absoluteUrl(options.path);
  return {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    "@id": `${url}#article`,
    headline: options.title,
    description: options.description,
    url,
    mainEntityOfPage: url,
    datePublished: options.datePublished,
    dateModified: options.dateModified ?? options.datePublished,
    author: {
      "@type": "Organization",
      name: options.authorName ?? SITE_NAME,
      url: SITE_URL,
    },
    publisher: { "@id": `${SITE_URL}/#organization` },
    image: absoluteUrl("/opengraph-image"),
    inLanguage: "en",
  };
}

export function breadcrumbJsonLd(
  items: { name: string; path: string }[],
): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

/** Serialize for a <script type="application/ld+json"> tag, XSS-safe per Next.js docs. */
export function serializeJsonLd(data: JsonLdObject | JsonLdObject[]): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
