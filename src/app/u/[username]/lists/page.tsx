import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getUserByUsername, userLists } from "@/lib/queries";
import { ListCard } from "@/components/ListCard";

export default async function UserListsPage({ params }: PageProps<"/u/[username]/lists">) {
  const profile = getUserByUsername((await params).username);
  if (!profile) notFound();
  const viewer = await getCurrentUser();
  const lists = userLists(profile.id);
  return (
    <div>
      {viewer?.id === profile.id && (
        <Link href="/list/new" className="btn-primary mb-6">
          + Neue Liste
        </Link>
      )}
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {lists.map((l) => (
          <ListCard key={l.id} list={l} />
        ))}
      </div>
      {!lists.length && <p className="text-muted">Noch keine Listen.</p>}
    </div>
  );
}
