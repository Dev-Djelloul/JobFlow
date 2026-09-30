import type { Application } from "@/types/application";
import type { Contact } from "@/types/contact";
import { companyKey } from "./companies";
import { contactCompanyKey } from "./contacts";
import { findSimilarCompanies, type CompanyDuplicateSuggestion } from "./company-merge";
import { isValidUrl } from "./csv-import";
import { daysBetween, todayKey } from "./format";
import { computeSuccessScore, type SuccessScoreProfile } from "./success-score";

/**
 * Data Quality Center : moteur PUR. Aucune écriture, aucune persistance,
 * aucune donnée inventée — tout est dérivé des candidatures et des contacts.
 */

export const ISSUE_SEVERITIES = ["critical", "major", "minor"] as const;
export type IssueSeverity = (typeof ISSUE_SEVERITIES)[number];

export const SEVERITY_LABELS: Record<IssueSeverity, string> = {
  critical: "Critique",
  major: "Important",
  minor: "Mineur",
};

export const SEVERITY_BADGE: Record<IssueSeverity, string> = {
  critical: "bg-destructive/10 text-destructive border-destructive/25",
  major: "bg-warning/12 text-warning border-warning/30",
  minor: "bg-muted text-muted-foreground border-border",
};

export type IssueType =
  | "missing_company"
  | "missing_position"
  | "missing_date"
  | "missing_source"
  | "missing_next_action"
  | "active_without_follow_up"
  | "missing_contact_link"
  | "contact_without_reach"
  | "duplicate_company"
  | "invalid_url"
  | "inconsistent_data"
  | "low_success_score";

export const ISSUE_TYPE_LABELS: Record<IssueType, string> = {
  missing_company: "Entreprise manquante",
  missing_position: "Poste manquant",
  missing_date: "Date manquante",
  missing_source: "Source manquante",
  missing_next_action: "Aucune prochaine action",
  active_without_follow_up: "Candidature active sans relance",
  missing_contact_link: "Contact non associé",
  contact_without_reach: "Contact injoignable",
  duplicate_company: "Entreprise potentiellement dupliquée",
  invalid_url: "URL invalide",
  inconsistent_data: "Données incohérentes",
  low_success_score: "Chance de succès faible",
};

/** Action corrective proposée par l'interface. */
export type QualityFix =
  | { kind: "edit_application"; label: string }
  | { kind: "edit_contact"; label: string }
  | { kind: "merge_company"; label: string }
  | { kind: "none" };

export interface QualityIssue {
  id: string;
  type: IssueType;
  severity: IssueSeverity;
  title: string;
  description: string;
  applicationId?: string;
  contactId?: string;
  companyKey?: string;
  suggestionId?: string;
  fix: QualityFix;
}

const ACTIVE = new Set(["to_target", "applied", "interview", "test", "offer"]);

export interface QualityReport {
  issues: QualityIssue[];
  duplicates: CompanyDuplicateSuggestion[];
  /** Score global 0–100, pondéré par la sévérité. */
  score: number;
  counts: Record<IssueSeverity, number>;
  checked: number;
}

/** Score en dessous duquel une candidature active est signalée comme anomalie. */
const LOW_SUCCESS_SCORE_THRESHOLD = 50;

export function buildQualityReport(
  applications: Application[],
  contacts: Contact[] = [],
  today = todayKey(),
  ignoredDuplicateIds: string[] = [],
  /** Optionnel : quand fourni, ajoute une anomalie pour les candidatures actives dont la
   * "chance de succès" (voir lib/success-score) est faible — relie qualité des données et
   * indicateur de succès, puisque les facteurs qui pèsent le plus sur ce score (dossier
   * incomplet, pas de suivi, pas de contact) sont eux-mêmes des problèmes de qualité. */
  successProfile?: SuccessScoreProfile,
): QualityReport {
  const issues: QualityIssue[] = [];
  const contactKeys = new Set(contacts.map((c) => contactCompanyKey(c)).filter(Boolean));

  const add = (issue: QualityIssue) => issues.push(issue);

  for (const app of applications) {
    const label = `${app.position || "Poste inconnu"} — ${app.company || "Entreprise inconnue"}`;
    const fix: QualityFix = { kind: "edit_application", label: "Compléter la candidature" };

    if (!app.company?.trim()) {
      add({
        id: `${app.id}-company`,
        type: "missing_company",
        severity: "critical",
        title: "Candidature sans entreprise",
        description: `${label} n'indique aucune entreprise.`,
        applicationId: app.id,
        fix,
      });
    }
    if (!app.position?.trim()) {
      add({
        id: `${app.id}-position`,
        type: "missing_position",
        severity: "critical",
        title: "Candidature sans poste",
        description: `Une candidature chez ${app.company || "une entreprise inconnue"} n'a pas d'intitulé de poste.`,
        applicationId: app.id,
        fix,
      });
    }
    if (!app.application_date) {
      add({
        id: `${app.id}-date`,
        type: "missing_date",
        severity: "critical",
        title: "Candidature sans date",
        description: `${label} n'a pas de date de candidature : les délais et Analytics l'excluent.`,
        applicationId: app.id,
        fix,
      });
    }
    if (!app.source) {
      add({
        id: `${app.id}-source`,
        type: "missing_source",
        severity: "major",
        title: "Source non renseignée",
        description: `${label} n'indique pas d'où vient l'offre : les statistiques par source sont incomplètes.`,
        applicationId: app.id,
        fix: { kind: "edit_application", label: "Renseigner la source" },
      });
    }
    if (ACTIVE.has(app.status) && !app.next_action?.trim()) {
      add({
        id: `${app.id}-next-action`,
        type: "missing_next_action",
        severity: "minor",
        title: "Aucune prochaine action",
        description: `${label} est active mais aucune prochaine action n'est décrite.`,
        applicationId: app.id,
        fix,
      });
    }
    if (
      ACTIVE.has(app.status) &&
      app.status !== "to_target" &&
      (app.follow_ups ?? []).length === 0
    ) {
      add({
        id: `${app.id}-follow-up`,
        type: "active_without_follow_up",
        severity: "major",
        title: "Candidature active sans relance",
        description: `${label} n'a aucune relance enregistrée.`,
        applicationId: app.id,
        fix,
      });
    }
    const key = companyKey(app.company);
    if ((app.contact_ids ?? []).length === 0 && key && contactKeys.has(key)) {
      add({
        id: `${app.id}-contact-link`,
        type: "missing_contact_link",
        severity: "minor",
        title: "Contact existant non associé",
        description: `Un contact existe pour ${app.company} mais n'est pas rattaché à ${label}.`,
        applicationId: app.id,
        companyKey: key,
        fix: { kind: "edit_application", label: "Associer le contact" },
      });
    }
    for (const [field, value, name] of [
      ["job_url", app.job_url, "URL de l'offre"],
      ["source_url", app.source_url ?? "", "URL source"],
    ] as const) {
      if (value && !isValidUrl(value)) {
        add({
          id: `${app.id}-${field}`,
          type: "invalid_url",
          severity: "minor",
          title: `${name} invalide`,
          description: `${label} contient une ${name.toLowerCase()} non exploitable : « ${value} ».`,
          applicationId: app.id,
          fix,
        });
      }
    }

    // Incohérences : dates dans le futur ou relance antérieure à la candidature.
    const inconsistencies: string[] = [];
    if (app.application_date && daysBetween(app.application_date, today) < 0) {
      inconsistencies.push("la date de candidature est dans le futur");
    }
    if (app.follow_up_date && app.application_date && app.follow_up_date < app.application_date) {
      inconsistencies.push("la date de relance précède la candidature");
    }
    if (app.status !== "to_target" && (app.status_history ?? []).length === 0) {
      inconsistencies.push("aucun historique de statut n'est enregistré");
    }
    if (inconsistencies.length > 0) {
      add({
        id: `${app.id}-inconsistent`,
        type: "inconsistent_data",
        severity: "major",
        title: "Données incohérentes",
        description: `${label} : ${inconsistencies.join(", ")}.`,
        applicationId: app.id,
        fix,
      });
    }

    if (successProfile && ACTIVE.has(app.status)) {
      const score = computeSuccessScore(app, successProfile, today);
      if (score.percent !== null && score.percent < LOW_SUCCESS_SCORE_THRESHOLD) {
        const weakest = [...score.factors].sort(
          (a, b) => a.points / (a.maxPoints || 1) - b.points / (b.maxPoints || 1),
        )[0];
        add({
          id: `${app.id}-low-success`,
          type: "low_success_score",
          severity: "major",
          title: "Chance de succès faible",
          description: `${label} n'a que ${score.percent}% de chance de succès estimée${
            weakest ? ` — le point le plus faible : ${weakest.label.toLowerCase()}` : ""
          }.`,
          applicationId: app.id,
          fix,
        });
      }
    }
  }

  for (const contact of contacts) {
    if (!contact.email?.trim() && !contact.phone?.trim()) {
      add({
        id: `${contact.id}-reach`,
        type: "contact_without_reach",
        severity: "major",
        title: "Contact sans email ni téléphone",
        description:
          `${contact.first_name} ${contact.last_name}`.trim() + " n'a aucun moyen de contact.",
        contactId: contact.id,
        fix: { kind: "edit_contact", label: "Compléter le contact" },
      });
    }
  }

  const ignored = new Set(ignoredDuplicateIds);
  const duplicates = findSimilarCompanies(applications).filter((d) => !ignored.has(d.id));
  for (const dup of duplicates) {
    add({
      id: dup.id,
      type: "duplicate_company",
      severity: "major",
      title: "Entreprises potentiellement similaires",
      description: `${dup.names.join(" · ")} désignent probablement la même entreprise.`,
      suggestionId: dup.id,
      fix: { kind: "merge_company", label: "Comparer" },
    });
  }

  const counts: Record<IssueSeverity, number> = {
    critical: issues.filter((i) => i.severity === "critical").length,
    major: issues.filter((i) => i.severity === "major").length,
    minor: issues.filter((i) => i.severity === "minor").length,
  };

  // Score : pénalité pondérée rapportée au nombre d'enregistrements contrôlés.
  const checked = applications.length + contacts.length;
  const penalty = counts.critical * 6 + counts.major * 3 + counts.minor * 1;
  // Barème : un enregistrement « pire cas » pèse 10 points de pénalité.
  const score =
    checked === 0
      ? 100
      : Math.max(0, Math.min(100, Math.round(100 - (penalty / (checked * 10)) * 100)));

  return { issues, duplicates, score, counts, checked };
}

/** Part des candidatures dont la source est renseignée (0–1), null si aucune. */
export function sourceCoverage(applications: Application[]): number | null {
  if (applications.length === 0) return null;
  return applications.filter((a) => !!a.source).length / applications.length;
}

/** Chance de succès moyenne (0-100) sur les candidatures actives, `null` s'il n'y en a aucune. */
export function averageSuccessScore(
  applications: Application[],
  profile: SuccessScoreProfile,
  today = todayKey(),
): number | null {
  const scores = applications
    .filter((a) => ACTIVE.has(a.status))
    .map((a) => computeSuccessScore(a, profile, today).percent)
    .filter((p): p is number => p !== null);
  if (scores.length === 0) return null;
  return Math.round(scores.reduce((sum, p) => sum + p, 0) / scores.length);
}
