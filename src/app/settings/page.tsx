import { requireUser } from "@/lib/auth";
import { favoriteGames } from "@/lib/queries";
import { SettingsForm } from "@/components/SettingsForm";

export default async function SettingsPage() {
  const user = await requireUser();
  return (
    <div className="max-w-xl">
      <h1 className="mb-6 font-display text-3xl font-bold">Einstellungen</h1>
      <SettingsForm user={user} favorites={await favoriteGames(user.id)} />
    </div>
  );
}
