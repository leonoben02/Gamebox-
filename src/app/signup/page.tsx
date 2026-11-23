import { AuthForm } from "@/components/AuthForm";
import { googleEnabled } from "@/lib/google";

export default function SignupPage() {
  return (
    <div className="mx-auto max-w-sm py-10">
      <h1 className="mb-2 text-center font-display text-3xl font-bold">Werde Teil von Gamebox</h1>
      <p className="mb-6 text-center text-sm text-muted">Logge Spiele, schreib Reviews, folge Freunden.</p>
      <AuthForm mode="signup" google={googleEnabled()} />
    </div>
  );
}
