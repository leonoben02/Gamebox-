import Link from "next/link";
import type { ListSummary } from "@/lib/queries";
import { Avatar } from "./Avatar";
import { GameCover } from "./GameCover";

/** Overlapping cover stack, like a fanned-out shelf. */
export function CoverStack({ covers }: { covers: ListSummary["covers"] }) {
  return (
    // Five covers, each 28% wide, overlapping so the stack always fits its container.
    <div className="flex w-full">
      {Array.from({ length: 5 }).map((_, i) => {
        const g = covers[i];
        return (
          <div key={i} className="w-[28%] shrink-0 [&:not(:first-child)]:-ml-[10%]" style={{ zIndex: 10 - i }}>
            {g ? (
              <GameCover game={g} size="fluid" link={false} />
            ) : (
              <div className="aspect-[3/4] w-full rounded-md bg-surface ring-1 ring-white/5" />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function ListCard({ list }: { list: ListSummary }) {
  return (
    <Link href={`/list/${list.id}`} className="group block">
      <CoverStack covers={list.covers} />
      <h3 className="mt-2 font-display font-bold leading-tight group-hover:text-lime">{list.title}</h3>
      <div className="mt-1 flex items-center gap-2 text-xs text-muted">
        <Avatar user={list.user} size={16} link={false} />
        <span>{list.user.display_name}</span>
        <span>· {list.count} Spiele</span>
        <span>· ♥ {list.likes}</span>
      </div>
    </Link>
  );
}
