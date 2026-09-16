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
  "When a vendor API breaks your build, Repairo diffs the OpenAPI spec, finds affected call sites, and opens a PR with patches that typecheck.";

export const SITE_KEYWORDS = [
  "breaking API changes",
  "OpenAPI diff",
  "API drift detection",
  "AST refactoring",
  "automated code repair",
  "Dependabot for APIs",
  "SDK migration",
  "TypeScript codemod",
  "Python API repair",
  "GitHub pull request automation",
  "API maintenance",
];

/** Public source repo (org), not a personal fork. */
export const GITHUB_REPO_URL = "https://github.com/adityacs50-lab/Repairo";

export const SOCIAL = {
  github: GITHUB_REPO_URL,
  npm: "https://www.npmjs.com/package/repairo-cli",
};

/** Default social preview — served by `app/opengraph-image.tsx`. */
export const DEFAULT_OG_IMAGE_PATH = "/opengraph-image";

export function defaultOgImages() {
  const url = absoluteUrl(DEFAULT_OG_IMAGE_PATH);
  return [
    {
      url,
      width: 1200,
      height: 630,
      alt: `${SITE_NAME} — ${SITE_TAGLINE}`,
    },
  ];
}

export function absoluteUrl(path = "/"): string {
  return new URL(path, SITE_URL).toString();
}

function googleSiteVerification(): string | undefined {
  const v = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim();
  return v || undefined;
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
  const images = defaultOgImages();
  const googleVerification = googleSiteVerification();
  const indexable = !options.noIndex;

  return {
    title: options.title,
    description: options.description,
    // Only set keys we mean to override — a present-but-undefined key replaces
    // the root layout value instead of inheriting it.
    ...(options.keywords ? { keywords: [...SITE_KEYWORDS, ...options.keywords] } : {}),
    alternates: { canonical: url },
    ...(googleVerification ? { verification: { google: googleVerification } } : {}),
    robots: indexable
      ? {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        }
      : {
          index: false,
          follow: false,
          googleBot: { index: false, follow: false },
        },
    openGraph: {
      title: ogTitle,
      description: options.description,
      url,
      siteName: SITE_NAME,
      type: options.type ?? "website",
      locale: "en_US",
      images,
      ...(options.type === "article"
        ? { publishedTime: options.publishedTime, modifiedTime: options.modifiedTime }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: options.description,
      images: images.map((img) => img.url),
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
    alternateName: SITE_TAGLINE,
    url: SITE_URL,
    logo: absoluteUrl("/logo.png"),
    image: absoluteUrl(DEFAULT_OG_IMAGE_PATH),
    description: SITE_DESCRIPTION,
    sameAs: [SOCIAL.github, SOCIAL.npm],
    knowsAbout: [
      "OpenAPI",
      "API breaking changes",
      "AST refactoring",
      "TypeScript codemods",
      "GitHub pull requests",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "sales",
      url: absoluteUrl("/contact"),
      availableLanguage: "English",
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
    copyrightYear: new Date().getUTCFullYear(),
    potentialAction: {
      "@type": "ReadAction",
      target: [
        absoluteUrl("/docs"),
        absoluteUrl("/llms.txt"),
        absoluteUrl("/demo"),
      ],
    },
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
    programmingLanguage: ["TypeScript", "JavaScript", "Python", "Go"],
    featureList: [
      "OpenAPI 3.0/3.1 spec diffing with breaking-change classification",
      "TypeScript impact mapping with ts-morph",
      "Python and Go consumer repair (URL, enums, required fields, explicit renames)",
      "Deterministic repairs gated by tsc, Python syntax, or Go syntax validation",
      "Automatic GitHub pull requests",
      "Background polling of vendor API specs",
      "Offline repairo-cli (Apache-2.0)",
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

export function techDocumentationJsonLd(options: {
  title: string;
  description: string;
  path: string;
}): JsonLdObject {
  const url = absoluteUrl(options.path);
  return {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    "@id": `${url}#documentation`,
    headline: options.title,
    description: options.description,
    url,
    mainEntityOfPage: url,
    author: { "@id": `${SITE_URL}/#organization` },
    publisher: { "@id": `${SITE_URL}/#organization` },
    image: absoluteUrl(DEFAULT_OG_IMAGE_PATH),
    inLanguage: "en",
  };
}

export function softwareSourceCodeJsonLd(): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareSourceCode",
    "@id": `${SOCIAL.github}#source`,
    name: `${SITE_NAME} CLI and engine`,
    codeRepository: SOCIAL.github,
    programmingLanguage: ["TypeScript", "JavaScript", "Python", "Go"],
    license: "https://www.apache.org/licenses/LICENSE-2.0",
    url: SOCIAL.github,
    description: "Open-source repairo-cli and repair engine (Apache-2.0).",
  };
}

/** Highlights indexable pages for rich results / answer engines. */
export function siteNavigationJsonLd(
  items: { name: string; path: string; description?: string }[],
): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${SITE_URL}/#sitenav`,
    name: `${SITE_NAME} site map`,
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      description: item.description,
      url: absoluteUrl(item.path),
    })),
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
