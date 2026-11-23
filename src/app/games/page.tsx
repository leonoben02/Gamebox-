import Link from "next/link";
import type { Metadata } from "next";
import { allGenres, browseGames, type BrowseSort } from "@/lib/queries";
import { GameCover } from "@/components/GameCover";
import { Stars } from "@/components/Stars";
import { FamilyIcon } from "@/components/PlatformBadges";
import { FAMILIES, type Family } from "@/lib/platforms";

export const metadata: Metadata = { title: "Spiele" };

const SORTS: [BrowseSort, string][] = [
  ["popular", "Beliebt"],
  ["rating", "Bestbewertet"],
  ["newest", "Neueste"],
  ["oldest", "Älteste"],
  ["title", "A–Z"],
];

export default async function GamesPage({ searchParams }: PageProps<"/games">) {
  const sp = await searchParams;
  const sort = (SORTS.find(([k]) => k === sp.sort)?.[0] ?? "popular") as BrowseSort;
  const genre = typeof sp.genre === "string" ? sp.genre : undefined;
  const platform = FAMILIES.find((f) => f.key === sp.platform && f.key !== "other")?.key as Family | undefined;
  const shown = Math.min(Math.max(Number(sp.n) || 96, 96), 960);
  const games = await browseGames({ sort, genre, platform, limit: shown + 1 });
  const more = games.length > shown;
  if (more) games.pop();
  const genres = await allGenres();
  const qs = (p: Record<string, string | undefined>) => {
    const o = new URLSearchParams();
    const merged: Record<string, string | undefined> = { sort, genre, platform, ...p };
    for (const [k, v] of Object.entries(merged)) if (v) o.set(k, v);
    return `?${o}`;
  };
  return (
    <div>
      <h1 className="font-display text-3xl font-bold">Spiele entdecken</h1>
      <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-line pb-3 text-sm">
        {SORTS.map(([k, l]) => (
          <Link key={k} href={qs({ sort: k })} className={sort === k ? "text-lime" : "text-muted hover:text-text"}>
            {l}
          </Link>
        ))}
      </div>
      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {FAMILIES.filter((f) => f.key !== "other").map((f) => {
          const on = platform === f.key;
          return (
            <Link
              key={f.key}
              href={qs({ platform: on ? "" : f.key })}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition ${on ? "text-text" : "border-line text-muted hover:text-text"}`}
              style={on ? { borderColor: f.color, background: `${f.color}26` } : undefined}
            >
              <span style={{ color: f.color }}>
                <FamilyIcon family={f.key} className="h-4 w-4" />
              </span>
              {f.label}
            </Link>
          );
        })}
      </div>
      <div className="mt-3 -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        <Link href={qs({ genre: "" })} className={`shrink-0 rounded px-2 py-1 text-xs ${!genre ? "bg-lime text-[#151320]" : "bg-surface text-muted hover:text-text"}`}>
          Alle Genres
        </Link>
        {genres.map((g) => (
          <Link key={g} href={qs({ genre: g })} className={`shrink-0 rounded px-2 py-1 text-xs ${genre === g ? "bg-lime text-[#151320]" : "bg-surface text-muted hover:text-text"}`}>
            {g}
          </Link>
        ))}
      </div>
      <div className="mt-6 grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6">
        {games.map((g) => (
          <div key={g.id}>
            <GameCover game={g} size="fluid" />
            <div className="mt-1 flex justify-between text-[11px] text-faint">
              <span>▶ {g.players}</span>
              {g.avg && <Stars rating={Math.round(g.avg)} />}
            </div>
          </div>
        ))}
      </div>
      {more && (
        <div className="mt-8 text-center">
          <Link href={qs({ n: String(shown + 96) })} scroll={false} className="btn btn-ghost">
            Mehr Spiele anzeigen
          </Link>
        </div>
      )}
    </div>
  );
}
