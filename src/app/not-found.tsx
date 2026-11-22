import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-24 text-center">
      <p className="font-display text-7xl font-bold text-lime">404</p>
      <p className="mt-3 text-muted">Game Over. Diese Seite gibt es nicht.</p>
      <Link href="/" className="btn-primary mt-6">
        Neues Spiel starten
      </Link>
    </div>
  );
}
