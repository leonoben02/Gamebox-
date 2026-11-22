import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { gameReviews, getGameBySlug } from "@/lib/queries";
import { GameCover } from "@/components/GameCover";
import { ReviewCard } from "@/components/ReviewCard";

export default async function GameReviews({ params, searchParams }: PageProps<"/game/[slug]/reviews">) {
  const { slug } = await params;
  const sort = (await searchParams).sort === "recent" ? "recent" : "popular";
  const game = getGameBySlug(slug);
  if (!game) notFound();
  const user = await getCurrentUser();
  const reviews = gameReviews(game.id, user?.id ?? 0, sort, 200);
  return (
    <div className="grid gap-8 md:grid-cols-[150px_1fr]">
      <GameCover game={game} size="lg" />
      <div>
        <p className="text-sm text-muted">Reviews zu</p>
        <h1 className="font-display text-3xl font-bold">
          <Link href={`/game/${game.slug}`} className="hover:text-lime">
            {game.title}
          </Link>
        </h1>
        <div className="mt-4 flex gap-4 border-b border-line">
          <Link href="?sort=popular" className={`tab ${sort === "popular" ? "tab-active" : ""}`}>
            Beliebt
          </Link>
          <Link href="?sort=recent" className={`tab ${sort === "recent" ? "tab-active" : ""}`}>
            Neueste
          </Link>
        </div>
        {reviews.length ? reviews.map((r) => <ReviewCard key={r.id} r={r} showGame={false} loggedIn={Boolean(user)} />) : <p className="py-8 text-muted">Noch keine Reviews.</p>}
      </div>
    </div>
  );
}
