import type { Application, UserSettings } from "@/types/application";
import { seedApplications } from "./seed-data";

const APPS_KEY = "jobflow.applications.v1";
const SETTINGS_KEY = "jobflow.settings.v1";

export const defaultSettings: UserSettings = {
  name: "Camille Moreau",
  email: "camille.moreau@example.com",
  theme: "light",
  density: "comfortable",
  defaultView: "table",
};

const isBrowser = () => typeof window !== "undefined";

/** Backward compatible migration: older records have no `follow_ups` array. */
function normalize(apps: Application[]): Application[] {
  return apps.map((a) => ({
    ...a,
    status_history: Array.isArray(a.status_history) ? a.status_history : [],
    follow_ups: Array.isArray(a.follow_ups) ? a.follow_ups : [],
  }));
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
      JSON.stringify({ saved_at: new Date().toISOString(), applications: loadApplications() }),
    );
    return true;
  } catch {
    return false;
  }
}

export function readSafetyBackup(): { saved_at: string; applications: Application[] } | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(SAFETY_KEY);
    return raw ? (JSON.parse(raw) as { saved_at: string; applications: Application[] }) : null;
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
