"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, signup } from "@/app/actions";

export function AuthForm({ mode, next }: { mode: "login" | "signup"; next?: string }) {
  const [state, action, pending] = useActionState(mode === "login" ? login : signup, undefined);
  return (
    <form action={action} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      <div>
        <label className="field-label">Benutzername</label>
        <input name="username" required autoComplete="username" className="field" />
      </div>
      {mode === "signup" && (
        <div>
          <label className="field-label">Anzeigename</label>
          <input name="display_name" className="field" placeholder="optional" />
        </div>
      )}
      <div>
        <label className="field-label">Passwort</label>
        <input name="password" type="password" required autoComplete={mode === "login" ? "current-password" : "new-password"} className="field" />
      </div>
      {state?.error && <p className="text-sm text-coral">{state.error}</p>}
      <button className="btn-primary w-full !py-2.5" disabled={pending}>
        {mode === "login" ? "Anmelden" : "Konto erstellen"}
      </button>
      <p className="text-center text-sm text-muted">
        {mode === "login" ? (
          <>
            Neu hier? <Link href="/signup" className="text-lime">Konto erstellen</Link>
          </>
        ) : (
          <>
            Schon dabei? <Link href="/login" className="text-lime">Anmelden</Link>
          </>
        )}
      </p>
    </form>
  );
}
