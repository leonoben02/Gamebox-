"use client";

import { useState } from "react";

/** Underlined tab bar like the app's Cast/Crew/Details row; panels are rendered on the server. */
export function Tabs({ tabs, className = "" }: { tabs: { label: string; content: React.ReactNode }[]; className?: string }) {
  const [active, setActive] = useState(0);
  return (
    <div className={className}>
      <div role="tablist" className="flex gap-6 overflow-x-auto border-b border-line">
        {tabs.map((t, i) => (
          <button
            key={t.label}
            role="tab"
            type="button"
            aria-selected={i === active}
            onClick={() => setActive(i)}
            className={`tab whitespace-nowrap !pb-2.5 text-[15px] ${i === active ? "tab-active" : ""}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t, i) => (
        <div key={t.label} role="tabpanel" hidden={i !== active} className="pt-2">
          {t.content}
        </div>
      ))}
    </div>
  );
}
