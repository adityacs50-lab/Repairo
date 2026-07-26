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
    default: "Repairo — Self-maintaining API integrations",
    template: "%s · Repairo",
  },
  description:
    "Diff OpenAPI changes, find impacted consumer code, and open safe GitHub pull requests. Try it on your repo.",
  openGraph: {
    title: "Repairo — Self-maintaining API integrations",
    description:
      "Connect GitHub. Diff your OpenAPI. Open a real repair PR in minutes.",
    type: "website",
    url: siteUrl,
    siteName: "Repairo",
  },
  twitter: {
    card: "summary_large_image",
    title: "Repairo",
    description:
      "Self-maintaining API integrations — try a repair on your GitHub repo.",
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
