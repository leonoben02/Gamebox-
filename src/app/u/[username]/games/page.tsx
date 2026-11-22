import Link from "next/link";
import { notFound } from "next/navigation";
import { getUserByUsername, userGames } from "@/lib/queries";
import { GameGrid } from "@/components/GameGrid";

export default async function UserGamesPage({ params, searchParams }: PageProps<"/u/[username]/games">) {
  const profile = getUserByUsername((await params).username);
  if (!profile) notFound();
  const s = (await searchParams).sort;
  const sort = s === "rating" || s === "title" ? s : "recent";
  const games = userGames(profile.id, "played", sort);
  return (
    <div>
      <div className="mb-4 flex items-center justify-between text-sm text-muted">
        <span>{games.length} Spiele</span>
        <div className="flex gap-3">
          {(
            [
              ["recent", "Zuletzt"],
              ["rating", "Bewertung"],
              ["title", "Titel"],
            ] as const
          ).map(([k, l]) => (
            <Link key={k} href={`?sort=${k}`} className={sort === k ? "text-lime" : "hover:text-text"}>
              {l}
            </Link>
          ))}
        </div>
      </div>
      <GameGrid games={games} showMeta empty="Noch keine Spiele geloggt." />
    </div>
  );
}
