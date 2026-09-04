import type { Application, FollowUp } from "@/types/application";

/**
 * Clé de regroupement d'une entreprise : trim, espaces internes compactés,
 * casse et accents normalisés. Aucun rapprochement approximatif (pas de fuzzy),
 * donc "OpenAI", "openai" et " OpenAI " sont regroupés, mais pas "OpenAI France".
 */
export function companyKey(name: string): string {
  return (name ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export interface CompanyFollowUp {
  followUp: FollowUp;
  application: Application;
}

export interface Company {
  key: string;
  /** Libellé affiché : orthographe de la candidature la plus récente. */
  name: string;
  applications: Application[];
  followUps: CompanyFollowUp[];
  total: number;
  interviews: number;
  offers: number;
  rejected: number;
  /** Date ISO (yyyy-mm-dd) la plus récente parmi candidatures / historique / relances. */
  lastActivity: string;
  /** Prochaine relance « à faire », la plus proche. */
  nextFollowUp: CompanyFollowUp | null;
}

const maxDate = (...values: (string | undefined)[]) =>
  values.filter(Boolean).sort((a, b) => (a! < b! ? 1 : -1))[0] ?? "";

/** Dérive la liste des entreprises à partir des candidatures (pas de source de vérité séparée). */
export function buildCompanies(applications: Application[]): Company[] {
  const map = new Map<string, Application[]>();
  for (const app of applications) {
    const key = companyKey(app.company);
    if (!key) continue;
    const list = map.get(key);
    if (list) list.push(app);
    else map.set(key, [app]);
  }

  const today = new Date().toISOString().slice(0, 10);

  return [...map.entries()]
    .map(([key, apps]) => {
      const sorted = [...apps].sort((a, b) =>
        (b.application_date || "").localeCompare(a.application_date || ""),
      );
      const followUps: CompanyFollowUp[] = sorted
        .flatMap((application) =>
          (application.follow_ups ?? []).map((followUp) => ({ followUp, application })),
        )
        .sort((a, b) => (a.followUp.date || "").localeCompare(b.followUp.date || ""));

      const lastActivity = sorted.reduce(
        (acc, a) =>
          maxDate(
            acc,
            a.application_date,
            ...(a.status_history ?? []).map((h) => h.date),
            ...(a.follow_ups ?? []).filter((f) => f.status === "done").map((f) => f.date),
          ),
        "",
      );

      const pending = followUps.filter((f) => f.followUp.status === "todo");

      return {
        key,
        name: (sorted[0]?.company ?? "").trim() || key,
        applications: sorted,
        followUps,
        total: sorted.length,
        interviews: sorted.filter((a) => a.status === "interview" || a.status === "test").length,
        offers: sorted.filter((a) => a.status === "offer").length,
        rejected: sorted.filter((a) => a.status === "rejected").length,
        lastActivity,
        nextFollowUp:
          pending.find((f) => (f.followUp.date || "") >= today) ?? pending[0] ?? null,
      } satisfies Company;
    })
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

export function findCompany(applications: Application[], key: string): Company | undefined {
  return buildCompanies(applications).find((c) => c.key === key);
}

export function isOverdue(followUp: FollowUp): boolean {
  return followUp.status === "todo" && (followUp.date || "") < new Date().toISOString().slice(0, 10);
}

/** Taux de conversion, `null` lorsque l'échantillon est insuffisant. */
export function conversionRates(company: Company) {
  return {
    toInterview: company.total > 0 ? Math.round((company.interviews / company.total) * 100) : null,
    toOffer:
      company.interviews > 0 ? Math.round((company.offers / company.interviews) * 100) : null,
  };
}
