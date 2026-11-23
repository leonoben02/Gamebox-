import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { syncCompany } from "@/lib/igdb";
import { companyGames, getCompanyBySlug, playedAmong } from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth";
import { PlayedMark, ProgressMeter } from "@/components/ProgressMeter";
import { GameCover } from "@/components/GameCover";
import { countryName } from "@/lib/util";

export async function generateMetadata({ params }: PageProps<"/studio/[slug]">): Promise<Metadata> {
  const c = await getCompanyBySlug((await params).slug);
  return { title: c?.name ?? "Studio" };
}

const ROLES = [
  ["all", "Alle"],
  ["developer", "Entwickelt"],
  ["publisher", "Veröffentlicht"],
] as const;

export default async function StudioPage({ params, searchParams }: PageProps<"/studio/[slug]">) {
  const { slug } = await params;
  const first = await getCompanyBySlug(slug);
  if (!first) notFound();
  if (!first.synced_at) await syncCompany(first.id);
  const studio = (await getCompanyBySlug(slug))!;
  const r = (await searchParams).role;
  const role = ROLES.find(([k]) => k === r)?.[0] ?? "all";
  const games = await companyGames(studio.id, role);
  const all = role === "all" ? games : await companyGames(studio.id, "all");
  const devCount = all.filter((g) => g.developer).length;
  const pubCount = all.filter((g) => g.publisher).length;
  const counts = { all: all.length, developer: devCount, publisher: pubCount };
  const country = countryName(studio.country);
  const viewer = await getCurrentUser();
  const played = viewer ? await playedAmong(viewer.id, games.map((g) => g.id)) : new Set<number>();

  return (
    <div>
      <header className="flex flex-wrap items-start gap-6">
        <div className={`flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl p-3 ring-1 ring-white/5 ${studio.logo_url ? "bg-[#ece9f6]" : "bg-surface"}`}>
          {studio.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={studio.logo_url} alt="" className="max-h-full max-w-full object-contain" />
          ) : (
            <span className="font-display text-4xl font-bold text-muted">{studio.name.slice(0, 1)}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Studio</p>
          <h1 className="font-display text-4xl font-bold leading-tight">{studio.name}</h1>
          <p className="mt-1 text-sm text-muted">
            {[country, studio.founded && `gegründet ${studio.founded}`, `${all.length} ${all.length === 1 ? "Spiel" : "Spiele"}`].filter(Boolean).join(" · ")}
            {studio.website && (
              <>
                {" · "}
                <a href={studio.website} target="_blank" rel="noreferrer" className="hover:text-lime">
                  Website ↗
                </a>
              </>
            )}
          </p>
          {studio.description && <p className="mt-4 max-w-prose text-[15px] leading-relaxed text-text/85">{studio.description}</p>}
        </div>
      </header>

      <nav className="mt-8 flex gap-6 border-b border-line">
        {ROLES.map(([k, label]) => (
          <Link key={k} href={k === "all" ? "?" : `?role=${k}`} className={`tab ${role === k ? "tab-active" : ""}`}>
            {label} <span className="text-faint">{counts[k]}</span>
          </Link>
        ))}
      </nav>

      {viewer && games.length > 0 && <ProgressMeter done={played.size} total={games.length} className="mt-6" />}
      {games.length ? (
        <div className="mt-6 grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6">
          {games.map((g) => (
            <div key={g.id}>
              <GameCover game={g} size="fluid" />
              <div className="mt-1 flex justify-between text-[11px] text-faint">
                <span>
                  {g.year ?? "–"} {played.has(g.id) && <PlayedMark />}
                </span>
                {g.players > 0 && <span>▶ {g.players}</span>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="py-10 text-center text-muted">Keine Spiele gefunden.</p>
      )}
    </div>
  );
}
