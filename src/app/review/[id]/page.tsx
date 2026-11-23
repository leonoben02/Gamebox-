import Link from "next/link";
import { PlatformBadge } from "@/components/PlatformBadges";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getLog, logComments } from "@/lib/queries";
import { addComment, deleteComment, deleteLog, toggleReviewLike } from "@/app/actions";
import { GameCover } from "@/components/GameCover";
import { Avatar } from "@/components/Avatar";
import { Heart, ReplayIcon, Stars } from "@/components/Stars";
import { SpoilerText } from "@/components/SpoilerText";
import { ToggleButton } from "@/components/ToggleForm";
import { EditLogButton } from "@/components/EditLogButton";
import { formatDate, STATUS_LABELS, timeAgo } from "@/lib/util";

export default async function ReviewPage({ params }: PageProps<"/review/[id]">) {
  const id = Number((await params).id);
  const user = await getCurrentUser();
  const r = await getLog(id, user?.id ?? 0);
  if (!r) notFound();
  const comments = await logComments(id);
  const mine = user?.id === r.user_id;

  return (
    <div className="grid gap-8 md:grid-cols-[150px_1fr]">
      <GameCover game={r.game} size="lg" />
      <div className="max-w-2xl">
        <div className="flex items-center gap-2 text-sm text-muted">
          <Avatar user={r.user} size={24} />
          <Link href={`/u/${r.user.username}`} className="font-semibold text-text hover:text-lime">
            {r.user.display_name}
          </Link>
        </div>
        <h1 className="mt-2 font-display text-3xl font-bold">
          <Link href={`/game/${r.game.slug}`} className="hover:text-lime">
            {r.game.title}
          </Link>{" "}
          <span className="text-lg font-normal text-muted">{r.game.year}</span>
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted">
          <Stars rating={r.rating} className="text-lg" />
          {r.liked ? <Heart className="!h-4 !w-4" /> : null}
          {r.replay ? <ReplayIcon /> : null}
          <span className="rounded bg-surface px-1.5 py-0.5 text-xs">{STATUS_LABELS[r.status]}</span>
          {r.platform && <PlatformBadge platform={r.platform} />}
          {r.hours && <span>· {r.hours} h</span>}
          {r.played_on && <span>· gespielt am {formatDate(r.played_on)}</span>}
        </div>
        {r.review && (
          <div className="prose-review mt-6 text-[16px] leading-relaxed">
            <SpoilerText text={r.review} spoilers={Boolean(r.spoilers)} />
          </div>
        )}
        <div className="mt-6 flex items-center gap-3">
          {user ? (
            <ToggleButton variant="link" on={Boolean(r.viewer_liked)} count={r.like_count} action={toggleReviewLike.bind(null, r.id)} onLabel="♥ Geliked" offLabel="♡ Liken" />
          ) : (
            <span className="text-sm text-muted">♥ {r.like_count}</span>
          )}
          {mine && (
            <>
              <EditLogButton
                game={{ id: r.game.id, title: r.game.title, year: r.game.year, platforms: r.game.platforms }}
                defaults={{
                  log_id: r.id,
                  played_on: r.played_on,
                  rating: r.rating,
                  liked: r.liked,
                  review: r.review,
                  spoilers: r.spoilers,
                  replay: r.replay,
                  status: r.status,
                  platform: r.platform,
                  hours: r.hours,
                }}
              />
              <form action={deleteLog.bind(null, r.id)}>
                <button className="text-sm text-faint hover:text-coral">Löschen</button>
              </form>
            </>
          )}
        </div>

        <section className="mt-12">
          <h2 className="section-title">{comments.length} Kommentare</h2>
          <ul className="space-y-4">
            {comments.map((c) => (
              <li key={c.id} className="flex gap-3 text-sm">
                <Avatar user={c} size={28} />
                <div className="flex-1">
                  <p>
                    <Link href={`/u/${c.username}`} className="font-semibold hover:text-lime">
                      {c.display_name}
                    </Link>{" "}
                    <span className="text-xs text-faint">{timeAgo(c.created_at)}</span>
                  </p>
                  <p className="whitespace-pre-line text-text/85">{c.body}</p>
                </div>
                {user && (user.id === c.user_id || mine) && (
                  <form action={deleteComment.bind(null, c.id)}>
                    <button className="text-xs text-faint hover:text-coral">×</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
          {user ? (
            <form action={addComment.bind(null, r.id)} className="mt-6 space-y-2">
              <textarea name="body" required rows={3} className="field" placeholder="Antworte …" />
              <button className="btn-primary">Kommentieren</button>
            </form>
          ) : (
            <p className="mt-6 text-sm text-muted">
              <Link href="/login" className="text-lime">
                Melde dich an
              </Link>
              , um zu kommentieren.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
