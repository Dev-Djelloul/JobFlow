import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useApplications } from "./useApplications";
import type { Application, ApplicationInput, ApplicationStatus } from "@/types/application";

/** Shared create / edit / detail / delete wiring used by the pages. */
export function useApplicationDialogs() {
  const {
    createApplication,
    updateApplication,
    deleteApplication,
    changeStatus,
    toggleFavorite,
    applications,
  } = useApplications();
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editing, setEditing] = useState<Application | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = applications.find((a) => a.id === selectedId) ?? null;

  const openCreate = useCallback(() => {
    setEditing(null);
    setFormOpen(true);
  }, []);

  const openDetail = useCallback((app: Application) => {
    setSelectedId(app.id);
    setDetailOpen(true);
  }, []);

  const openEdit = useCallback((app: Application) => {
    setEditing(app);
    setDetailOpen(false);
    setFormOpen(true);
  }, []);

  const submit = useCallback(
    (values: ApplicationInput) => {
      try {
        if (editing) {
          updateApplication(editing.id, values);
          toast.success("Candidature mise à jour");
        } else {
          createApplication(values);
          toast.success("Candidature ajoutée");
        }
        setFormOpen(false);
        setEditing(null);
      } catch {
        toast.error("Une erreur est survenue, réessayez.");
      }
    },
    [editing, createApplication, updateApplication],
  );

  const remove = useCallback(
    (id: string) => {
      deleteApplication(id);
      setDetailOpen(false);
      setSelectedId(null);
      toast.success("Candidature supprimée");
    },
    [deleteApplication],
  );

  const setStatus = useCallback(
    (id: string, status: ApplicationStatus) => {
      changeStatus(id, status);
      toast.success("Statut mis à jour");
    },
    [changeStatus],
  );

  return {
    formOpen,
    setFormOpen,
    detailOpen,
    setDetailOpen,
    editing,
    selected,
    openCreate,
    openDetail,
    openEdit,
    submit,
    remove,
    setStatus,
    toggleFavorite,
  };
}
