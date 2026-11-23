import Link from "next/link";
import { notFound } from "next/navigation";
import { followList, getUserByUsername } from "@/lib/queries";
import { Avatar } from "@/components/Avatar";

export default async function Page({ params }: PageProps<"/u/[username]/followers">) {
  const profile = await getUserByUsername((await params).username);
  if (!profile) notFound();
  const people = await followList(profile.id, "followers");
  return (
    <div className="max-w-2xl">
      <h2 className="section-title">Follower</h2>
      {!people.length && <p className="text-muted">Niemand bisher.</p>}
      <ul>
        {people.map((p) => (
          <li key={p.id} className="flex items-center gap-3 border-b border-line py-3">
            <Avatar user={p} size={40} />
            <div>
              <Link href={`/u/${p.username}`} className="font-semibold hover:text-lime">
                {p.display_name}
              </Link>
              <p className="text-xs text-muted">{p.played} Spiele gespielt</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
