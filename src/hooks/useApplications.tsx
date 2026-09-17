import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type {
  Application,
  ApplicationInput,
  ApplicationStatus,
  FollowUpInput,
} from "@/types/application";
import { defaultActionForStatus } from "@/lib/actions";
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
      // Sans prochaine action saisie à la main, on en suggère une par défaut selon le statut
      // choisi — sinon rien n'apparaît dans la page Actions avant la première relance manuelle.
      const suggested = input.next_action ? null : defaultActionForStatus(input.status);
      const app: Application = {
        ...input,
        next_action: suggested ? suggested.title : input.next_action,
        follow_up_date: suggested ? suggested.date : input.follow_up_date,
        id: newId(),
        status_history: [{ status: input.status, date: now.slice(0, 10) }],
        follow_ups: [],
        contact_ids: [],
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
          const today = new Date().toISOString().slice(0, 10);
          const lastEntry = a.status_history[a.status_history.length - 1];
          // Plusieurs changements de statut le même jour (essais, corrections) remplacent la
          // dernière entrée au lieu de s'empiler — l'historique reste lisible, une entrée par
          // jour où le statut a réellement bougé.
          const sameDayAsLast = lastEntry?.date === today;
          // Un changement de statut sans prochaine action explicitement fournie dans le même
          // appel suggère automatiquement la suite logique — sinon seule une saisie manuelle
          // dans "Prochaine action" faisait apparaître quoi que ce soit dans la page Actions.
          const suggested =
            statusChanged && !("next_action" in input)
              ? defaultActionForStatus(input.status!, today)
              : null;
          return {
            ...a,
            ...input,
            next_action: suggested ? suggested.title : (input.next_action ?? a.next_action),
            follow_up_date: suggested ? suggested.date : (input.follow_up_date ?? a.follow_up_date),
            status_history: statusChanged
              ? sameDayAsLast
                ? [...a.status_history.slice(0, -1), { status: input.status!, date: today }]
                : [...a.status_history, { status: input.status!, date: today }]
              : a.status_history,
            updated_at: new Date().toISOString(),
          };
        }),
      );
    },
    [applications, persist],
  );

  const removeStatusHistoryEntry = useCallback(
    (id: string, index: number) => {
      persist(
        applications.map((a) =>
          a.id === id
            ? { ...a, status_history: a.status_history.filter((_, i) => i !== index) }
            : a,
        ),
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

  const toggleFavorite = useCallback(
    (id: string) => {
      const app = applications.find((a) => a.id === id);
      if (!app) return;
      updateApplication(id, { favorite: !app.favorite });
    },
    [applications, updateApplication],
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

  const setApplicationContacts = useCallback(
    (id: string, contactIds: string[]) => {
      persist(
        applications.map((a) =>
          a.id === id
            ? { ...a, contact_ids: [...new Set(contactIds)], updated_at: new Date().toISOString() }
            : a,
        ),
      );
    },
    [applications, persist],
  );

  const replaceAllApplications = useCallback((apps: Application[]) => persist(apps), [persist]);

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
      toggleFavorite,
      removeStatusHistoryEntry,
      addFollowUp,
      updateFollowUp,
      deleteFollowUp,
      getApplication,
      setApplicationContacts,
      resetDemoData,
      replaceAllApplications,
    }),
    [
      applications,
      loading,
      createApplication,
      updateApplication,
      deleteApplication,
      changeStatus,
      toggleFavorite,
      removeStatusHistoryEntry,
      addFollowUp,
      updateFollowUp,
      deleteFollowUp,
      getApplication,
      setApplicationContacts,
      resetDemoData,
      replaceAllApplications,
    ],
  );

  return <ApplicationsContext.Provider value={value}>{children}</ApplicationsContext.Provider>;
}
