import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type {
  Application,
  ApplicationInput,
  ApplicationStatus,
  FollowUpInput,
} from "@/types/application";
import { loadApplications, saveApplications } from "@/lib/storage";
import { ApplicationsContext, useApplications } from "./applications-context";

export { useApplications };

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
        follow_ups: [],
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

  const mutateFollowUps = useCallback(
    (applicationId: string, fn: (list: Application["follow_ups"]) => Application["follow_ups"]) => {
      persist(
        applications.map((a) =>
          a.id === applicationId
            ? { ...a, follow_ups: fn(a.follow_ups ?? []), updated_at: new Date().toISOString() }
            : a,
        ),
      );
    },
    [applications, persist],
  );

  const addFollowUp = useCallback(
    (applicationId: string, input: FollowUpInput) => {
      const now = new Date().toISOString();
      mutateFollowUps(applicationId, (list) => [
        ...list,
        { ...input, id: newId(), created_at: now, updated_at: now },
      ]);
    },
    [mutateFollowUps],
  );

  const updateFollowUp = useCallback(
    (applicationId: string, followUpId: string, input: Partial<FollowUpInput>) => {
      mutateFollowUps(applicationId, (list) =>
        list.map((f) =>
          f.id === followUpId ? { ...f, ...input, updated_at: new Date().toISOString() } : f,
        ),
      );
    },
    [mutateFollowUps],
  );

  const deleteFollowUp = useCallback(
    (applicationId: string, followUpId: string) =>
      mutateFollowUps(applicationId, (list) => list.filter((f) => f.id !== followUpId)),
    [mutateFollowUps],
  );

  const getApplication = useCallback(
    (id: string) => applications.find((a) => a.id === id),
    [applications],
  );

  const replaceAllApplications = useCallback(
    (apps: Application[]) => persist(apps),
    [persist],
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
      addFollowUp,
      updateFollowUp,
      deleteFollowUp,
      getApplication,
      resetDemoData,
    }),
    [applications, loading, createApplication, updateApplication, deleteApplication, changeStatus, addFollowUp, updateFollowUp, deleteFollowUp, getApplication, resetDemoData],
  );

  return <ApplicationsContext.Provider value={value}>{children}</ApplicationsContext.Provider>;
}
