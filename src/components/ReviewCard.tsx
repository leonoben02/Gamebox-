import Link from "next/link";
import { toggleReviewLike } from "@/app/actions";
import type { ReviewRow } from "@/lib/queries";
import { formatDate, STATUS_LABELS } from "@/lib/util";
import { Avatar } from "./Avatar";
import { GameCover } from "./GameCover";
import { Heart, ReplayIcon, Stars } from "./Stars";
import { ToggleButton } from "./ToggleForm";
import { SpoilerText } from "./SpoilerText";

export function ReviewCard({ r, showGame = true, loggedIn }: { r: ReviewRow; showGame?: boolean; loggedIn: boolean }) {
  return (
    <article className="flex gap-4 border-b border-line py-5 last:border-0">
      {showGame ? <GameCover game={r.game} size="sm" /> : <Avatar user={r.user} size={40} />}
      <div className="min-w-0 flex-1">
        {showGame && (
          <h3 className="font-display text-lg font-bold leading-tight">
            <Link href={`/game/${r.game.slug}`} className="hover:text-lime">
              {r.game.title}
            </Link>{" "}
            {r.game.year && <span className="text-sm font-normal text-muted">{r.game.year}</span>}
          </h3>
        )}
        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-muted">
          {showGame && <Avatar user={r.user} size={20} />}
          <span>
            Review von{" "}
            <Link href={`/u/${r.user.username}`} className="font-semibold text-text hover:text-lime">
              {r.user.display_name}
            </Link>
          </span>
          <Stars rating={r.rating} />
          {r.liked ? <Heart /> : null}
          {r.replay ? <ReplayIcon /> : null}
          {r.status !== "played" && <span className="rounded bg-surface px-1.5 py-0.5 text-[11px]">{STATUS_LABELS[r.status]}</span>}
          {r.played_on && <span className="text-faint">· {formatDate(r.played_on)}</span>}
        </div>
        <div className="prose-review mt-2 text-[15px] leading-relaxed text-text/90">
          <SpoilerText text={r.review ?? ""} spoilers={Boolean(r.spoilers)} clamp />
        </div>
        <div className="mt-2 flex items-center gap-4 text-sm text-muted">
          {loggedIn ? (
            <ToggleButton
              variant="link"
              on={Boolean(r.viewer_liked)}
              count={r.like_count}
              action={toggleReviewLike.bind(null, r.id)}
              onLabel="♥ Geliked"
              offLabel="♡ Review liken"
            />
          ) : (
            <span>♥ {r.like_count}</span>
          )}
          <Link href={`/review/${r.id}`} className="hover:text-text">
            {r.comment_count ? `${r.comment_count} ${r.comment_count === 1 ? "Kommentar" : "Kommentare"}` : "Kommentieren"}
          </Link>
        </div>
      </div>
    </article>
  );
}
