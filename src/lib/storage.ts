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

export function saveSettings(settings: UserSettings): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* ignore */
  }
}
