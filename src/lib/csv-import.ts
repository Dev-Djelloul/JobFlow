import {
  APPLICATION_SOURCES,
  CONTRACT_TYPES,
  REMOTE_MODES,
  SOURCE_LABELS,
  STATUSES,
  STATUS_LABELS,
  REMOTE_LABELS,
  type Application,
  type ApplicationSource,
  type ContractType,
  type ApplicationStatus,
  type RemoteMode,
} from "@/types/application";
import { companyKey } from "./companies";

/**
 * Import CSV 100 % local : le fichier est lu dans le navigateur, aucune donnée
 * n'est transmise. Le moteur est pur — l'UI se contente d'appeler ces fonctions.
 */

/* --------------------------------------------------------------- Parsing */

/** Détecte le séparateur le plus probable sur la première ligne. */
export function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/)[0] ?? "";
  const candidates = [";", ",", "\t", "|"];
  let best = ";";
  let bestCount = -1;
  for (const c of candidates) {
    const count = firstLine.split(c).length - 1;
    if (count > bestCount) {
      best = c;
      bestCount = count;
    }
  }
  return bestCount > 0 ? best : ";";
}

/** Parseur CSV minimal gérant les guillemets doubles et les retours à la ligne. */
export function parseCsv(text: string, delimiter = detectDelimiter(text)): string[][] {
  const clean = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i]!;
    if (quoted) {
      if (char === '"') {
        if (clean[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += char;
      continue;
    }
    if (char === '"') {
      quoted = true;
    } else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

/* ---------------------------------------------------------------- Champs */

export const IMPORT_FIELDS = [
  "company",
  "position",
  "location",
  "contract_type",
  "salary",
  "application_date",
  "status",
  "notes",
  "next_action",
  "follow_up_date",
  "source",
  "source_url",
  "job_url",
  "remote",
  "experience_level",
] as const;

export type ImportField = (typeof IMPORT_FIELDS)[number];

export const FIELD_LABELS: Record<ImportField, string> = {
  company: "Entreprise",
  position: "Poste",
  location: "Localisation",
  contract_type: "Type de contrat",
  salary: "Salaire",
  application_date: "Date de candidature",
  status: "Statut",
  notes: "Notes",
  next_action: "Prochaine action",
  follow_up_date: "Date de relance",
  source: "Source",
  source_url: "URL source",
  job_url: "URL de l'offre",
  remote: "Télétravail",
  experience_level: "Niveau d'expérience",
};

export const IGNORE = "__ignore__";
export type Mapping = (ImportField | typeof IGNORE)[];

const normalizeHeader = (h: string) =>
  h
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const HEADER_HINTS: Record<ImportField, string[]> = {
  company: ["entreprise", "company", "societe", "employeur", "organisation"],
  position: ["poste", "position", "job title", "intitule", "titre", "role"],
  location: ["localisation", "location", "ville", "lieu", "city"],
  contract_type: ["type de contrat", "contrat", "contract", "contract type"],
  salary: ["salaire", "salary", "remuneration"],
  application_date: ["date de candidature", "date", "application date", "date candidature", "postule le"],
  status: ["statut", "status", "etat"],
  notes: ["notes", "note", "commentaire", "comments"],
  next_action: ["prochaine action", "next action", "action"],
  follow_up_date: ["date de relance", "relance", "follow up", "follow up date"],
  source: ["source", "provenance", "canal", "plateforme"],
  source_url: ["url source", "lien source", "source url"],
  job_url: ["url de l offre", "url offre", "lien offre", "job url", "url", "lien"],
  remote: ["teletravail", "remote", "presentiel", "mode de travail"],
  experience_level: ["niveau d experience", "experience", "seniorite", "experience level"],
};

/** Détection automatique des colonnes (exacte puis approchée). */
export function autoMapping(headers: string[]): Mapping {
  const used = new Set<ImportField>();
  return headers.map((header) => {
    const n = normalizeHeader(header);
    if (!n) return IGNORE;
    for (const field of IMPORT_FIELDS) {
      if (used.has(field)) continue;
      const hints = HEADER_HINTS[field];
      if (hints.some((h) => h === n)) {
        used.add(field);
        return field;
      }
    }
    for (const field of IMPORT_FIELDS) {
      if (used.has(field)) continue;
      const hints = HEADER_HINTS[field];
      if (hints.some((h) => n.includes(h) || h.includes(n))) {
        used.add(field);
        return field;
      }
    }
    return IGNORE;
  });
}

/* ------------------------------------------------------------ Conversion */

const norm = (v: string) =>
  (v ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

export function parseStatus(value: string): ApplicationStatus | null {
  const n = norm(value);
  if (!n) return null;
  const direct = STATUSES.find((s) => s === n);
  if (direct) return direct;
  const byLabel = STATUSES.find((s) => norm(STATUS_LABELS[s]) === n);
  if (byLabel) return byLabel;
  if (n.includes("cibler") || n.includes("target")) return "to_target";
  if (n.includes("envoy") || n.includes("applied") || n.includes("postul")) return "applied";
  if (n.includes("entretien") || n.includes("interview")) return "interview";
  if (n.includes("test")) return "test";
  if (n.includes("offre") || n.includes("offer")) return "offer";
  if (n.includes("refus") || n.includes("reject")) return "rejected";
  return null;
}

export function parseContract(value: string): ContractType | null {
  const n = norm(value);
  if (!n) return null;
  return CONTRACT_TYPES.find((c) => norm(c) === n) ?? null;
}

export function parseSource(value: string): ApplicationSource | null {
  const n = norm(value);
  if (!n) return null;
  const direct = APPLICATION_SOURCES.find((s) => s === n.replace(/\s+/g, "_"));
  if (direct) return direct;
  const byLabel = APPLICATION_SOURCES.find((s) => norm(SOURCE_LABELS[s]) === n);
  if (byLabel) return byLabel;
  if (n.includes("linkedin")) return "linkedin";
  if (n.includes("indeed")) return "indeed";
  if (n.includes("jungle") || n === "wttj") return "welcome_to_the_jungle";
  if (n.includes("france travail") || n.includes("pole emploi")) return "france_travail";
  if (n.includes("site")) return "company_website";
  if (n.includes("coopt") || n.includes("referral")) return "referral";
  if (n.includes("recruteur") || n.includes("cabinet") || n.includes("recruiter")) return "recruiter";
  if (n.includes("spontan")) return "spontaneous";
  return null;
}

export function parseRemote(value: string): RemoteMode | null {
  const n = norm(value);
  if (!n) return null;
  const direct = REMOTE_MODES.find((m) => m === n);
  if (direct) return direct;
  const byLabel = REMOTE_MODES.find((m) => norm(REMOTE_LABELS[m]) === n);
  if (byLabel) return byLabel;
  if (n.includes("site") || n.includes("presentiel") || n.includes("onsite")) return "onsite";
  if (n.includes("hybri")) return "hybrid";
  if (n.includes("remote") || n.includes("teletravail") || n.includes("distance")) return "remote";
  return null;
}

/** Normalise une date en yyyy-mm-dd (accepte aussi jj/mm/aaaa). */
export function parseDate(value: string): string | null {
  const v = (value ?? "").trim();
  if (!v) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const fr = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(v);
  if (fr) return `${fr[3]}-${fr[2]!.padStart(2, "0")}-${fr[1]!.padStart(2, "0")}`;
  return null;
}

export const isValidUrl = (value: string) => {
  const v = (value ?? "").trim();
  if (!v) return true;
  try {
    const url = new URL(v);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

/* -------------------------------------------------------------- Analyse */

export type DuplicateStrategy = "skip" | "create" | "update";

export interface PreparedRow {
  index: number;
  /** Valeurs normalisées, prêtes à devenir une candidature. */
  values: Partial<Application>;
  errors: string[];
  warnings: string[];
  duplicateOfId: string | null;
  duplicateLabel: string | null;
}

/** Clé de doublon : entreprise normalisée + intitulé de poste normalisé. */
export const duplicateKey = (company: string, position: string) =>
  `${companyKey(company)}::${norm(position).replace(/\s+/g, " ")}`;

export function prepareRows(
  rows: string[][],
  mapping: Mapping,
  existing: Application[],
): PreparedRow[] {
  const existingByKey = new Map<string, Application>();
  for (const app of existing) {
    existingByKey.set(duplicateKey(app.company, app.position), app);
  }

  return rows.map((cells, index) => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const get = (field: ImportField) => {
      const col = mapping.indexOf(field);
      return col >= 0 ? (cells[col] ?? "").trim() : "";
    };

    const company = get("company");
    const position = get("position");
    if (!company) errors.push("Entreprise manquante");
    if (!position) errors.push("Poste manquant");

    const values: Partial<Application> = {
      company,
      position,
      location: get("location"),
      salary: get("salary"),
      notes: get("notes"),
      next_action: get("next_action"),
    };

    const rawDate = get("application_date");
    const date = parseDate(rawDate);
    if (rawDate && !date) errors.push("Date de candidature invalide");
    values.application_date = date ?? "";
    if (!values.application_date) warnings.push("Aucune date de candidature");

    const rawFollowUp = get("follow_up_date");
    const followUp = parseDate(rawFollowUp);
    if (rawFollowUp && !followUp) warnings.push("Date de relance ignorée (format invalide)");
    values.follow_up_date = followUp ?? "";

    const rawStatus = get("status");
    const status = parseStatus(rawStatus);
    if (rawStatus && !status) warnings.push(`Statut « ${rawStatus} » non reconnu — « À cibler » utilisé`);
    values.status = status ?? "to_target";

    const rawContract = get("contract_type");
    const contract = parseContract(rawContract);
    if (rawContract && !contract) warnings.push(`Contrat « ${rawContract} » non reconnu — CDI utilisé`);
    values.contract_type = contract ?? "CDI";

    const rawSource = get("source");
    const source = parseSource(rawSource);
    if (rawSource && !source) warnings.push(`Source « ${rawSource} » non reconnue — ignorée`);
    if (source) values.source = source;

    const rawRemote = get("remote");
    const remote = parseRemote(rawRemote);
    if (rawRemote && !remote) warnings.push(`Télétravail « ${rawRemote} » non reconnu — ignoré`);
    if (remote) values.remote = remote;

    const experience = get("experience_level");
    if (experience) values.experience_level = experience;

    const jobUrl = get("job_url");
    if (jobUrl && !isValidUrl(jobUrl)) warnings.push("URL de l'offre invalide — ignorée");
    values.job_url = jobUrl && isValidUrl(jobUrl) ? jobUrl : "";

    const sourceUrl = get("source_url");
    if (sourceUrl && !isValidUrl(sourceUrl)) warnings.push("URL source invalide — ignorée");
    if (sourceUrl && isValidUrl(sourceUrl)) values.source_url = sourceUrl;

    const dup = company && position ? existingByKey.get(duplicateKey(company, position)) : undefined;

    return {
      index,
      values,
      errors,
      warnings,
      duplicateOfId: dup?.id ?? null,
      duplicateLabel: dup ? `${dup.position} — ${dup.company}` : null,
    };
  });
}

export interface ImportReport {
  created: number;
  updated: number;
  skipped: number;
  errors: number;
}

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `app-${Date.now()}-${Math.random().toString(16).slice(2)}`;

/**
 * Applique l'import. Retourne une nouvelle liste : aucune donnée existante
 * n'est écrasée sans stratégie explicite « update ».
 */
export function applyImport(
  existing: Application[],
  rows: PreparedRow[],
  strategy: DuplicateStrategy,
): { applications: Application[]; report: ImportReport } {
  const report: ImportReport = { created: 0, updated: 0, skipped: 0, errors: 0 };
  const now = new Date().toISOString();
  let result = [...existing];

  for (const row of rows) {
    if (row.errors.length > 0) {
      report.errors++;
      continue;
    }
    const base = row.values;

    if (row.duplicateOfId && strategy === "skip") {
      report.skipped++;
      continue;
    }

    if (row.duplicateOfId && strategy === "update") {
      result = result.map((app) => {
        if (app.id !== row.duplicateOfId) return app;
        // Fusion non destructive : une valeur vide du CSV ne supprime rien.
        const patch: Partial<Application> = {};
        for (const [key, value] of Object.entries(base) as [keyof Application, unknown][]) {
          if (value === "" || value === undefined || value === null) continue;
          (patch as Record<string, unknown>)[key] = value;
        }
        const statusChanged = patch.status && patch.status !== app.status;
        return {
          ...app,
          ...patch,
          status_history: statusChanged
            ? [...(app.status_history ?? []), { status: patch.status!, date: (patch.application_date || now.slice(0, 10)) as string }]
            : (app.status_history ?? []),
          updated_at: now,
        };
      });
      report.updated++;
      continue;
    }

    const status = base.status ?? "to_target";
    const app: Application = {
      id: newId(),
      company: base.company ?? "",
      position: base.position ?? "",
      location: base.location ?? "",
      contract_type: base.contract_type ?? "CDI",
      salary: base.salary ?? "",
      job_url: base.job_url ?? "",
      application_date: base.application_date ?? "",
      status,
      notes: base.notes ?? "",
      next_action: base.next_action ?? "",
      follow_up_date: base.follow_up_date ?? "",
      status_history: base.application_date ? [{ status, date: base.application_date }] : [],
      follow_ups: [],
      contact_ids: [],
      created_at: now,
      updated_at: now,
      ...(base.source ? { source: base.source } : {}),
      ...(base.source_url ? { source_url: base.source_url } : {}),
      ...(base.remote ? { remote: base.remote } : {}),
      ...(base.experience_level ? { experience_level: base.experience_level } : {}),
    };
    result = [app, ...result];
    report.created++;
  }

  return { applications: result, report };
}
