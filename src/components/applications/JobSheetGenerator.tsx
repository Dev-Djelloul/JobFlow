import { useEffect, useState } from "react";
import { BookOpen, Save, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MarkdownLite } from "@/components/common/MarkdownLite";
import { generateJobSheet } from "@/lib/openrouter";
import { useApplications } from "@/hooks/useApplications";
import type { Application } from "@/types/application";

interface Props {
  application: Application;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Fiche métier générée par IA pour la candidature ouverte — définition, compétences requises,
 * conditions d'accès, contexte de travail, mobilité — dans l'esprit d'une fiche ROME France
 * Travail, mais générée à la volée plutôt qu'importée d'un référentiel externe. */
export function JobSheetGenerator({ application, open, onOpenChange }: Props) {
  const { updateApplication } = useApplications();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runGeneration = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await generateJobSheet({
        data: {
          position: application.position,
          company: application.company || undefined,
          jobDescription: application.notes || undefined,
        },
      });
      if (!result.ok || !result.text) {
        setError(result.error ?? "La génération a échoué.");
        return;
      }
      setText(result.text);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inattendue lors de la génération.");
    } finally {
      setLoading(false);
    }
  };

  // À l'ouverture : reprend la fiche déjà enregistrée sur cette candidature s'il y en a une,
  // sinon génère automatiquement (même logique que la lettre de motivation).
  useEffect(() => {
    if (!open || text || loading || error) return;
    if (application.jobSheetText) {
      setText(application.jobSheetText);
      return;
    }
    void runGeneration();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSaveToApplication = () => {
    updateApplication(application.id, { jobSheetText: text });
    toast.success("Fiche métier enregistrée sur la candidature");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) {
          setText("");
          setError(null);
        }
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="size-4 text-primary" />
            Fiche métier — {application.position}
          </DialogTitle>
          <DialogDescription>
            Générée par IA dans l'esprit d'une fiche métier ROME (France Travail) : définition,
            compétences requises, conditions d'accès, contexte de travail, mobilité.
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <p className="whitespace-pre-wrap rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Génération en cours…</p>
        ) : text ? (
          <div className="rounded-lg border bg-muted/30 p-4 text-sm">
            <MarkdownLite text={text} />
          </div>
        ) : null}

        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="outline" onClick={() => void runGeneration()} disabled={loading}>
            <Sparkles className="size-4" /> {text ? "Régénérer" : "Générer"}
          </Button>
          <Button onClick={handleSaveToApplication} disabled={!text || loading}>
            <Save className="size-4" /> Enregistrer sur la candidature
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
