import Link from "next/link";

type U = { username: string; display_name: string; avatar_hue: number };

export function Avatar({ user, size = 32, link = true }: { user: U; size?: number; link?: boolean }) {
  const el = (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-display font-bold text-white/95 ring-1 ring-white/15"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        background: `linear-gradient(135deg, hsl(${user.avatar_hue} 70% 55%), hsl(${(user.avatar_hue + 60) % 360} 65% 35%))`,
      }}
      title={user.display_name}
    >
      {user.display_name.slice(0, 1).toUpperCase()}
    </span>
  );
  return link ? <Link href={`/u/${user.username}`}>{el}</Link> : el;
}
