import { requireUser } from "@/lib/auth";
import { createList } from "@/app/actions";
import { ListForm } from "@/components/ListForm";

export default async function NewListPage({ searchParams }: PageProps<"/list/new">) {
  await requireUser();
  const game = Number((await searchParams).game) || undefined;
  return (
    <div className="max-w-xl">
      <h1 className="mb-6 font-display text-3xl font-bold">Neue Liste</h1>
      <ListForm action={createList} gameId={game} submitLabel="Liste erstellen" />
      <p className="mt-4 text-sm text-muted">Spiele fügst du danach auf der Listenseite oder direkt auf jeder Spielseite hinzu.</p>
    </div>
  );
}
