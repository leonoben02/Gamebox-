import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getUserByUsername, isFollowing, profileStats } from "@/lib/queries";
import { toggleFollow } from "@/app/actions";
import { Avatar } from "@/components/Avatar";
import { ProfileTabs } from "@/components/ProfileTabs";
import { ToggleButton } from "@/components/ToggleForm";

export default async function ProfileLayout({ children, params }: LayoutProps<"/u/[username]">) {
  const { username } = await params;
  const profile = await getUserByUsername(username);
  if (!profile) notFound();
  const viewer = await getCurrentUser();
  const stats = await profileStats(profile.id);
  const isMe = viewer?.id === profile.id;
  const base = `/u/${profile.username}`;

  const stat = (n: number, label: string, href: string) => (
    <Link href={href} className="px-4 text-center first:pl-0 last:pr-0 hover:text-lime">
      <div className="font-display text-2xl font-bold">{n}</div>
      <div className="text-[11px] uppercase tracking-widest text-muted">{label}</div>
    </Link>
  );

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-center gap-6">
        <Avatar user={profile} size={88} link={false} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-3xl font-bold">{profile.display_name}</h1>
            {isMe ? (
              <Link href="/settings" className="btn-ghost !py-1 text-xs uppercase tracking-wider">
                Profil bearbeiten
              </Link>
            ) : viewer ? (
              <ToggleButton on={await isFollowing(viewer.id, profile.id)} action={toggleFollow.bind(null, profile.id)} onLabel="Folge ich" offLabel="Folgen" className="text-xs uppercase tracking-wider" />
            ) : null}
          </div>
          <p className="text-sm text-faint">@{profile.username}</p>
          {profile.bio && <p className="mt-2 max-w-xl text-sm text-muted">{profile.bio}</p>}
        </div>
        <div className="flex divide-x divide-line">
          {stat(stats.played, "Spiele", `${base}/games`)}
          {stat(stats.thisYear, "Dieses Jahr", `${base}/diary`)}
          {stat(stats.lists, "Listen", `${base}/lists`)}
          {stat(stats.following, "Folgt", `${base}/following`)}
          {stat(stats.followers, "Follower", `${base}/followers`)}
        </div>
      </header>
      <ProfileTabs username={profile.username} />
      {children}
    </div>
  );
}
