import Link from "next/link";
import { COMMUNITY_LINKS } from "@/lib/community";
import { CHANGELOG_ENTRIES } from "@/lib/changelog-entries";

export function HomeCommunityBand() {
  const latest = CHANGELOG_ENTRIES.slice(0, 3);

  return (
    <section className="home-community section-rule" id="community">
      <div className="home-community-grid">
        <div className="home-community-card">
          <p className="eyebrow">Community</p>
          <h2>Questions, vendors, setup help</h2>
          <p>
            Ask in {COMMUNITY_LINKS.hubLabel}, open a GitHub issue for bugs, or read the security
            model before connecting a repo.
          </p>
          <div className="home-community-actions">
            <a className="button button-dark" href={COMMUNITY_LINKS.hub} rel="noreferrer" target="_blank">
              {COMMUNITY_LINKS.hubLabel}
            </a>
            <a className="button button-outline" href={COMMUNITY_LINKS.issues} rel="noreferrer" target="_blank">
              Issue tracker
            </a>
          </div>
        </div>
        <div className="home-changelog-feed">
          <div className="home-changelog-feed-head">
            <p className="mono-label">Changelog</p>
            <Link className="text-link" href="/changelog">
              All releases <span className="arrow-mark" aria-hidden="true">↗</span>
            </Link>
          </div>
          <ul className="home-changelog-list">
            {latest.map((entry) => (
              <li key={entry.date + entry.title}>
                <time dateTime={entry.date} className="home-changelog-date">{entry.date}</time>
                <p className="home-changelog-title">{entry.title}</p>
                <p className="home-changelog-blurb">{entry.items[0]}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
