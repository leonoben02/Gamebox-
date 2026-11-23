"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function ProfileTabs({ username }: { username: string }) {
  const path = usePathname();
  const base = `/u/${username}`;
  const tabs = [
    ["Profil", base],
    ["Spielt gerade", `${base}/playing`],
    ["Spiele", `${base}/games`],
    ["Tagebuch", `${base}/diary`],
    ["Reviews", `${base}/reviews`],
    ["Playlist", `${base}/playlist`],
    ["Listen", `${base}/lists`],
    ["Likes", `${base}/likes`],
  ];
  return (
    <nav className="mb-8 flex gap-5 overflow-x-auto border-b border-line">
      {tabs.map(([label, href]) => (
        <Link key={href} href={href} className={`tab whitespace-nowrap ${path === href ? "tab-active" : ""}`}>
          {label}
        </Link>
      ))}
    </nav>
  );
}
