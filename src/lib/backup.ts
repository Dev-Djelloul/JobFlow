import { z } from "zod";
import type { Application } from "@/types/application";
import type { Contact } from "@/types/contact";
import { CONTRACT_TYPES, FOLLOW_UP_STATUSES, STATUSES } from "@/types/application";

export const BACKUP_FORMAT = "jobflow.backup";
export const BACKUP_VERSION = 2;
/** Versions du format que l'import sait lire. */
export const SUPPORTED_VERSIONS = [1, 2];

const statusSchema = z.enum(STATUSES);
const contractSchema = z.enum(CONTRACT_TYPES);
const followUpStatusSchema = z.enum(FOLLOW_UP_STATUSES);

const dateish = z.string().max(40);

const statusHistorySchema = z.object({
  status: statusSchema,
  date: dateish,
});

const followUpSchema = z.object({
  id: z.string().min(1).max(120),
  date: dateish,
  title: z.string().max(200).default(""),
  description: z.string().max(5000).default(""),
  status: followUpStatusSchema,
  created_at: dateish.default(""),
  updated_at: dateish.default(""),
});

const contactSchema = z.object({
  id: z.string().min(1).max(120),
  first_name: z.string().max(120).default(""),
  last_name: z.string().max(120).default(""),
  email: z.string().max(320).default(""),
  phone: z.string().max(60).default(""),
  job_title: z.string().max(160).default(""),
  linkedin_url: z.string().max(2000).default(""),
  notes: z.string().max(10000).default(""),
  company: z.string().max(200).default(""),
  created_at: dateish.default(""),
  updated_at: dateish.default(""),
});

const applicationSchema = z.object({
  id: z.string().min(1).max(120),
  company: z.string().max(200).default(""),
  position: z.string().max(200).default(""),
  location: z.string().max(200).default(""),
  contract_type: contractSchema.catch("CDI"),
  salary: z.string().max(120).default(""),
  job_url: z.string().max(2000).default(""),
  application_date: dateish.default(""),
  status: statusSchema,
  notes: z.string().max(10000).default(""),
  next_action: z.string().max(500).default(""),
  follow_up_date: dateish.default(""),
  status_history: z.array(statusHistorySchema).default([]),
  follow_ups: z.array(followUpSchema).default([]),
  contact_ids: z.array(z.string().min(1).max(120)).default([]),
  created_at: dateish.default(""),
  updated_at: dateish.default(""),
});

export const backupSchema = z.object({
  format: z.literal(BACKUP_FORMAT),
  version: z.number().int().positive(),
  exported_at: z.string().min(1),
  app: z.string().optional(),
  data: z.object({
    applications: z.array(applicationSchema),
    /** Ajouté en v2 : absent des sauvegardes v1, qui restent importables. */
    contacts: z.array(contactSchema).default([]),
    settings: z
      .object({
        name: z.string().max(200).optional(),
        email: z.string().max(320).optional(),
        theme: z.enum(["light", "dark"]).optional(),
        density: z.enum(["comfortable", "compact"]).optional(),
        defaultView: z.enum(["table", "kanban"]).optional(),
      })
      .optional(),
  }),
});

export type BackupFile = z.infer<typeof backupSchema>;

export interface BackupSummary {
  exportedAt: string;
  version: number;
  applications: number;
  contacts: number;
  followUps: number;
  statusEntries: number;
}

export type ParseResult =
  | {
      ok: true;
      backup: BackupFile;
      applications: Application[];
      contacts: Contact[];
      summary: BackupSummary;
    }
  | { ok: false; error: string };

export function buildBackup(
  applications: Application[],
  contacts: Contact[] = [],
  settings?: BackupFile["data"]["settings"],
): BackupFile {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exported_at: new Date().toISOString(),
    app: "JobFlow",
    data: { applications, contacts, settings },
  };
}

/** Valide et normalise un contenu de fichier JSON de sauvegarde. */
export function parseBackup(raw: string): ParseResult {
  if (!raw || !raw.trim()) return { ok: false, error: "Le fichier est vide." };

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { ok: false, error: "Le fichier n'est pas un JSON valide." };
  }

  if (typeof json !== "object" || json === null || Array.isArray(json)) {
    return { ok: false, error: "Structure invalide : un objet de sauvegarde JobFlow est attendu." };
  }

  const head = json as { format?: unknown; version?: unknown };
  if (head.format !== BACKUP_FORMAT) {
    return { ok: false, error: "Ce fichier n'est pas une sauvegarde JobFlow." };
  }
  if (typeof head.version !== "number" || !SUPPORTED_VERSIONS.includes(head.version)) {
    return {
      ok: false,
      error: `Version de sauvegarde non prise en charge (attendu : ${SUPPORTED_VERSIONS.join(", ")}).`,
    };
  }

  const parsed = backupSchema.safeParse(json);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      error: `Données corrompues${issue ? ` (${issue.path.join(".") || "racine"} : ${issue.message})` : ""}.`,
    };
  }

  const applications = parsed.data.data.applications as Application[];
  const contacts = (parsed.data.data.contacts ?? []) as Contact[];
  const contactIds = new Set(contacts.map((c) => c.id));
  if (contactIds.size !== contacts.length) {
    return { ok: false, error: "Données corrompues : identifiants de contacts en double." };
  }
  // Les associations pointant vers un contact absent sont ignorées (rétrocompatible).
  for (const app of applications) {
    app.contact_ids = (app.contact_ids ?? []).filter((id) => contactIds.has(id));
  }
  const ids = new Set(applications.map((a) => a.id));
  if (ids.size !== applications.length) {
    return { ok: false, error: "Données corrompues : identifiants de candidatures en double." };
  }

  return {
    ok: true,
    backup: parsed.data,
    applications,
    contacts,
    summary: {
      exportedAt: parsed.data.exported_at,
      version: parsed.data.version,
      applications: applications.length,
      contacts: contacts.length,
      followUps: applications.reduce((n, a) => n + (a.follow_ups?.length ?? 0), 0),
      statusEntries: applications.reduce((n, a) => n + (a.status_history?.length ?? 0), 0),
    },
  };
}

function downloadBlob(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const stamp = () => new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");

export function downloadJsonBackup(backup: BackupFile) {
  downloadBlob(JSON.stringify(backup, null, 2), `jobflow-sauvegarde-${stamp()}.json`, "application/json");
}

const CSV_HEADERS = [
  "Entreprise",
  "Poste",
  "Localisation",
  "Type de contrat",
  "Salaire",
  "Date de candidature",
  "Statut",
  "Prochaine action",
  "Date de relance",
];

const escapeCsv = (value: string) => `"${String(value ?? "").replace(/"/g, '""')}"`;

export function buildCsv(applications: Application[], statusLabel: (s: Application["status"]) => string) {
  const rows = applications.map((a) =>
    [
      a.company,
      a.position,
      a.location,
      a.contract_type,
      a.salary,
      a.application_date,
      statusLabel(a.status),
      a.next_action,
      a.follow_up_date,
    ]
      .map((v) => escapeCsv(v ?? ""))
      .join(";"),
  );
  return [CSV_HEADERS.map(escapeCsv).join(";"), ...rows].join("\r\n");
}

export function downloadCsv(csv: string) {
  // BOM UTF-8 pour Excel
  downloadBlob(`\uFEFF${csv}`, `jobflow-candidatures-${stamp()}.csv`, "text/csv;charset=utf-8");
}
