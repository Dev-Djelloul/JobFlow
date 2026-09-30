/** Code INSEE région (nomenclature 2016) → nom officiel. */
export const REGION_NAMES: Record<string, string> = {
  "11": "Île-de-France",
  "24": "Centre-Val de Loire",
  "27": "Bourgogne-Franche-Comté",
  "28": "Normandie",
  "32": "Hauts-de-France",
  "44": "Grand Est",
  "52": "Pays de la Loire",
  "53": "Bretagne",
  "75": "Nouvelle-Aquitaine",
  "76": "Occitanie",
  "84": "Auvergne-Rhône-Alpes",
  "93": "Provence-Alpes-Côte d'Azur",
  "94": "Corse",
  "01": "Guadeloupe",
  "02": "Martinique",
  "03": "Guyane",
  "04": "La Réunion",
  "06": "Mayotte",
};

/** Retrouve le nom de la région à partir d'un code, quelle que soit sa forme ("11", "1"…). */
export function regionName(code: string): string {
  const trimmed = code.trim();
  if (!trimmed) return "";
  if (REGION_NAMES[trimmed]) return REGION_NAMES[trimmed];
  const padded = trimmed.padStart(2, "0");
  return REGION_NAMES[padded] ?? "";
}

/** Régions triées par nom, pour un menu déroulant. */
export const REGION_OPTIONS = Object.entries(REGION_NAMES)
  .map(([code, name]) => ({ code, name }))
  .sort((a, b) => a.name.localeCompare(b.name));
