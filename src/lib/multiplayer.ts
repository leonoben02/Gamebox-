// How a game can be played together, derived from IGDB game_modes + multiplayer_modes.
// Stored in games.multiplayer as a comma list of tags; NULL = not looked up yet, "" = unknown.

export type MpTag = "single" | "local" | "online" | "coop";

export const MP_LABELS: Record<MpTag, { label: string; short: string; color: string }> = {
  single: { label: "Einzelspieler", short: "Solo", color: "#8e88a8" },
  local: { label: "Lokaler Multiplayer", short: "Couch", color: "#ffb547" },
  online: { label: "Online-Multiplayer", short: "Online", color: "#3fd0e0" },
  coop: { label: "Koop", short: "Koop", color: "#b6f24a" },
};

type Mm = {
  onlinecoop?: boolean;
  offlinecoop?: boolean;
  lancoop?: boolean;
  splitscreen?: boolean;
  onlinemax?: number;
  offlinemax?: number;
  onlinecoopmax?: number;
  offlinecoopmax?: number;
};

export function multiplayerTags(gameModes: { slug?: string; name?: string }[] = [], mm: Mm[] = []): string {
  const modes = new Set(gameModes.map((m) => m.slug ?? m.name ?? ""));
  const t = new Set<MpTag>();
  if (modes.has("single-player") || modes.has("Single player")) t.add("single");
  for (const m of mm) {
    if (m.onlinecoop || (m.onlinemax ?? 0) > 1 || (m.onlinecoopmax ?? 0) > 1) t.add("online");
    if (m.offlinecoop || m.splitscreen || (m.offlinemax ?? 0) > 1 || (m.offlinecoopmax ?? 0) > 1) t.add("local");
    if (m.onlinecoop || m.offlinecoop || m.lancoop) t.add("coop");
  }
  if (modes.has("split-screen") || modes.has("Split screen")) t.add("local");
  if (modes.has("co-operative") || modes.has("Co-operative")) t.add("coop");
  if ([...modes].some((s) => /massively|battle-royale|Battle Royale/i.test(s))) t.add("online");
  // "Multiplayer" without details: almost always online for anything recent
  if ((modes.has("multiplayer") || modes.has("Multiplayer")) && !t.has("local") && !t.has("online")) t.add("online");
  return (["single", "local", "online", "coop"] as MpTag[]).filter((x) => t.has(x)).join(",");
}

export const MP_FIELDS =
  "game_modes.slug,multiplayer_modes.onlinecoop,multiplayer_modes.offlinecoop,multiplayer_modes.lancoop,multiplayer_modes.splitscreen," +
  "multiplayer_modes.onlinemax,multiplayer_modes.offlinemax,multiplayer_modes.onlinecoopmax,multiplayer_modes.offlinecoopmax";
