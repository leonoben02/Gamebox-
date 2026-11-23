// Turns IGDB platform abbreviations (and our own seed spellings) into readable names grouped by family,
// so game pages can show simple coloured badges instead of a raw comma list.

export type Family = "playstation" | "xbox" | "nintendo" | "pc" | "mobile" | "other";

export const FAMILIES: { key: Family; label: string; color: string }[] = [
  { key: "playstation", label: "PlayStation", color: "#4c8dff" },
  { key: "xbox", label: "Xbox", color: "#45c763" },
  { key: "nintendo", label: "Nintendo", color: "#ff5a5f" },
  { key: "pc", label: "PC", color: "#b9b4cc" },
  { key: "mobile", label: "Mobil", color: "#c58bff" },
  { key: "other", label: "Weitere", color: "#8e88a8" },
];

// [label, family, rank] – lower rank = newer, shown first within a family
const KNOWN: Record<string, [string, Family, number]> = {
  PS5: ["PS5", "playstation", 1],
  PS4: ["PS4", "playstation", 2],
  PS3: ["PS3", "playstation", 3],
  PS2: ["PS2", "playstation", 4],
  PS1: ["PS1", "playstation", 5],
  PSVR: ["PS VR", "playstation", 6],
  PSVR2: ["PS VR2", "playstation", 6],
  Vita: ["PS Vita", "playstation", 7],
  PSP: ["PSP", "playstation", 8],
  "Series X|S": ["Series X|S", "xbox", 1],
  "Xbox Series X|S": ["Series X|S", "xbox", 1],
  XONE: ["Xbox One", "xbox", 2],
  "Xbox One": ["Xbox One", "xbox", 2],
  X360: ["Xbox 360", "xbox", 3],
  "Xbox 360": ["Xbox 360", "xbox", 3],
  XBOX: ["Xbox", "xbox", 4],
  Xbox: ["Xbox", "xbox", 4],
  "Switch 2": ["Switch 2", "nintendo", 0],
  Switch: ["Switch", "nintendo", 1],
  WiiU: ["Wii U", "nintendo", 2],
  "Wii U": ["Wii U", "nintendo", 2],
  Wii: ["Wii", "nintendo", 3],
  "3DS": ["3DS", "nintendo", 4],
  "New 3DS": ["3DS", "nintendo", 4],
  NDS: ["DS", "nintendo", 5],
  DS: ["DS", "nintendo", 5],
  "Nintendo DSi": ["DS", "nintendo", 5],
  NGC: ["GameCube", "nintendo", 6],
  GameCube: ["GameCube", "nintendo", 6],
  GBA: ["GBA", "nintendo", 7],
  N64: ["N64", "nintendo", 8],
  GBC: ["Game Boy Color", "nintendo", 9],
  "Game Boy": ["Game Boy", "nintendo", 10],
  SNES: ["SNES", "nintendo", 11],
  SFAM: ["SNES", "nintendo", 11],
  NES: ["NES", "nintendo", 12],
  famicom: ["NES", "nintendo", 12],
  PC: ["PC", "pc", 1],
  Mac: ["Mac", "pc", 2],
  Linux: ["Linux", "pc", 3],
  DOS: ["DOS", "pc", 4],
  Stadia: ["Stadia", "other", 9],
  iOS: ["iOS", "mobile", 1],
  Android: ["Android", "mobile", 2],
  Mobile: ["Mobil", "mobile", 3],
};

export type Platform = { label: string; family: Family; rank: number };

export function parsePlatform(raw: string): Platform {
  const k = KNOWN[raw.trim()];
  return k ? { label: k[0], family: k[1], rank: k[2] } : { label: raw.trim(), family: "other", rank: 50 };
}

/** Platforms grouped by family (PlayStation, Xbox, Nintendo, PC, Mobil, Weitere), newest first, without duplicates. */
export function groupPlatforms(csv: string): { family: (typeof FAMILIES)[number]; items: string[] }[] {
  const seen = new Set<string>();
  const list = csv
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s && s !== "Diverse")
    .map(parsePlatform)
    .filter((p) => (seen.has(p.label) ? false : (seen.add(p.label), true)));
  return FAMILIES.map((family) => ({
    family,
    items: list
      .filter((p) => p.family === family.key)
      .sort((a, b) => a.rank - b.rank)
      .map((p) => p.label),
  })).filter((g) => g.items.length);
}

/** Raw spellings stored in games.platforms for one family, for the browse filter. */
export function rawNamesFor(family: Family): string[] {
  return Object.entries(KNOWN)
    .filter(([, v]) => v[1] === family)
    .map(([k]) => k);
}
