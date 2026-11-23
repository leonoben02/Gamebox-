import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getUserByUsername, isFollowing, profileStats } from "@/lib/queries";
import { toggleFollow } from "@/app/actions";
import { Avatar } from "@/components/Avatar";
import { ProfileTabs } from "@/components/ProfileTabs";
import { ToggleButton } from "@/components/ToggleForm";

export default async function ProfileLayout(props: LayoutProps<"/u/[username]">) {
  try {
    return await ProfileShell(props);
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e && String((e as { digest: unknown }).digest).startsWith("NEXT_")) throw e;
    return (
      <p className="rounded-lg border border-coral/50 bg-coral/10 p-4 text-sm break-words">
        <b>Fehler im Profilkopf:</b> {e instanceof Error ? `${e.name}: ${e.message}` : String(e)}
      </p>
    );
  }
}

async function ProfileShell({ children, params }: LayoutProps<"/u/[username]">) {
  const { username } = await params;
  const profile = await getUserByUsername(username);
  if (!profile) notFound();
  const viewer = await getCurrentUser();
  const stats = await profileStats(profile.id);
  const isMe = viewer?.id === profile.id;
  const base = `/u/${profile.username}`;

  const stat = (n: number, label: string, href: string) => (
    <Link href={href} className="min-w-0 flex-1 px-2 text-center first:pl-0 last:pr-0 hover:text-lime sm:flex-none sm:px-4">
      <div className="font-display text-2xl font-bold">{n}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted sm:text-[11px] sm:tracking-widest">{label}</div>
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
        <div className="flex w-full justify-between divide-x divide-line sm:w-auto sm:justify-start">
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
