import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
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
    "Dependabot for APIs. Diff OpenAPI, scan consumer codebases, open safe GitHub PRs when contracts break.",
  openGraph: {
    title: "Repairo — Self-maintaining APIs",
    description:
      "When an API breaks, identify impacted TypeScript and open a repair PR — providers announce, Repairo applies.",
    type: "website",
    url: siteUrl,
    siteName: "Repairo",
  },
  twitter: {
    card: "summary_large_image",
    title: "Repairo",
    description:
      "Self-maintaining APIs — Dependabot for OpenAPI contracts on your GitHub.",
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
      className={`${geist.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="relative min-h-full bg-bg text-fg">{children}</body>
    </html>
  );
}
