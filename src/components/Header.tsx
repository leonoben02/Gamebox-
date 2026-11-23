import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { syncMissingCovers } from "@/lib/igdb";
import { logout } from "@/app/actions";
import { Avatar } from "./Avatar";
import { LogButton } from "./LogButton";
import { Logo } from "./Logo";
import { MobileNav } from "./MobileNav";

export async function Header() {
  const user = await getCurrentUser();
  void syncMissingCovers().catch(() => {});
  return (
    <>
    <header className="sticky top-0 z-30 border-b border-line/70 bg-bg/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-5 px-4 py-3">
        <Link href="/" aria-label="Gamebox Startseite">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-5 text-sm font-semibold uppercase tracking-wider text-muted md:flex">
          <Link href="/games" className="hover:text-text">
            Spiele
          </Link>
          <Link href="/lists" className="hover:text-text">
            Listen
          </Link>
          <Link href="/members" className="hover:text-text">
            Mitglieder
          </Link>
          {user && (
            <Link href="/activity" className="hover:text-text">
              Aktivität
            </Link>
          )}
        </nav>
        <form action="/search" className="ml-auto hidden sm:block">
          <input name="q" placeholder="Suchen…" className="field !w-44 !rounded-full !py-1.5 focus:!w-60 transition-all" />
        </form>
        {user ? (
          <div className="ml-auto flex items-center gap-3 sm:ml-0">
            <div className="hidden md:block">
              <LogButton />
            </div>
            <details className="relative">
              <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold">
                <Avatar user={user} size={30} link={false} />
                <span className="hidden lg:inline">{user.display_name}</span>
              </summary>
              <div className="absolute right-0 mt-2 w-48 overflow-hidden rounded-lg border border-line bg-surface py-1 text-sm shadow-2xl">
                {[
                  ["Profil", `/u/${user.username}`],
                  ["Spiele", `/u/${user.username}/games`],
                  ["Tagebuch", `/u/${user.username}/diary`],
                  ["Reviews", `/u/${user.username}/reviews`],
                  ["Backlog", `/u/${user.username}/backlog`],
                  ["Listen", `/u/${user.username}/lists`],
                  ["Likes", `/u/${user.username}/likes`],
                  ["Einstellungen", "/settings"],
                ].map(([label, href]) => (
                  <Link key={href} href={href} className="block px-4 py-1.5 hover:bg-line">
                    {label}
                  </Link>
                ))}
                <form action={logout}>
                  <button className="block w-full border-t border-line px-4 py-1.5 text-left text-muted hover:bg-line">Abmelden</button>
                </form>
              </div>
            </details>
          </div>
        ) : (
          <div className="ml-auto flex items-center gap-4 text-sm font-semibold uppercase tracking-wider sm:ml-0">
            <Link href="/login" className="text-muted hover:text-text">
              Anmelden
            </Link>
            <Link href="/signup" className="btn-primary !py-1.5">
              Konto erstellen
            </Link>
          </div>
        )}
      </div>
    </header>
    <MobileNav username={user?.username ?? null} />
    </>
  );
}
