import Link from "next/link";
import type { Metadata } from "next";
import { allGenres, browseGames, type BrowseSort } from "@/lib/queries";
import { GameCover } from "@/components/GameCover";
import { Stars } from "@/components/Stars";

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
  const games = browseGames({ sort, genre });
  const genres = allGenres();
  const qs = (p: Record<string, string | undefined>) => {
    const o = new URLSearchParams();
    const merged = { sort, genre, ...p };
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
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Link href={qs({ genre: "" })} className={`rounded px-2 py-1 text-xs ${!genre ? "bg-lime text-[#151320]" : "bg-surface text-muted hover:text-text"}`}>
          Alle Genres
        </Link>
        {genres.map((g) => (
          <Link key={g} href={qs({ genre: g })} className={`rounded px-2 py-1 text-xs ${genre === g ? "bg-lime text-[#151320]" : "bg-surface text-muted hover:text-text"}`}>
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
    </div>
  );
}
