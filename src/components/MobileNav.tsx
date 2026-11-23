"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogButton } from "./LogButton";

const icon = "h-7 w-7";

/** App-style bottom bar on phones: Home, Search, Log, Activity, Profile. */
export function MobileNav({ username }: { username: string | null }) {
  const path = usePathname();
  const item = (href: string, label: string, active: boolean, svg: React.ReactNode) => (
    <Link
      href={href}
      aria-label={label}
      className={`flex h-11 w-16 items-center justify-center rounded-full transition-colors ${active ? "bg-surface text-cyan" : "text-muted"}`}
    >
      {svg}
    </Link>
  );
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg-2/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <div className="mx-auto flex max-w-md items-center justify-around px-2 py-2">
        {item(
          "/",
          "Start",
          path === "/",
          <svg viewBox="0 0 24 24" className={icon} fill="currentColor">
            <rect x="3" y="5" width="12" height="15" rx="2" />
            <rect x="16.5" y="7" width="2" height="11" rx="1" />
            <rect x="20" y="9" width="1.6" height="7" rx=".8" />
          </svg>,
        )}
        {item(
          "/search",
          "Suche",
          path.startsWith("/search"),
          <svg viewBox="0 0 24 24" className={icon} fill="none" stroke="currentColor" strokeWidth={2.2}>
            <circle cx="10.5" cy="10.5" r="6.5" />
            <path d="M15.5 15.5 21 21" strokeLinecap="round" />
          </svg>,
        )}
        {username ? (
          <LogButton variant="icon" />
        ) : (
          item(
            "/signup",
            "Konto erstellen",
            false,
            <svg viewBox="0 0 24 24" className={icon} fill="none" stroke="var(--lime)" strokeWidth={2.2}>
              <circle cx="12" cy="12" r="9.5" />
              <path d="M12 7.5v9M7.5 12h9" strokeLinecap="round" />
            </svg>,
          )
        )}
        {item(
          username ? "/?tab=activity" : "/lists",
          username ? "Aktivität" : "Listen",
          path === "/activity",
          <svg viewBox="0 0 24 24" className={icon} fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round">
            <path d="M13 2.5 4.5 13.5H11l-1 8 8.5-11H12l1-8z" />
          </svg>,
        )}
        {item(
          username ? `/u/${username}` : "/login",
          username ? "Profil" : "Anmelden",
          Boolean(username) && path.startsWith(`/u/${username}`),
          <svg viewBox="0 0 24 24" className={icon} fill="currentColor">
            <circle cx="12" cy="8" r="4.2" />
            <path d="M3.5 20.5c.8-4.3 4.2-6.5 8.5-6.5s7.7 2.2 8.5 6.5c.1.6-.3 1-.9 1H4.4c-.6 0-1-.4-.9-1z" />
          </svg>,
        )}
      </div>
    </nav>
  );
}
