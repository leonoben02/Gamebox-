import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getUserByUsername, userReviews } from "@/lib/queries";
import { ReviewCard } from "@/components/ReviewCard";

export default async function UserReviewsPage({ params }: PageProps<"/u/[username]/reviews">) {
  const profile = await getUserByUsername((await params).username);
  if (!profile) notFound();
  const viewer = await getCurrentUser();
  const reviews = await userReviews(profile.id, viewer?.id ?? 0, 500);
  return (
    <div className="max-w-3xl">
      {reviews.length ? reviews.map((r) => <ReviewCard key={r.id} r={r} loggedIn={Boolean(viewer)} />) : <p className="text-muted">Noch keine Reviews.</p>}
    </div>
  );
}
