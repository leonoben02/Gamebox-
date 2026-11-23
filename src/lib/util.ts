export function slugify(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** rating is stored as 1..10 half-stars */
export function starsText(rating: number | null | undefined): string {
  if (!rating) return "";
  return "★".repeat(Math.floor(rating / 2)) + (rating % 2 ? "½" : "");
}

const MONTHS = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
const MONTHS_LONG = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return `${d}. ${MONTHS[m - 1]} ${y}`;
}

export function monthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return `${MONTHS_LONG[m - 1]} ${y}`;
}

export function timeAgo(iso: string): string {
  const t = new Date(iso.includes("T") ? iso : iso.replace(" ", "T") + "Z").getTime();
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 60) return "gerade eben";
  if (s < 3600) return `vor ${Math.floor(s / 60)} Min.`;
  if (s < 86400) return `vor ${Math.floor(s / 3600)} Std.`;
  if (s < 86400 * 30) return `vor ${Math.floor(s / 86400)} T.`;
  return formatDate(iso);
}

export const STATUS_LABELS: Record<string, string> = {
  played: "Gespielt",
  completed: "Durchgespielt",
  mastered: "100 %",
  abandoned: "Abgebrochen",
};

/** deterministic hue for generated covers */
export function hueFor(s: string): number {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % 360;
}

// ISO 3166 numeric -> alpha-2 for the countries game studios most often come from (IGDB stores numeric codes).
const ISO_NUM: Record<number, string> = {
  36: "AU", 40: "AT", 56: "BE", 76: "BR", 124: "CA", 156: "CN", 203: "CZ", 208: "DK", 246: "FI", 250: "FR", 276: "DE",
  348: "HU", 372: "IE", 376: "IL", 380: "IT", 392: "JP", 410: "KR", 484: "MX", 528: "NL", 554: "NZ", 578: "NO", 616: "PL",
  620: "PT", 643: "RU", 702: "SG", 703: "SK", 724: "ES", 752: "SE", 756: "CH", 158: "TW", 792: "TR", 804: "UA", 826: "GB",
  840: "US", 32: "AR", 152: "CL", 170: "CO", 710: "ZA", 356: "IN", 360: "ID", 458: "MY", 608: "PH", 764: "TH", 704: "VN",
  112: "BY", 233: "EE", 428: "LV", 440: "LT", 642: "RO", 100: "BG", 191: "HR", 688: "RS", 705: "SI", 300: "GR", 352: "IS",
};

export function countryName(num: number | null | undefined): string {
  if (!num || !ISO_NUM[num]) return "";
  try {
    return new Intl.DisplayNames(["de"], { type: "region" }).of(ISO_NUM[num]) ?? "";
  } catch {
    return "";
  }
}

export function roleLabel(r: { developer: number; publisher: number; porting: number; supporting: number }): string {
  return [r.developer && "Entwickler", r.publisher && "Publisher", r.porting && "Portierung", r.supporting && "Unterstützung"]
    .filter(Boolean)
    .join(" · ");
}
