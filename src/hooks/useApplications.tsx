import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Application, ApplicationInput, ApplicationStatus } from "@/types/application";
import { loadApplications, saveApplications } from "@/lib/storage";

interface ApplicationsContextValue {
  applications: Application[];
  loading: boolean;
  createApplication: (input: ApplicationInput) => Application;
  updateApplication: (id: string, input: Partial<ApplicationInput>) => void;
  deleteApplication: (id: string) => void;
  changeStatus: (id: string, status: ApplicationStatus) => void;
  getApplication: (id: string) => Application | undefined;
  resetDemoData: () => void;
}

const ApplicationsContext = createContext<ApplicationsContextValue | null>(null);

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `app-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export function ApplicationsProvider({ children }: { children: ReactNode }) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setApplications(loadApplications());
      setLoading(false);
    }, 250);
    return () => window.clearTimeout(timer);
  }, []);

  const persist = useCallback((next: Application[]) => {
    setApplications(next);
    saveApplications(next);
  }, []);

  const createApplication = useCallback(
    (input: ApplicationInput) => {
      const now = new Date().toISOString();
      const app: Application = {
        ...input,
        id: newId(),
        status_history: [{ status: input.status, date: now.slice(0, 10) }],
        created_at: now,
        updated_at: now,
      };
      persist([app, ...applications]);
      return app;
    },
    [applications, persist],
  );

  const updateApplication = useCallback(
    (id: string, input: Partial<ApplicationInput>) => {
      persist(
        applications.map((a) => {
          if (a.id !== id) return a;
          const statusChanged = input.status && input.status !== a.status;
          return {
            ...a,
            ...input,
            status_history: statusChanged
              ? [...a.status_history, { status: input.status!, date: new Date().toISOString().slice(0, 10) }]
              : a.status_history,
            updated_at: new Date().toISOString(),
          };
        }),
      );
    },
    [applications, persist],
  );

  const deleteApplication = useCallback(
    (id: string) => persist(applications.filter((a) => a.id !== id)),
    [applications, persist],
  );

  const changeStatus = useCallback(
    (id: string, status: ApplicationStatus) => updateApplication(id, { status }),
    [updateApplication],
  );

  const getApplication = useCallback(
    (id: string) => applications.find((a) => a.id === id),
    [applications],
  );

  const resetDemoData = useCallback(() => {
    if (typeof window !== "undefined") window.localStorage.removeItem("jobflow.applications.v1");
    setApplications(loadApplications());
  }, []);

  const value = useMemo(
    () => ({
      applications,
      loading,
      createApplication,
      updateApplication,
      deleteApplication,
      changeStatus,
      getApplication,
      resetDemoData,
    }),
    [applications, loading, createApplication, updateApplication, deleteApplication, changeStatus, getApplication, resetDemoData],
  );

  return <ApplicationsContext.Provider value={value}>{children}</ApplicationsContext.Provider>;
}

export function useApplications() {
  const ctx = useContext(ApplicationsContext);
  if (!ctx) throw new Error("useApplications must be used within ApplicationsProvider");
  return ctx;
}
