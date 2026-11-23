import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { activityFeed, favoriteGames, getUserByUsername, profileStats, userDiary, userGames, userRatingHistogram, userReviews } from "@/lib/queries";
import { GameCover } from "@/components/GameCover";
import { Heart, Histogram, Stars } from "@/components/Stars";
import { ReviewCard } from "@/components/ReviewCard";
import { ActivityRow } from "@/components/ActivityRow";

export default async function ProfilePage(props: PageProps<"/u/[username]">) {
  // Temporary: show the real error instead of Next's generic page while we chase a production-only crash.
  try {
    return await ProfileContent(props);
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e && String((e as { digest: unknown }).digest).startsWith("NEXT_")) throw e;
    return (
      <p className="rounded-lg border border-coral/50 bg-coral/10 p-4 text-sm break-words">
        <b>Fehler im Profil:</b> {e instanceof Error ? `${e.name}: ${e.message}` : String(e)}
      </p>
    );
  }
}

async function ProfileContent({ params }: PageProps<"/u/[username]">) {
  const profile = await getUserByUsername((await params).username);
  if (!profile) notFound();
  const viewer = await getCurrentUser();
  const favs = await favoriteGames(profile.id);
  const playing = await userGames(profile.id, "playing", "recent");
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
          <div className="flex items-baseline justify-between">
            <h2 className="section-title">Lieblingsspiele</h2>
            {isMe && (
              <Link href="/settings#favoriten" className="text-xs text-muted hover:text-lime">
                Bearbeiten
              </Link>
            )}
          </div>
          {favs.length || isMe ? (
            <div className="grid grid-cols-4 gap-4">
              {favs.map((g) => (
                <GameCover key={g.id} game={g} size="fluid" />
              ))}
              {isMe &&
                Array.from({ length: Math.max(0, 4 - favs.length) }, (_, i) => (
                  <Link
                    key={`empty-${i}`}
                    href="/settings#favoriten"
                    className="flex aspect-[3/4] flex-col items-center justify-center gap-1 rounded-md border border-dashed border-line text-center text-xs text-faint hover:border-lime hover:text-lime"
                  >
                    <span className="text-2xl leading-none">+</span>
                    Top-Spiel
                  </Link>
                ))}
            </div>
          ) : (
            <p className="text-sm text-muted">Noch keine Lieblingsspiele gewählt.</p>
          )}
        </section>
        {playing.length > 0 && (
          <section>
            <h2 className="section-title">Spielt gerade</h2>
            <div className="grid grid-cols-4 gap-4">
              {playing.slice(0, 8).map((g) => (
                <GameCover key={g.id} game={g} size="fluid" />
              ))}
            </div>
          </section>
        )}
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
            Playlist <Link href={`${base}/playlist`}>{stats.backlog}</Link>
          </h2>
          {backlog.length ? (
            <Link href={`${base}/playlist`} className="flex">
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
