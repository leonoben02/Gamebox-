"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { setRating, toggleBacklog, toggleListItem, toggleLiked, togglePlayed } from "@/app/actions";
import type { UserGame } from "@/lib/queries";
import { LogDialog } from "./LogDialog";
import { StarInput } from "./StarInput";

type G = { id: number; title: string; year: number | null; platforms: string; slug: string };

function ActionIcon({ on, color, label, onClick, children }: { on: boolean; color: string; label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="group flex flex-col items-center gap-1 text-xs text-muted hover:text-text">
      <span className="h-8 w-8 transition-transform group-active:scale-90" style={{ color: on ? color : "var(--faint)" }}>
        {children}
      </span>
      {label}
    </button>
  );
}

export function GameActions({
  game,
  state,
  lists,
  loggedIn,
}: {
  game: G;
  state: UserGame;
  lists: { id: number; title: string; has: number }[];
  loggedIn: boolean;
}) {
  const [opt, setOpt] = useOptimistic(state, (s, patch: Partial<UserGame>) => ({ ...s, ...patch }));
  const [, start] = useTransition();
  const [logOpen, setLogOpen] = useState(false);
  const [listsOpen, setListsOpen] = useState(false);

  if (!loggedIn) {
    return (
      <div className="rounded-lg bg-surface p-5 text-center text-sm text-muted">
        <Link href="/login" className="font-semibold text-lime hover:underline">
          Melde dich an
        </Link>
        , um dieses Spiel zu loggen, zu bewerten oder auf deine Playlist zu setzen.
      </div>
    );
  }

  const run = (patch: Partial<UserGame>, fn: () => Promise<void>) =>
    start(async () => {
      setOpt(patch);
      await fn();
    });

  return (
    <div className="overflow-hidden rounded-lg bg-surface text-sm">
      <div className="flex justify-around px-4 py-4">
        <ActionIcon
          on={Boolean(opt.played)}
          color="var(--lime)"
          label={opt.played ? "Gespielt" : "Spielen"}
          onClick={() => run(opt.played ? { played: 0 } : { played: 1, backlog: 0 }, () => togglePlayed(game.id))}
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M7 7h10a5 5 0 0 1 4.9 6l-.9 4.2a2.4 2.4 0 0 1-4.1 1.1L14.6 16H9.4l-2.3 2.3A2.4 2.4 0 0 1 3 17.2L2.1 13A5 5 0 0 1 7 7zm1 3v1.5H6.5v1H8V14h1v-1.5h1.5v-1H9V10H8zm7.5.5a.9.9 0 1 0 0 1.8.9.9 0 0 0 0-1.8zm2 2a.9.9 0 1 0 0 1.8.9.9 0 0 0 0-1.8z" />
          </svg>
        </ActionIcon>
        <ActionIcon
          on={Boolean(opt.liked)}
          color="var(--coral)"
          label={opt.liked ? "Geliked" : "Like"}
          onClick={() => run(opt.liked ? { liked: 0 } : { liked: 1, played: 1, backlog: 0 }, () => toggleLiked(game.id))}
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 21s-7.5-4.6-9.6-9.3C.9 8.2 3 4.5 6.6 4.5c2.1 0 3.6 1.2 4.4 2.5.8-1.3 2.3-2.5 4.4-2.5 3.6 0 5.7 3.7 4.2 7.2C19.5 16.4 12 21 12 21z" />
          </svg>
        </ActionIcon>
        <ActionIcon
          on={Boolean(opt.backlog)}
          color="var(--cyan)"
          label="Playlist"
          onClick={() => run({ backlog: opt.backlog ? 0 : 1 }, () => toggleBacklog(game.id))}
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm-1 5v6l5 3 .9-1.5-3.9-2.3V7H11z" />
          </svg>
        </ActionIcon>
      </div>
      <div className="flex flex-col items-center border-t border-line py-3">
        <span className="mb-1 text-xs text-muted">{opt.rating ? "Bewertet" : "Bewerten"}</span>
        <StarInput
          value={opt.rating ?? 0}
          onChange={(v) => run(v ? { rating: v, played: 1, backlog: 0 } : { rating: null }, () => setRating(game.id, v || null))}
        />
      </div>
      <button type="button" onClick={() => setLogOpen(true)} className="block w-full border-t border-line py-3 hover:bg-line">
        Loggen oder Review schreiben…
      </button>
      <div className="border-t border-line">
        <button type="button" onClick={() => setListsOpen((o) => !o)} className="block w-full py-3 hover:bg-line">
          Zu Listen hinzufügen…
        </button>
        {listsOpen && (
          <div className="space-y-1 px-4 pb-4">
            {lists.map((l) => (
              <form key={l.id} action={() => toggleListItem(l.id, game.id)}>
                <button className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left hover:bg-line">
                  <span className="truncate">{l.title}</span>
                  <span className={l.has ? "text-lime" : "text-faint"}>{l.has ? "✓" : "+"}</span>
                </button>
              </form>
            ))}
            <Link href={`/list/new?game=${game.id}`} className="block rounded px-2 py-1.5 text-lime hover:bg-line">
              + Neue Liste
            </Link>
          </div>
        )}
      </div>
      {logOpen && <LogDialog game={game} open={logOpen} onClose={() => setLogOpen(false)} defaults={{ rating: opt.rating, liked: opt.liked }} />}
    </div>
  );
}
