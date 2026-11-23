import Link from "next/link";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { favoriteGames, followingIds, popularMembers } from "@/lib/queries";
import { toggleFollow } from "@/app/actions";
import { Avatar } from "@/components/Avatar";
import { GameCover } from "@/components/GameCover";
import { ToggleButton } from "@/components/ToggleForm";

export const metadata: Metadata = { title: "Mitglieder" };

export default async function MembersPage() {
  const viewer = await getCurrentUser();
  const following = new Set(viewer ? await followingIds(viewer.id) : []);
  const members = await popularMembers(60);
  const favs = await Promise.all(members.map((m) => favoriteGames(m.id)));
  return (
    <div>
      <h1 className="font-display text-3xl font-bold">Mitglieder</h1>
      <p className="mt-1 text-muted">Folge Leuten, deren Geschmack du vertraust.</p>
      <ul className="mt-8">
        {members.map((m, i) => (
          <li key={m.id} className="flex flex-wrap items-center gap-4 border-b border-line py-4">
            <Avatar user={m} size={48} />
            <div className="min-w-40 flex-1">
              <Link href={`/u/${m.username}`} className="font-display text-lg font-bold hover:text-lime">
                {m.display_name}
              </Link>
              <p className="text-xs text-muted">
                {m.played} Spiele · {m.reviews} Reviews · {m.followers} Follower
              </p>
            </div>
            <div className="hidden gap-2 sm:flex">
              {favs[i].map((g) => (
                <GameCover key={g.id} game={g} size="xs" />
              ))}
            </div>
            {viewer && viewer.id !== m.id && (
              <ToggleButton on={following.has(m.id)} action={toggleFollow.bind(null, m.id)} onLabel="Folge ich" offLabel="Folgen" className="text-xs" />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
