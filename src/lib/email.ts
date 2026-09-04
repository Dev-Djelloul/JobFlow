import type { Application } from "@/types/application";
import { STATUS_LABELS } from "@/types/application";
import type { Contact } from "@/types/contact";
import {
  EMAIL_VARIABLES,
  type EmailVariable,
  type EmailVariableValues,
} from "@/types/email";
import { formatDate } from "./format";

const VAR_RE = /\{\{\s*([a-z_]+)\s*\}\}/gi;

const isKnown = (name: string): name is EmailVariable =>
  (EMAIL_VARIABLES as readonly string[]).includes(name);

/** Variables réellement présentes dans un texte (ordre d'apparition, sans doublon). */
export function extractVariables(text: string): EmailVariable[] {
  const found: EmailVariable[] = [];
  for (const match of text.matchAll(VAR_RE)) {
    const name = match[1].toLowerCase();
    if (isKnown(name) && !found.includes(name)) found.push(name);
  }
  return found;
}

const clean = (value: string | undefined) => (value ?? "").trim();

/**
 * Remplace les variables par leur valeur. Une variable sans valeur est retirée
 * proprement (jamais « undefined » ni de placeholder technique) : la phrase est
 * nettoyée de ses espaces et ponctuations en double.
 */
export function renderTemplate(text: string, values: EmailVariableValues): string {
  const replaced = text.replace(VAR_RE, (_m, raw: string) => {
    const name = raw.toLowerCase();
    return isKnown(name) ? clean(values[name]) : "";
  });
  return replaced
    .split("\n")
    .map((line) =>
      line
        .replace(/[ \t]{2,}/g, " ")
        .replace(/\s+([,.;:!?])/g, "$1")
        .replace(/([,;:])\s*([,.;:])/g, "$2")
        .replace(/\s+$/g, ""),
    )
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");
}

/** Variables utilisées par le modèle mais sans valeur disponible. */
export function missingVariables(text: string, values: EmailVariableValues): EmailVariable[] {
  return extractVariables(text).filter((v) => !clean(values[v]));
}

/** Valeurs dérivées d'une candidature et/ou d'un contact. */
export function buildVariableValues(options: {
  application?: Application | null;
  contact?: Contact | null;
}): EmailVariableValues {
  const { application, contact } = options;
  return {
    first_name: clean(contact?.first_name),
    last_name: clean(contact?.last_name),
    company: clean(application?.company) || clean(contact?.company),
    position: clean(application?.position),
    application_date: application?.application_date ? formatDate(application.application_date) : "",
    status: application ? STATUS_LABELS[application.status] : "",
    job_title: clean(contact?.job_title),
  };
}

/** Texte complet prêt à être copié (objet + corps). */
export function formatForClipboard(subject: string, body: string): string {
  return `Objet : ${subject.trim()}\n\n${body.trim()}\n`;
}

export function buildMailtoUrl(to: string, subject: string, body: string): string {
  const params = new URLSearchParams();
  if (subject.trim()) params.set("subject", subject.trim());
  if (body.trim()) params.set("body", body.trim());
  const query = params.toString().replace(/\+/g, "%20");
  return `mailto:${encodeURIComponent(to.trim())}${query ? `?${query}` : ""}`;
}

/** Modèle système pertinent selon le contexte (statut de candidature / relance). */
export function suggestTemplateId(options: {
  application?: Application | null;
  followUpTitle?: string;
}): string {
  const title = (options.followUpTitle ?? "").toLowerCase();
  if (title.includes("entretien")) return "sys-relance-entretien";
  if (title.includes("merci")) return "sys-remerciement-entretien";
  const status = options.application?.status;
  if (status === "interview" || status === "test") return "sys-relance-entretien";
  if (status === "applied") return "sys-relance-candidature";
  if (status === "to_target") return "sys-prise-de-contact";
  return "sys-relance-candidature";
}

/** Insère une variable dans un texte à la position du curseur. */
export function insertAt(text: string, position: number, insertion: string) {
  const at = Math.max(0, Math.min(position, text.length));
  return {
    value: `${text.slice(0, at)}${insertion}${text.slice(at)}`,
    cursor: at + insertion.length,
  };
}
