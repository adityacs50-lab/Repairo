import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
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
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="relative min-h-full bg-canvas text-body font-sans">{children}</body>
    </html>
  );
}
