import type { CvExperience } from "@/types/cv";

/** Formate une date "YYYY-MM" (input type=month) en libellé lisible, ex. "mai 2024". */
export function formatMonthLabel(value: string): string {
  if (!value) return "";
  const [y, m] = value.split("-").map(Number);
  if (!y || !m) return value;
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

export function experiencePeriodLabel(
  exp: Pick<CvExperience, "startDate" | "endDate" | "current">,
): string {
  const start = formatMonthLabel(exp.startDate);
  const end = exp.current ? "Aujourd'hui" : formatMonthLabel(exp.endDate);
  if (!start && !end) return "";
  return [start, end].filter(Boolean).join(" — ");
}

/** Trie les expériences par date de début décroissante (les plus récentes en premier). */
export function sortExperiences(experiences: CvExperience[]): CvExperience[] {
  return [...experiences].sort((a, b) => {
    if (a.current !== b.current) return a.current ? -1 : 1;
    return (b.startDate || "").localeCompare(a.startDate || "");
  });
}
