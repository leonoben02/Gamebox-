import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { enrichGame, syncGameDetails, syncMultiplayer } from "@/lib/igdb";
import {
  followingIds,
  friendsOnGame,
  gameReviews,
  gameCompanies,
  gameStats,
  getGameBySlug,
  getGameDetails,
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
import { countryName, formatDate, hueFor, roleLabel } from "@/lib/util";
import { Tabs } from "@/components/Tabs";
import { PlatformBadges } from "@/components/PlatformBadges";
import { MultiplayerBadges } from "@/components/MultiplayerBadges";

export async function generateMetadata({ params }: PageProps<"/game/[slug]">): Promise<Metadata> {
  const g = await getGameBySlug((await params).slug);
  return { title: g ? `${g.title}${g.year ? ` (${g.year})` : ""}` : "Spiel" };
}

export default async function GamePage({ params }: PageProps<"/game/[slug]">) {
  const { slug } = await params;
  const base = await getGameBySlug(slug);
  if (!base) notFound();
  if (!base.cover_url) await enrichGame(base.id, base.title);
  await syncGameDetails(base.id);
  let game = (await getGameDetails(slug))!;
  if (game.multiplayer === null && game.igdb_id) {
    await syncMultiplayer([Number(game.igdb_id)]).catch((e) => console.error("IGDB multiplayer failed", e));
    game = (await getGameDetails(slug))!;
  }
  const companies = await gameCompanies(game.id);
  const developer = companies.find((c) => c.developer);
  const user = await getCurrentUser();
  const stats = await gameStats(game.id);
  const friends = user ? await friendsOnGame(user.id, game.id) : [];
  const friendReviews = user ? await gameReviews(game.id, user.id, "recent", 10, await followingIds(user.id)) : [];
  const popular = await gameReviews(game.id, user?.id ?? 0, "popular", 8);
  const lists = await listsWithGame(game.id, 3);
  const hue = hueFor(game.title);
  const actions = (
    <GameActions
      game={game}
      state={user ? await getUserGame(user.id, game.id) : { played: 0, liked: 0, rating: null, backlog: 0, playing: 0 }}
      lists={user ? await myListsForGame(user.id, game.id) : []}
      loggedIn={Boolean(user)}
    />
  );
  const statsLine = (
    <div className="flex gap-5 text-sm text-muted" title="Gespielt · Listen · Likes">
      <span title="Gespielt von">
        <span className="text-lime">▶</span> {stats.players}
      </span>
      <span title="In Listen">☰ {stats.lists}</span>
      <span title="Likes">
        <Heart /> {stats.likes}
      </span>
    </div>
  );

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
        <div className="hidden flex-col items-stretch md:flex">
          <GameCover game={game} size="xl" link={false} />
          <div className="mt-4 flex justify-center">{statsLine}</div>
        </div>

        <div className="min-w-0 pt-2 md:pt-24">
          {/* phones: compact header with the cover on the right, like the app */}
          <div className="float-right mb-3 ml-4 w-[34%] max-w-[150px] md:hidden">
            <GameCover game={game} size="fluid" link={false} />
          </div>
          <h1 className="font-display text-3xl font-bold leading-tight [text-wrap:balance] md:text-4xl">{game.title}</h1>
          <p className="mt-1 text-muted">
            {game.year && (
              <Link href={`/games?sort=newest`} className="font-semibold text-text hover:text-lime">
                {game.year}
              </Link>
            )}
            {developer ? (
              <>
                {" "}
                · von{" "}
                <Link href={`/studio/${developer.slug}`} className="font-semibold text-text underline decoration-line underline-offset-4 hover:text-lime">
                  {developer.name}
                </Link>
              </>
            ) : (
              game.developer && (
                <>
                  {" "}
                  · von <span className="font-semibold text-text">{game.developer}</span>
                </>
              )
            )}
          </p>
          <PlatformBadges platforms={game.platforms} className="mt-4" />
          <MultiplayerBadges tags={game.multiplayer} className="mt-2" />
          {game.summary && <p className="mt-5 max-w-prose leading-relaxed text-text/85">{game.summary}</p>}
          <div className="clear-both mt-5 md:hidden">{statsLine}</div>
          <div className="mt-6 md:hidden">{actions}</div>
          <Tabs
            className="mt-8"
            tabs={[
              {
                label: "Studios",
                content: companies.length ? (
                  <ul>
                    {companies.map((c) => (
                      <li key={c.id}>
                        <Link href={`/studio/${c.slug}`} className="group flex items-center gap-4 border-b border-line py-3 last:border-0">
                          <span className={`flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md p-1.5 ring-1 ring-white/5 ${c.logo_url ? "bg-[#ece9f6]" : "bg-surface"}`}>
                            {c.logo_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={c.logo_url} alt="" className="max-h-full max-w-full object-contain" />
                            ) : (
                              <span className="font-display text-lg font-bold text-muted">{c.name.slice(0, 1)}</span>
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[17px] group-hover:text-lime">{c.name}</span>
                            <span className="block text-sm text-muted">
                              {roleLabel(c)}
                              {countryName(c.country) && ` · ${countryName(c.country)}`}
                            </span>
                          </span>
                          <span className="text-xl text-faint group-hover:text-lime">›</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="py-4 text-sm text-muted">{game.developer ? `Entwickelt von ${game.developer}.` : "Noch keine Studio-Angaben."}</p>
                ),
              },
              {
                label: "Details",
                content: (
                  <dl className="divide-y divide-line text-sm">
                    {(
                      [
                        ["Reihe", game.franchise],
                        ["Spielmodi", game.modes.split(",").join(", ")],
                        ["Perspektive", game.perspectives.split(",").join(", ")],
                        ["Engine", game.engines.split(",").join(", ")],
                      ] as [string, string][]
                    )
                      .filter(([, v]) => v)
                      .map(([k, v]) => (
                        <div key={k} className="flex gap-4 py-3">
                          <dt className="w-28 shrink-0 text-muted">{k}</dt>
                          <dd>{v}</dd>
                        </div>
                      ))}
                  </dl>
                ),
              },
              {
                label: "Genres",
                content: (
                  <div className="flex flex-wrap gap-2 py-3">
                    {game.genres.split(",").filter(Boolean).map((g) => (
                      <Link key={g} href={`/games?genre=${encodeURIComponent(g)}`} className="rounded-md bg-surface px-3 py-1.5 text-sm text-muted hover:text-text">
                        {g}
                      </Link>
                    ))}
                  </div>
                ),
              },
              {
                label: "Releases",
                content: (() => {
                  const rel = JSON.parse(game.releases || "[]") as { platform: string; date: string; human: string }[];
                  return rel.length ? (
                    <ul className="divide-y divide-line text-sm">
                      {rel.map((r) => (
                        <li key={r.platform} className="flex justify-between gap-4 py-3">
                          <span>{r.platform}</span>
                          <span className="text-muted tabular-nums">{/^\d{4}$/.test(r.human) ? r.human : formatDate(r.date)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="py-4 text-sm text-muted">{game.year ? `Erschienen ${game.year}.` : "Keine Release-Daten."}</p>
                  );
                })(),
              },
            ]}
          />

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

          <section className="mt-10">
            <Tabs
              tabs={[
                {
                  label: "Beliebt",
                  content: popular.length ? (
                    <>
                      {popular.map((r) => (
                        <ReviewCard key={r.id} r={r} showGame={false} loggedIn={Boolean(user)} />
                      ))}
                      <Link href={`/game/${game.slug}/reviews`} className="block py-3 text-center text-sm font-semibold uppercase tracking-widest text-muted hover:text-lime">
                        Alle Reviews
                      </Link>
                    </>
                  ) : (
                    <p className="py-4 text-sm text-muted">Noch keine Reviews. Schreib die erste!</p>
                  ),
                },
                {
                  label: "Freunde",
                  content: friendReviews.length ? (
                    friendReviews.map((r) => <ReviewCard key={r.id} r={r} showGame={false} loggedIn />)
                  ) : (
                    <p className="py-4 text-sm text-muted">{user ? "Noch keine Reviews von Leuten, denen du folgst." : "Melde dich an, um Reviews deiner Freunde zu sehen."}</p>
                  ),
                },
              ]}
            />
          </section>
        </div>

        <aside className="min-w-0 space-y-8 md:pt-24">
          <div className="hidden md:block">{actions}</div>
          <section>
            <h2 className="section-title">
              Bewertungen <span className="normal-case tracking-normal">{stats.ratings}</span>
            </h2>
            {stats.ratings ? <Histogram data={stats.histogram} avg={stats.avg} /> : <p className="text-sm text-muted">Noch keine Bewertungen.</p>}
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
