import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Repair results",
  description: "Internal repair run preview — not indexed.",
  path: "/results",
  noIndex: true,
});

export default function ResultsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
