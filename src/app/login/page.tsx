import { AuthForm } from "@/components/AuthForm";
import { googleEnabled } from "@/lib/google";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = sp.next;
  const error = sp.error === "google" ? "Die Anmeldung mit Google hat nicht geklappt. Bitte nochmal versuchen." : undefined;
  return (
    <div className="mx-auto max-w-sm py-10">
      <h1 className="mb-6 text-center font-display text-3xl font-bold">Willkommen zurück</h1>
      <AuthForm mode="login" next={typeof next === "string" ? next : undefined} google={googleEnabled()} error={error} />
    </div>
  );
}
