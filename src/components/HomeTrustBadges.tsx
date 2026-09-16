import Link from "next/link";
import { HOME_TRUST_BADGES } from "@/lib/home-trust";

export function HomeTrustBadges() {
  return (
    <div className="home-trust-badges" aria-label="Trust and open source">
      {HOME_TRUST_BADGES.map((b) => (
        <Link key={b.label} href={b.href} className="home-trust-badge">
          <span className="home-trust-badge__label">{b.label}</span>
          <span className="home-trust-badge__detail">{b.detail}</span>
        </Link>
      ))}
    </div>
  );
}
