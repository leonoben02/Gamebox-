import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getList, hasLikedList } from "@/lib/queries";
import { moveListItem, toggleListItem, toggleListLike } from "@/app/actions";
import { Avatar } from "@/components/Avatar";
import { GameCover } from "@/components/GameCover";
import { ToggleButton } from "@/components/ToggleForm";
import { ListAddGame } from "@/components/ListAddGame";
import { timeAgo } from "@/lib/util";

export default async function ListPage({ params }: PageProps<"/list/[id]">) {
  const id = Number((await params).id);
  const list = await getList(id);
  if (!list) notFound();
  const viewer = await getCurrentUser();
  const mine = viewer?.id === list.user.id;

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-muted">
        <Avatar user={list.user} size={24} />
        Liste von{" "}
        <Link href={`/u/${list.user.username}`} className="font-semibold text-text hover:text-lime">
          {list.user.display_name}
        </Link>
        <span className="text-faint">· aktualisiert {timeAgo(list.updated_at)}</span>
      </div>
      <h1 className="mt-3 font-display text-4xl font-bold">{list.title}</h1>
      {list.description && <p className="mt-3 max-w-2xl whitespace-pre-line text-muted">{list.description}</p>}
      <div className="mt-5 flex items-center gap-3">
        {viewer ? (
          <ToggleButton variant="link" on={await hasLikedList(viewer.id, id)} count={list.likes} action={toggleListLike.bind(null, id)} onLabel="♥ Geliked" offLabel="♡ Liste liken" />
        ) : (
          <span className="text-sm text-muted">♥ {list.likes}</span>
        )}
        <span className="text-sm text-faint">· {list.games.length} Spiele</span>
        {mine && (
          <Link href={`/list/${id}/edit`} className="btn-ghost ml-auto !py-1.5">
            Bearbeiten
          </Link>
        )}
      </div>
      {mine && (
        <div className="mt-6">
          <ListAddGame listId={id} existing={list.games.map((g) => g.id)} />
        </div>
      )}
      <ol className="mt-8 grid grid-cols-3 gap-5 sm:grid-cols-4 md:grid-cols-6">
        {list.games.map((g, i) => (
          <li key={g.id}>
            <GameCover game={g} size="fluid" />
            <div className="mt-1 flex items-center justify-between text-xs">
              {list.ranked ? <span className="font-display text-lg font-bold text-muted">{i + 1}</span> : <span />}
              {mine && (
                <span className="flex gap-2 text-faint">
                  <form action={moveListItem.bind(null, id, g.id, -1)}>
                    <button title="Nach vorne" className="hover:text-text">◀</button>
                  </form>
                  <form action={moveListItem.bind(null, id, g.id, 1)}>
                    <button title="Nach hinten" className="hover:text-text">▶</button>
                  </form>
                  <form action={toggleListItem.bind(null, id, g.id)}>
                    <button title="Entfernen" className="hover:text-coral">✕</button>
                  </form>
                </span>
              )}
            </div>
          </li>
        ))}
      </ol>
      {!list.games.length && <p className="mt-8 text-muted">Diese Liste ist noch leer.</p>}
    </div>
  );
}
