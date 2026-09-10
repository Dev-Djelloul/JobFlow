import { useState } from "react";
import { ClipboardCopy, FileText, Sparkles } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCv } from "@/hooks/useCv";
import { useSettings } from "@/hooks/useSettings";
import { serializeExperiencesForAi } from "@/lib/cv";
import { generateAtsCv } from "@/lib/openrouter";
import { downloadGeneratedCvPdf } from "@/lib/pdf";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AtsCvGenerator({ open, onOpenChange }: Props) {
  const { settings } = useSettings();
  const { experiences } = useCv();
  const [targetPosition, setTargetPosition] = useState("");
  const [targetCompany, setTargetCompany] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const runGeneration = async () => {
    if (!targetPosition.trim()) {
      setError("Indiquez au moins l'intitulé du poste visé.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await generateAtsCv({
        data: {
          applicantName: settings.name || undefined,
          cvSummary: settings.cvSummary || undefined,
          experiencesText: serializeExperiencesForAi(experiences) || undefined,
          cvImportedText: settings.cvImportedText || undefined,
          targetPosition: targetPosition.trim(),
          targetCompany: targetCompany.trim() || undefined,
          jobDescription: jobDescription.trim() || undefined,
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

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("CV copié dans le presse-papiers");
    } catch {
      toast.error("Impossible de copier automatiquement — sélectionnez et copiez le texte.");
    }
  };

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      await downloadGeneratedCvPdf(text, {
        applicantName: settings.name || undefined,
        targetPosition,
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
            CV optimisé ATS
          </DialogTitle>
          <DialogDescription>
            Combine votre résumé, vos expériences et votre CV importé pour générer un CV réécrit et
            aligné sur le vocabulaire de l'offre visée. Relisez-le avant tout envoi — l'IA ne doit
            rien inventer, mais une vérification reste indispensable.
          </DialogDescription>
        </DialogHeader>

        {!text ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="ats-position">Poste visé *</Label>
                <Input
                  id="ats-position"
                  value={targetPosition}
                  onChange={(e) => setTargetPosition(e.target.value)}
                  placeholder="Chef de projet digital"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ats-company">Entreprise</Label>
                <Input
                  id="ats-company"
                  value={targetCompany}
                  onChange={(e) => setTargetCompany(e.target.value)}
                  placeholder="Facultatif"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ats-description">Description de l'offre</Label>
              <Textarea
                id="ats-description"
                rows={8}
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Collez ici le texte de l'offre visée — l'IA alignera le vocabulaire du CV dessus pour l'ATS."
              />
            </div>
          </div>
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
            rows={18}
            className="font-mono text-sm"
          />
        ) : null}

        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="outline" onClick={() => void runGeneration()} disabled={loading}>
            <Sparkles className="size-4" /> {text ? "Régénérer" : "Générer"}
          </Button>
          {text ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={handleCopy} disabled={loading}>
                <ClipboardCopy className="size-4" /> Copier
              </Button>
              <Button onClick={handleExportPdf} disabled={loading || exporting}>
                <FileText className="size-4" /> {exporting ? "Génération…" : "Exporter en PDF"}
              </Button>
            </div>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
