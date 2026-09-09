import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ApplicationForm } from "@/components/applications/ApplicationForm";
import { useApplications } from "@/hooks/useApplications";

const isTypingTarget = (el: EventTarget | null) => {
  const tag = (el as HTMLElement)?.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    (el as HTMLElement)?.isContentEditable
  );
};

/**
 * Raccourci global "N" pour ajouter une candidature depuis n'importe quelle page,
 * sans dépendre d'un formulaire déjà monté localement sur la route courante.
 */
export function QuickAddApplication() {
  const [open, setOpen] = useState(false);
  const { createApplication } = useApplications();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "n" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      e.preventDefault();
      setOpen(true);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <ApplicationForm
      open={open}
      onOpenChange={setOpen}
      onSubmit={(values) => {
        createApplication(values);
        setOpen(false);
        toast.success("Candidature ajoutée");
      }}
    />
  );
}
