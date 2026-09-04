export function formatDate(value: string | undefined | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

/** Date du jour au format yyyy-mm-dd, en heure locale (aucun décalage UTC). */
export function todayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Décale une date yyyy-mm-dd de n jours (gère mois et années). */
export function addDaysKey(key: string, days: number): string {
  const [y = 1970, m = 1, d = 1] = key.split("-").map(Number);
  return todayKey(new Date(y, m - 1, d + days));
}

/** Libellé relatif : Aujourd'hui, Demain, Hier, ou date formatée. */
export function relativeDateLabel(value: string): string {
  if (!value) return "Non planifiée";
  const today = todayKey();
  if (value === today) return "Aujourd'hui";
  if (value === addDaysKey(today, 1)) return "Demain";
  if (value === addDaysKey(today, -1)) return "Hier";
  return formatDate(value);
}

/** Nombre de jours entiers entre deux dates yyyy-mm-dd. */
export function daysBetween(from: string, to: string): number {
  const [y1 = 1970, m1 = 1, d1 = 1] = from.split("-").map(Number);
  const [y2 = 1970, m2 = 1, d2 = 1] = to.split("-").map(Number);
  const a = Date.UTC(y1, m1 - 1, d1);
  const b = Date.UTC(y2, m2 - 1, d2);
  return Math.round((b - a) / 86400000);
}

