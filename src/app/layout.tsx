import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="relative min-h-full bg-white text-neutral-900 font-sans selection:bg-neutral-900 selection:text-white">
        {children}
      </body>
    </html>
  );
}
