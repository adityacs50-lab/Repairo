import { LaunchReel } from "@/components/LaunchReel";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Launch reel",
  description: "Autoplay Repairo product video for screen recording.",
  path: "/video",
  noIndex: true,
});

export default function VideoPage() {
  return <LaunchReel autoPlay loop />;
}
