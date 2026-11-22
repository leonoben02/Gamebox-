export function Logo({ className = "" }: { className?: string }) {
  // A cartridge-shaped "box" with three save-slot dots.
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden>
        <rect x="3" y="5" width="26" height="22" rx="6" fill="var(--violet)" />
        <rect x="7" y="9" width="18" height="10" rx="2.5" fill="var(--bg)" />
        <circle cx="11" cy="23" r="1.8" fill="var(--lime)" />
        <circle cx="16" cy="23" r="1.8" fill="var(--coral)" />
        <circle cx="21" cy="23" r="1.8" fill="var(--cyan)" />
        <path d="M14 11.5 L19 14 L14 16.5 Z" fill="var(--lime)" />
      </svg>
      <span className="font-display text-xl font-bold tracking-tight">gamebox</span>
    </span>
  );
}
