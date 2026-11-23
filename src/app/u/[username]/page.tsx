import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { activityFeed, favoriteGames, getUserByUsername, profileStats, userDiary, userGames, userRatingHistogram, userReviews } from "@/lib/queries";
import { GameCover } from "@/components/GameCover";
import { Heart, Histogram, Stars } from "@/components/Stars";
import { ReviewCard } from "@/components/ReviewCard";
import { ActivityRow } from "@/components/ActivityRow";

export default async function ProfilePage({ params }: PageProps<"/u/[username]">) {
  const profile = await getUserByUsername((await params).username);
  if (!profile) notFound();
  const viewer = await getCurrentUser();
  const favs = await favoriteGames(profile.id);
  const recent = (await userGames(profile.id, "played", "recent")).slice(0, 4);
  const reviews = await userReviews(profile.id, viewer?.id ?? 0, 3);
  const diary = (await userDiary(profile.id)).slice(0, 8);
  const backlog = await userGames(profile.id, "backlog", "recent");
  const hist = await userRatingHistogram(profile.id);
  const stats = await profileStats(profile.id);
  const activity = await activityFeed({ userIds: [profile.id], limit: 8 });
  const base = `/u/${profile.username}`;
  const isMe = viewer?.id === profile.id;

  return (
    <div className="grid gap-10 md:grid-cols-[1fr_250px]">
      <div className="min-w-0 space-y-12">
        <section>
          <h2 className="section-title">Lieblingsspiele</h2>
          {favs.length ? (
            <div className="grid grid-cols-4 gap-4">
              {favs.map((g) => (
                <GameCover key={g.id} game={g} size="fluid" />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">
              {isMe ? (
                <>
                  Wähle deine vier Lieblingsspiele in den <Link href="/settings" className="text-lime">Einstellungen</Link>.
                </>
              ) : (
                "Noch keine Lieblingsspiele gewählt."
              )}
            </p>
          )}
        </section>
        <section>
          <h2 className="section-title">
            Zuletzt gespielt <Link href={`${base}/games`}>Alle</Link>
          </h2>
          <div className="grid grid-cols-4 gap-4">
            {recent.map((g) => (
              <div key={g.id}>
                <GameCover game={g} size="fluid" />
                <div className="mt-1 flex items-center gap-1 text-xs">
                  <Stars rating={g.user_rating} />
                  {g.user_liked ? <Heart className="!h-3 !w-3" /> : null}
                </div>
              </div>
            ))}
          </div>
          {!recent.length && <p className="text-sm text-muted">Noch nichts gespielt.</p>}
        </section>
        <section>
          <h2 className="section-title">
            Neueste Reviews <Link href={`${base}/reviews`}>Alle</Link>
          </h2>
          {reviews.length ? reviews.map((r) => <ReviewCard key={r.id} r={r} loggedIn={Boolean(viewer)} />) : <p className="text-sm text-muted">Noch keine Reviews.</p>}
        </section>
        <section>
          <h2 className="section-title">Aktivität</h2>
          <ul>
            {activity.map((a) => (
              <ActivityRow key={a.id} a={a} />
            ))}
          </ul>
        </section>
      </div>
      <aside className="min-w-0 space-y-10">
        <section>
          <h2 className="section-title">
            Backlog <Link href={`${base}/backlog`}>{stats.backlog}</Link>
          </h2>
          {backlog.length ? (
            <Link href={`${base}/backlog`} className="flex">
              {backlog.slice(0, 5).map((g, i) => (
                <div key={g.id} className="-ml-5 first:ml-0" style={{ zIndex: 10 - i }}>
                  <GameCover game={g} size="sm" link={false} />
                </div>
              ))}
            </Link>
          ) : (
            <p className="text-sm text-muted">Leer. Beneidenswert.</p>
          )}
        </section>
        <section>
          <h2 className="section-title">
            Tagebuch <Link href={`${base}/diary`}>Alle</Link>
          </h2>
          <ul className="space-y-1.5 text-sm">
            {diary.map((d) => (
              <li key={d.id} className="flex items-center gap-2">
                <span className="w-12 shrink-0 text-xs text-faint">{d.played_on?.slice(8, 10)}.{d.played_on?.slice(5, 7)}.</span>
                <Link href={`/game/${d.game.slug}`} className="truncate hover:text-lime">
                  {d.game.title}
                </Link>
                <Stars rating={d.rating} className="ml-auto text-xs" />
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="section-title">Bewertungen</h2>
          <Histogram data={hist} />
        </section>
      </aside>
    </div>
  );
}
