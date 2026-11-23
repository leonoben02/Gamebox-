import Link from "next/link";

/** A titled, horizontally scrolling shelf of covers, like the app's home rows. */
export function CoverRow({ title, href, subtitle, children }: { title: string; href?: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="min-w-0">
      <div className="mb-3 flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold leading-tight sm:text-[26px]">
            {href ? (
              <Link href={href} className="hover:text-lime">
                {title}
              </Link>
            ) : (
              title
            )}
          </h2>
          {subtitle && <p className="mt-0.5 text-muted">{subtitle}</p>}
        </div>
        {href && (
          <Link href={href} aria-label={`${title}: alle anzeigen`} className="pb-1 text-2xl leading-none text-muted hover:text-lime">
            ›
          </Link>
        )}
      </div>
      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:gap-4 [&::-webkit-scrollbar]:hidden">
        {children}
      </div>
    </section>
  );
}

export function RowItem({ children }: { children: React.ReactNode }) {
  return <div className="w-[38%] shrink-0 snap-start sm:w-[150px] md:w-[170px]">{children}</div>;
}
