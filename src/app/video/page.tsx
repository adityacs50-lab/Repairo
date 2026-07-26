import type { Metadata } from "next";
import { LaunchReel } from "@/components/LaunchReel";

export const metadata: Metadata = {
  title: "Launch reel — Repairo",
  description: "Autoplay SaaS product video for screen recording.",
  robots: { index: false },
};

export default function VideoPage() {
  return <LaunchReel autoPlay loop />;
}
