import type { Metadata } from "next";
import { Inter, Playfair_Display, Geist_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Repairo — Self-maintaining APIs",
    template: "%s · Repairo",
  },
  description:
    "Repairo continuously detects OpenAPI specification changes, maps affected code, generates deterministic patches, and opens safe, reviewable pull requests automatically.",
  keywords: [
    "OpenAPI",
    "API Maintenance",
    "Deterministic Code Generation",
    "AST Refactoring",
    "TypeScript",
    "Developer Tools",
    "GitHub PR Automation",
  ],
  openGraph: {
    title: "Repairo — Self-maintaining APIs",
    description:
      "Repairo detects OpenAPI spec changes, maps the impact across your codebase, and opens a safe PR automatically.",
    type: "website",
    url: siteUrl,
    siteName: "Repairo",
  },
  twitter: {
    card: "summary_large_image",
    title: "Repairo — Self-maintaining APIs",
    description:
      "Repairo detects OpenAPI spec changes, maps the impact across your codebase, and opens a safe PR automatically.",
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
      className={`${inter.variable} ${playfair.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="relative min-h-full bg-canvas text-ink font-sans selection:bg-surface-light selection:text-primary-on">
        {children}
      </body>
    </html>
  );
}
