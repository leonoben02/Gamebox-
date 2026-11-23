import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { activityFeed, followingIds } from "@/lib/queries";
import { ActivityRow } from "@/components/ActivityRow";

export default async function ActivityPage({ searchParams }: PageProps<"/activity">) {
  const user = await requireUser();
  const mode = (await searchParams).mode === "me" ? "me" : "friends";
  const feed = await activityFeed({ userIds: mode === "me" ? [user.id] : await followingIds(user.id), limit: 100 });
  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-3xl font-bold">Aktivität</h1>
      <div className="mt-4 flex gap-5 border-b border-line">
        <Link href="?mode=friends" className={`tab ${mode === "friends" ? "tab-active" : ""}`}>
          Freunde
        </Link>
        <Link href="?mode=me" className={`tab ${mode === "me" ? "tab-active" : ""}`}>
          Ich
        </Link>
      </div>
      <ul>
        {feed.map((a) => (
          <ActivityRow key={a.id} a={a} />
        ))}
      </ul>
      {!feed.length && (
        <p className="py-10 text-center text-muted">
          Noch nichts los. <Link href="/members" className="text-lime">Finde Leute zum Folgen</Link>.
        </p>
      )}
    </div>
  );
}
