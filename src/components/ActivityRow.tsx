import Link from "next/link";
import type { ActivityItem } from "@/lib/queries";
import { timeAgo } from "@/lib/util";
import { Avatar } from "./Avatar";
import { GameCover } from "./GameCover";
import { Heart, ReplayIcon, Stars } from "./Stars";

export function ActivityRow({ a }: { a: ActivityItem }) {
  const who = (
    <Link href={`/u/${a.user.username}`} className="font-semibold text-text hover:text-lime">
      {a.user.display_name}
    </Link>
  );
  const game = a.game && (
    <Link href={`/game/${a.game.slug}`} className="font-semibold text-text hover:text-lime">
      {a.game.title}
    </Link>
  );
  let text: React.ReactNode = null;
  switch (a.type) {
    case "log":
      text = (
        <>
          {who} hat {game} {a.log?.replay ? "erneut " : ""}gespielt <Stars rating={a.log?.rating} /> {a.log?.liked ? <Heart /> : null}{" "}
          {a.log?.replay ? <ReplayIcon /> : null}
        </>
      );
      break;
    case "review":
      text = (
        <>
          {who} hat {game} <Link href={`/review/${a.log?.id}`} className="text-lime hover:underline">reviewt</Link> <Stars rating={a.log?.rating} />{" "}
          {a.log?.liked ? <Heart /> : null}
        </>
      );
      break;
    case "backlog":
      text = (
        <>
          {who} hat {game} auf den Backlog gesetzt
        </>
      );
      break;
    case "list":
      text = (
        <>
          {who} hat die Liste{" "}
          <Link href={`/list/${a.list?.id}`} className="font-semibold text-text hover:text-lime">
            {a.list?.title}
          </Link>{" "}
          erstellt
        </>
      );
      break;
    case "follow":
      text = (
        <>
          {who} folgt jetzt{" "}
          <Link href={`/u/${a.target?.username}`} className="font-semibold text-text hover:text-lime">
            {a.target?.display_name}
          </Link>
        </>
      );
      break;
    case "like_review":
      text = (
        <>
          {who} mag{" "}
          <Link href={`/review/${a.log?.id}`} className="font-semibold text-text hover:text-lime">
            eine Review
          </Link>{" "}
          von {a.target?.display_name}
        </>
      );
      break;
  }
  return (
    <li className="flex items-center gap-3 border-b border-line py-3 text-sm text-muted last:border-0">
      <Avatar user={a.user} size={28} />
      <div className="flex-1">{text}</div>
      {a.game && <GameCover game={a.game} size="xs" />}
      <span className="w-20 shrink-0 text-right text-xs text-faint">{timeAgo(a.created_at)}</span>
    </li>
  );
}
