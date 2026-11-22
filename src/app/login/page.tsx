import { AuthForm } from "@/components/AuthForm";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const next = (await searchParams).next;
  return (
    <div className="mx-auto max-w-sm py-10">
      <h1 className="mb-6 text-center font-display text-3xl font-bold">Willkommen zurück</h1>
      <AuthForm mode="login" next={typeof next === "string" ? next : undefined} />
    </div>
  );
}
