import { notFound } from "next/navigation";
import { getUserByUsername, userGames } from "@/lib/queries";
import { GameGrid } from "@/components/GameGrid";

export default async function LikesPage({ params }: PageProps<"/u/[username]/likes">) {
  const profile = await getUserByUsername((await params).username);
  if (!profile) notFound();
  const games = await userGames(profile.id, "liked", "recent");
  return (
    <div>
      <h2 className="section-title">Gelikte Spiele</h2>
      <GameGrid games={games} showMeta empty="Noch keine Likes." />
    </div>
  );
}
