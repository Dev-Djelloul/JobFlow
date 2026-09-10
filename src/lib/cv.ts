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

/** Sérialise les expériences en texte lisible, destiné au contexte d'un prompt IA. */
export function serializeExperiencesForAi(experiences: CvExperience[]): string {
  return sortExperiences(experiences)
    .map((exp) => {
      const meta = [exp.company, exp.location].filter(Boolean).join(" · ");
      const period = experiencePeriodLabel(exp);
      const lines = [`- ${exp.title}${meta ? ` (${meta})` : ""}${period ? ` — ${period}` : ""}`];
      if (exp.description) lines.push(`  ${exp.description.replace(/\n/g, "\n  ")}`);
      return lines.join("\n");
    })
    .join("\n");
}
