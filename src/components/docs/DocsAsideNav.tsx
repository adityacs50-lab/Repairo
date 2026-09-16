"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { NavGroup } from "@/components/ContentPage";

function normalizeHash(hash: string) {
  return hash.startsWith("#") ? hash : hash ? `#${hash}` : "";
}

function itemMatches(pathname: string, hash: string, href: string): boolean {
  if (href.includes("#")) {
    const [path, fragment] = href.split("#");
    const base = path || pathname;
    return pathname === base && normalizeHash(hash) === `#${fragment}`;
  }
  return pathname === href;
}

function DocsSideLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active?: boolean;
}) {
  return (
    <Link href={href} className={`content-side-link${active ? " is-active" : ""}`}>
      {label}
    </Link>
  );
}

export function DocsAsideNav({ groups }: { groups: NavGroup[] }) {
  const pathname = usePathname();
  const [hash, setHash] = useState("");

  useEffect(() => {
    const sync = () => setHash(window.location.hash);
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [pathname]);

  return (
    <div className="content-aside-groups">
      {groups.map((group) => (
        <div key={group.title} className="content-aside-group">
          <p className="mono-label">{group.title}</p>
          <nav className="content-aside-nav">
            {group.items.map((item) => (
              <DocsSideLink
                key={item.href}
                href={item.href}
                label={item.label}
                active={itemMatches(pathname, hash, item.href)}
              />
            ))}
          </nav>
        </div>
      ))}
    </div>
  );
}
