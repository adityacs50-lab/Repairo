import type { Metadata } from "next";
import { Figtree, Pixelify_Sans } from "next/font/google";
import "./globals.css";
import RepairoChatAssistant from "@/components/RepairoChatAssistant";
import { AuthSessionProvider } from "@/components/AuthSessionProvider";
import { JsonLd } from "@/components/JsonLd";
import {
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_NAME,
  SITE_TITLE,
  SITE_URL,
  organizationJsonLd,
  webSiteJsonLd,
} from "@/lib/seo";

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const pixelify = Pixelify_Sans({
  variable: "--font-pixelify-sans",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Repairo AI | API changes, repaired with evidence",
  description:
    "Repairo detects breaking third-party API changes, traces their impact into application code, and proposes compiler-verified repairs while keeping engineers in control.",
  applicationName: "Repairo AI",
  keywords: SITE_KEYWORDS,
  category: "technology",
  creator: SITE_NAME,
  publisher: SITE_NAME,
  alternates: { canonical: "https://repairo-ai.cofounder.company" },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Repairo AI | API changes, repaired with evidence",
    description:
      "Repairo detects breaking third-party API changes, traces their impact into application code, and proposes compiler-verified repairs while keeping engineers in control.",
    type: "website",
    url: "https://repairo-ai.cofounder.company",
    siteName: "Repairo AI",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Repairo AI | API changes, repaired with evidence",
    description:
      "Repairo detects breaking third-party API changes, traces their impact into application code, and proposes compiler-verified repairs while keeping engineers in control.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${figtree.variable} ${pixelify.variable} h-full antialiased`}
    >
      <body className="min-h-screen bg-[#f7f8fa] text-[#0b1220] font-sans">
        <AuthSessionProvider>
          <JsonLd data={[organizationJsonLd(), webSiteJsonLd()]} />
          {children}
          <RepairoChatAssistant />
        </AuthSessionProvider>
      </body>
    </html>
  );
}
