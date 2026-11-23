import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getList } from "@/lib/queries";
import { deleteList, updateList } from "@/app/actions";
import { ListForm } from "@/components/ListForm";

export default async function EditListPage({ params }: PageProps<"/list/[id]/edit">) {
  const user = await requireUser();
  const id = Number((await params).id);
  const list = await getList(id);
  if (!list || list.user.id !== user.id) notFound();
  return (
    <div className="max-w-xl">
      <Link href={`/list/${id}`} className="text-sm text-muted hover:text-text">
        ← Zurück zur Liste
      </Link>
      <h1 className="mb-6 mt-2 font-display text-3xl font-bold">Liste bearbeiten</h1>
      <ListForm action={updateList.bind(null, id)} defaults={list} submitLabel="Speichern" />
      <form action={deleteList.bind(null, id)} className="mt-10 border-t border-line pt-6">
        <button className="text-sm text-coral hover:underline">Liste löschen</button>
      </form>
    </div>
  );
}
