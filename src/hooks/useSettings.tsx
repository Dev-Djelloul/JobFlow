import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { UserSettings } from "@/types/application";
import { defaultSettings, loadSettings, saveSettings } from "@/lib/storage";
import { SettingsContext } from "./settings-context";

export { useSettings } from "./settings-context";

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSettings(loadSettings());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.classList.toggle("dark", settings.theme === "dark");
  }, [settings.theme, hydrated]);

  const updateSettings = useCallback((patch: Partial<UserSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  const value = useMemo(() => ({ settings, updateSettings, hydrated }), [settings, updateSettings, hydrated]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}
