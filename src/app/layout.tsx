import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Logo } from "@/components/Logo";
import "./globals.css";

const body = Inter({ variable: "--font-body", subsets: ["latin"] });
const display = Space_Grotesk({ variable: "--font-display", subsets: ["latin"], weight: ["500", "600", "700"] });

// Every page reads the session cookie and the database, so never prerender at build time.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Gamebox – Dein Spiele-Tagebuch", template: "%s · Gamebox" },
  description: "Logge die Spiele, die du spielst. Bewerte, schreib Reviews, führe deine Playlist und entdecke, was deine Freunde zocken.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="de" className={`${body.variable} ${display.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <Header />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-8 pb-28 md:pb-8">{children}</main>
        <footer className="hidden border-t border-line bg-bg-2 md:block">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-6 text-sm text-faint">
            <Logo className="opacity-70" />
            <div className="flex gap-5">
              <Link href="/games" className="hover:text-text">Spiele</Link>
              <Link href="/lists" className="hover:text-text">Listen</Link>
              <Link href="/members" className="hover:text-text">Mitglieder</Link>
            </div>
            <span>Spieledaten via IGDB.com</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
