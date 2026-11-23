import Link from "next/link";
import { db } from "@/lib/db";
import { igdbEnabled, searchIgdb } from "@/lib/igdb";
import { getGamesByIds, searchLocalGames } from "@/lib/queries";
import { GameCover } from "@/components/GameCover";
import { Avatar } from "@/components/Avatar";

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const q = String((await searchParams).q ?? "").trim();
  let games = q ? await searchLocalGames(q) : [];
  let remoteError = false;
  if (q && igdbEnabled) {
    try {
      const ids = await searchIgdb(q);
      const remote = await getGamesByIds(ids);
      const seen = new Set(remote.map((g) => g.id));
      games = [...remote, ...games.filter((g) => !seen.has(g.id))];
    } catch (e) {
      console.error(e);
      remoteError = true;
    }
  }
  const users = q
    ? (await db
        .prepare("SELECT id, username, display_name, avatar_hue FROM users WHERE username LIKE ? OR display_name LIKE ? LIMIT 10")
        .all(`%${q}%`, `%${q}%`) as { id: number; username: string; display_name: string; avatar_hue: number }[])
    : [];
  return (
    <div className="max-w-3xl">
      <form className="mb-8">
        <input name="q" defaultValue={q} autoFocus className="field !py-3 !text-lg" placeholder="Spiele oder Mitglieder suchen…" />
      </form>
      {q && (
        <>
          {users.length > 0 && (
            <section className="mb-10">
              <h2 className="section-title">Mitglieder</h2>
              <ul className="flex flex-wrap gap-4">
                {users.map((u) => (
                  <li key={u.id} className="flex items-center gap-2">
                    <Avatar user={u} size={28} />
                    <Link href={`/u/${u.username}`} className="font-semibold hover:text-lime">
                      {u.display_name}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <h2 className="section-title">
            {games.length} Spiele für „{q}“
          </h2>
          {remoteError && <p className="mb-4 text-sm text-coral">Die Online-Spieledatenbank ist gerade nicht erreichbar, es werden nur lokale Treffer gezeigt.</p>}
          <ul>
            {games.map((g) => (
              <li key={g.id} className="flex gap-4 border-b border-line py-4">
                <GameCover game={g} size="sm" />
                <div>
                  <Link href={`/game/${g.slug}`} className="font-display text-lg font-bold hover:text-lime">
                    {g.title}
                  </Link>{" "}
                  <span className="text-muted">{g.year}</span>
                  {g.developer && <p className="text-sm text-muted">von {g.developer}</p>}
                  {g.platforms && <p className="mt-1 text-xs text-faint">{g.platforms.split(",").join(" · ")}</p>}
                </div>
              </li>
            ))}
          </ul>
          {!games.length && !igdbEnabled && (
            <p className="text-sm text-muted">Nichts gefunden. Mit verbundener IGDB-Datenbank lässt sich jedes Spiel finden.</p>
          )}
        </>
      )}
    </div>
  );
}
