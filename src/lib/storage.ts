import type { Application, UserSettings } from "@/types/application";
import type { Contact } from "@/types/contact";
import type { EmailTemplate } from "@/types/email";
import { seedApplications } from "./seed-data";
import { seedContacts } from "./seed-contacts";

const APPS_KEY = "jobflow.applications.v1";
const CONTACTS_KEY = "jobflow.contacts.v1";
const SETTINGS_KEY = "jobflow.settings.v1";
const EMAIL_TEMPLATES_KEY = "jobflow.emailTemplates.v1";

export const defaultSettings: UserSettings = {
  name: "Camille Moreau",
  email: "camille.moreau@example.com",
  theme: "light",
  density: "comfortable",
  defaultView: "table",
  avatar: "",
  avatarPreset: "primary",
  sidebarCollapsed: false,
  cvSummary: "",
};

const isBrowser = () => typeof window !== "undefined";

/** Backward compatible migration: older records have no `follow_ups` array. */
function normalize(apps: Application[]): Application[] {
  return apps.map((a) => ({
    ...a,
    status_history: Array.isArray(a.status_history) ? a.status_history : [],
    follow_ups: Array.isArray(a.follow_ups) ? a.follow_ups : [],
    contact_ids: Array.isArray(a.contact_ids) ? a.contact_ids : [],
  }));
}

/** Migration rétrocompatible : les contacts sont normalisés champ par champ. */
export function normalizeContacts(list: Contact[]): Contact[] {
  return list
    .filter((c) => c && typeof c === "object" && typeof c.id === "string")
    .map((c) => ({
      id: c.id,
      first_name: c.first_name ?? "",
      last_name: c.last_name ?? "",
      email: c.email ?? "",
      phone: c.phone ?? "",
      job_title: c.job_title ?? "",
      linkedin_url: c.linkedin_url ?? "",
      notes: c.notes ?? "",
      company: c.company ?? "",
      created_at: c.created_at ?? "",
      updated_at: c.updated_at ?? "",
    }));
}

export function loadContacts(): Contact[] {
  if (!isBrowser()) return seedContacts;
  try {
    const raw = window.localStorage.getItem(CONTACTS_KEY);
    if (!raw) {
      window.localStorage.setItem(CONTACTS_KEY, JSON.stringify(seedContacts));
      return seedContacts;
    }
    const parsed = JSON.parse(raw) as Contact[];
    return Array.isArray(parsed) ? normalizeContacts(parsed) : seedContacts;
  } catch {
    return seedContacts;
  }
}

export function saveContacts(contacts: Contact[]): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts));
  } catch {
    /* quota or private mode: ignore */
  }
}

/** Modèles d'emails personnalisés uniquement (les modèles système sont recréés au besoin). */
export function loadCustomEmailTemplates(): EmailTemplate[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(EMAIL_TEMPLATES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as EmailTemplate[];
    return Array.isArray(parsed) ? normalizeEmailTemplates(parsed) : [];
  } catch {
    return [];
  }
}

export function normalizeEmailTemplates(list: EmailTemplate[]): EmailTemplate[] {
  return list
    .filter((t) => t && typeof t === "object" && typeof t.id === "string")
    .map((t) => ({
      id: t.id,
      name: t.name ?? "",
      description: t.description ?? "",
      subject: t.subject ?? "",
      body: t.body ?? "",
      variables: Array.isArray(t.variables) ? t.variables : [],
      system: t.system === true,
      created_at: t.created_at ?? "",
      updated_at: t.updated_at ?? "",
    }));
}

export function saveCustomEmailTemplates(templates: EmailTemplate[]): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(EMAIL_TEMPLATES_KEY, JSON.stringify(templates));
  } catch {
    /* ignore */
  }
}

export function loadApplications(): Application[] {
  if (!isBrowser()) return seedApplications;
  try {
    const raw = window.localStorage.getItem(APPS_KEY);
    if (!raw) {
      window.localStorage.setItem(APPS_KEY, JSON.stringify(seedApplications));
      return seedApplications;
    }
    const parsed = JSON.parse(raw) as Application[];
    return Array.isArray(parsed) ? normalize(parsed) : seedApplications;
  } catch {
    return seedApplications;
  }
}

export function saveApplications(apps: Application[]): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(APPS_KEY, JSON.stringify(apps));
  } catch {
    /* quota or private mode: ignore */
  }
}

export function loadSettings(): UserSettings {
  if (!isBrowser()) return defaultSettings;
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaultSettings;
    return { ...defaultSettings, ...(JSON.parse(raw) as Partial<UserSettings>) };
  } catch {
    return defaultSettings;
  }
}

const SAFETY_KEY = "jobflow.applications.backup.v1";
const LAST_EXPORT_KEY = "jobflow.lastExport.v1";

/** Copie de sécurité des données actuelles, écrite avant tout import. */
export function writeSafetyBackup(): boolean {
  if (!isBrowser()) return false;
  try {
    window.localStorage.setItem(
      SAFETY_KEY,
      JSON.stringify({
        saved_at: new Date().toISOString(),
        applications: loadApplications(),
        contacts: loadContacts(),
        email_templates: loadCustomEmailTemplates(),
      }),
    );
    return true;
  } catch {
    return false;
  }
}

export function readSafetyBackup(): {
  saved_at: string;
  applications: Application[];
  contacts?: Contact[];
} | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(SAFETY_KEY);
    return raw
      ? (JSON.parse(raw) as { saved_at: string; applications: Application[]; contacts?: Contact[] })
      : null;
  } catch {
    return null;
  }
}

export function loadLastExportAt(): string | null {
  if (!isBrowser()) return null;
  return window.localStorage.getItem(LAST_EXPORT_KEY);
}

export function saveLastExportAt(value: string): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(LAST_EXPORT_KEY, value);
  } catch {
    /* ignore */
  }
}

export function saveSettings(settings: UserSettings): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* ignore */
  }
}
