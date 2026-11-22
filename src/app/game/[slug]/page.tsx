import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { enrichGame } from "@/lib/igdb";
import {
  followingIds,
  friendsOnGame,
  gameReviews,
  gameStats,
  getGameBySlug,
  getUserGame,
  listsWithGame,
  myListsForGame,
} from "@/lib/queries";
import { GameCover } from "@/components/GameCover";
import { GameActions } from "@/components/GameActions";
import { ReviewCard } from "@/components/ReviewCard";
import { ListCard } from "@/components/ListCard";
import { Avatar } from "@/components/Avatar";
import { Heart, Histogram, Stars } from "@/components/Stars";
import { hueFor } from "@/lib/util";

export async function generateMetadata({ params }: PageProps<"/game/[slug]">): Promise<Metadata> {
  const g = getGameBySlug((await params).slug);
  return { title: g ? `${g.title}${g.year ? ` (${g.year})` : ""}` : "Spiel" };
}

export default async function GamePage({ params }: PageProps<"/game/[slug]">) {
  const { slug } = await params;
  let game = getGameBySlug(slug);
  if (!game) notFound();
  if (!game.cover_url) {
    await enrichGame(game.id, game.title);
    game = getGameBySlug(slug)!;
  }
  const user = await getCurrentUser();
  const stats = gameStats(game.id);
  const friends = user ? friendsOnGame(user.id, game.id) : [];
  const friendReviews = user ? gameReviews(game.id, user.id, "recent", 4, followingIds(user.id)) : [];
  const popular = gameReviews(game.id, user?.id ?? 0, "popular", 8).filter((r) => !friendReviews.some((f) => f.id === r.id));
  const lists = listsWithGame(game.id, 3);
  const hue = hueFor(game.title);

  return (
    <div className="-mt-8">
      <div
        className="relative -mx-4 mb-[-120px] h-[300px] overflow-hidden sm:mx-0 sm:rounded-b-2xl"
        style={{ background: `radial-gradient(ellipse at 30% 0%, hsl(${hue} 50% 30% / .9), transparent 70%)` }}
      >
        {game.cover_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={game.cover_url} alt="" className="h-full w-full scale-110 object-cover opacity-35 blur-2xl" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-bg/40 to-bg" />
      </div>

      <div className="relative grid gap-8 md:grid-cols-[230px_1fr_250px]">
        <div className="flex flex-col items-center md:items-stretch">
          <GameCover game={game} size="xl" link={false} />
          <div className="mt-4 flex justify-center gap-5 text-sm text-muted" title="Gespielt · Listen · Likes">
            <span title="Gespielt von">
              <span className="text-lime">▶</span> {stats.players}
            </span>
            <span title="In Listen">☰ {stats.lists}</span>
            <span title="Likes">
              <Heart /> {stats.likes}
            </span>
          </div>
        </div>

        <div className="order-3 pt-2 md:order-none md:pt-24">
          <h1 className="font-display text-4xl font-bold leading-tight">{game.title}</h1>
          <p className="mt-1 text-muted">
            {game.year && (
              <Link href={`/games?sort=newest`} className="font-semibold text-text hover:text-lime">
                {game.year}
              </Link>
            )}
            {game.developer && (
              <>
                {" "}
                · von <span className="font-semibold text-text">{game.developer}</span>
              </>
            )}
          </p>
          {game.summary && <p className="mt-5 max-w-prose leading-relaxed text-text/85">{game.summary}</p>}
          <div className="mt-6 space-y-3 text-sm">
            {game.genres && (
              <div className="flex flex-wrap gap-1.5">
                {game.genres.split(",").map((g) => (
                  <Link key={g} href={`/games?genre=${encodeURIComponent(g)}`} className="rounded bg-surface px-2 py-1 text-xs text-muted hover:text-text">
                    {g}
                  </Link>
                ))}
              </div>
            )}
            {game.platforms && <p className="text-xs text-faint">Plattformen: {game.platforms.split(",").join(" · ")}</p>}
          </div>

          {friends.length > 0 && (
            <section className="mt-10">
              <h2 className="section-title">Von Freunden gespielt</h2>
              <div className="flex flex-wrap gap-4">
                {friends.map((f) => (
                  <div key={f.id} className="flex flex-col items-center gap-1">
                    <Avatar user={f} size={40} />
                    <span className="flex items-center gap-1 text-[11px]">
                      <Stars rating={f.rating} />
                      {f.liked ? <Heart className="!h-3 !w-3" /> : null}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {friendReviews.length > 0 && (
            <section className="mt-10">
              <h2 className="section-title">Reviews von Freunden</h2>
              {friendReviews.map((r) => (
                <ReviewCard key={r.id} r={r} showGame={false} loggedIn />
              ))}
            </section>
          )}

          <section className="mt-10">
            <h2 className="section-title">
              Beliebte Reviews <Link href={`/game/${game.slug}/reviews`}>Alle</Link>
            </h2>
            {popular.length ? (
              popular.map((r) => <ReviewCard key={r.id} r={r} showGame={false} loggedIn={Boolean(user)} />)
            ) : (
              <p className="text-sm text-muted">Noch keine Reviews. Schreib die erste!</p>
            )}
          </section>
        </div>

        <aside className="order-2 space-y-8 md:order-none md:pt-24">
          <GameActions game={game} state={user ? getUserGame(user.id, game.id) : { played: 0, liked: 0, rating: null, backlog: 0 }} lists={user ? myListsForGame(user.id, game.id) : []} loggedIn={Boolean(user)} />
          <section>
            <h2 className="section-title">
              Bewertungen <span className="normal-case tracking-normal">{stats.ratings}</span>
            </h2>
            <Histogram data={stats.histogram} avg={stats.avg} />
          </section>
          {lists.length > 0 && (
            <section>
              <h2 className="section-title">In Listen</h2>
              <div className="space-y-6">
                {lists.map((l) => (
                  <ListCard key={l.id} list={l} />
                ))}
              </div>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
