import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ClipboardCopy, FileText, Save, Sparkles, TriangleAlert } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { generateCoverLetter } from "@/lib/openrouter";
import { downloadCoverLetterPdf } from "@/lib/pdf";
import { useApplications } from "@/hooks/useApplications";
import { useSettings } from "@/hooks/useSettings";
import type { Application } from "@/types/application";

interface Props {
  application: Application;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CoverLetterGenerator({ application, open, onOpenChange }: Props) {
  const { settings } = useSettings();
  const { updateApplication } = useApplications();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const missingContactFields = [
    !settings.name.trim() && "nom",
    !settings.email.trim() && "email",
    !settings.phone.trim() && "téléphone",
  ].filter((v): v is string => !!v);

  const runGeneration = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await generateCoverLetter({
        data: {
          position: application.position,
          company: application.company,
          jobContext: application.notes || undefined,
          cvSummary: settings.cvSummary || undefined,
          applicantName: settings.name || undefined,
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

  // À l'ouverture : reprend la lettre déjà enregistrée sur cette candidature s'il y en a une,
  // sinon génère automatiquement (premier essai). Les essais suivants passent par le bouton
  // "Régénérer" pour ne pas relancer un appel IA (facturé côté OpenRouter) à chaque réouverture.
  useEffect(() => {
    if (!open || text || loading || error) return;
    if (application.coverLetterText) {
      setText(application.coverLetterText);
      return;
    }
    void runGeneration();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSaveToApplication = () => {
    updateApplication(application.id, { coverLetterText: text });
    toast.success("Lettre enregistrée sur la candidature");
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Lettre copiée dans le presse-papiers");
    } catch {
      toast.error("Impossible de copier automatiquement — sélectionnez et copiez le texte.");
    }
  };

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      await downloadCoverLetterPdf(text, application, {
        applicantName: settings.name || undefined,
        email: settings.email || undefined,
        phone: settings.phone || undefined,
        linkedinUrl: settings.linkedinUrl || undefined,
        websiteUrl: settings.websiteUrl || undefined,
      });
    } catch {
      toast.error("Échec de l'export PDF");
    } finally {
      setExporting(false);
    }
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
            <Sparkles className="size-4 text-primary" />
            Lettre de motivation — {application.position}
          </DialogTitle>
          <DialogDescription>
            Générée par IA à partir de votre profil professionnel (Paramètres) et des informations
            de cette candidature. Relisez-la et ajustez-la avant tout envoi.
          </DialogDescription>
        </DialogHeader>

        {missingContactFields.length > 0 ? (
          <p className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2.5 text-sm text-warning-foreground dark:text-warning">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <span>
              L'en-tête de la lettre exportée n'affichera pas votre{" "}
              {missingContactFields.join(", ")} — ces informations sont vides dans{" "}
              <Link to="/parametres" className="underline underline-offset-2">
                Paramètres
              </Link>
              .
            </span>
          </p>
        ) : null}

        {error ? (
          <p className="whitespace-pre-wrap rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Génération en cours…</p>
        ) : text ? (
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={16}
            className="font-mono text-sm"
          />
        ) : null}

        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="outline" onClick={() => void runGeneration()} disabled={loading}>
            <Sparkles className="size-4" /> {text ? "Régénérer" : "Générer"}
          </Button>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleCopy} disabled={!text || loading}>
              <ClipboardCopy className="size-4" /> Copier
            </Button>
            <Button variant="outline" onClick={handleSaveToApplication} disabled={!text || loading}>
              <Save className="size-4" /> Enregistrer sur la candidature
            </Button>
            <Button onClick={handleExportPdf} disabled={!text || loading || exporting}>
              <FileText className="size-4" /> {exporting ? "Génération…" : "Exporter en PDF"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
