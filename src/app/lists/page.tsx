import Link from "next/link";
import type { Metadata } from "next";
import { popularLists } from "@/lib/queries";
import { ListCard } from "@/components/ListCard";

export const metadata: Metadata = { title: "Listen" };

export default async function ListsPage() {
  const lists = await popularLists(48);
  return (
    <div>
      <div className="mb-8 text-center">
        <h1 className="font-display text-3xl font-bold">Sammle, kuratiere, teile.</h1>
        <p className="mt-2 text-muted">Listen sind der perfekte Weg, Spiele zu gruppieren.</p>
        <Link href="/list/new" className="btn-primary mt-5">
          + Neue Liste
        </Link>
      </div>
      <h2 className="section-title">Beliebte Listen</h2>
      <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
        {lists.map((l) => (
          <ListCard key={l.id} list={l} />
        ))}
      </div>
    </div>
  );
}
