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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useApplications } from "@/hooks/useApplications";
import { useCv } from "@/hooks/useCv";
import { useSettings } from "@/hooks/useSettings";
import { serializeExperiencesForAi } from "@/lib/cv";
import { generateAtsCv } from "@/lib/openrouter";
import { downloadGeneratedCvPdf } from "@/lib/pdf";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pré-sélectionne cette candidature à l'ouverture (ex. depuis l'espace Documents). */
  applicationId?: string | null;
}

export function AtsCvGenerator({ open, onOpenChange, applicationId = null }: Props) {
  const { settings } = useSettings();
  const { experiences } = useCv();
  const { applications, updateApplication } = useApplications();
  const [sourceApplicationId, setSourceApplicationId] = useState("");
  const [targetPosition, setTargetPosition] = useState("");
  const [targetCompany, setTargetCompany] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const sortedApplications = [...applications].sort((a, b) =>
    (b.application_date || "").localeCompare(a.application_date || ""),
  );

  const missingContactFields = [
    !settings.name.trim() && "nom",
    !settings.linkedinUrl.trim() && "LinkedIn",
    !settings.websiteUrl.trim() && "site web",
  ].filter((v): v is string => !!v);

  const applyApplication = (id: string) => {
    setSourceApplicationId(id);
    const app = applications.find((a) => a.id === id);
    if (!app) return;
    setTargetPosition(app.position);
    setTargetCompany(app.company);
    setJobDescription(app.notes || "");
  };

  // Pré-sélectionne la candidature passée en prop à chaque ouverture (ex. depuis son espace
  // Documents) — l'utilisateur peut toujours en choisir une autre via le menu déroulant.
  useEffect(() => {
    if (open && applicationId) applyApplication(applicationId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, applicationId]);

  const handleAssociate = () => {
    if (!sourceApplicationId) return;
    updateApplication(sourceApplicationId, { atsCvText: text });
    toast.success("CV ATS associé à la candidature");
  };

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
          setSourceApplicationId("");
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

        {missingContactFields.length > 0 ? (
          <p className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2.5 text-sm text-warning-foreground dark:text-warning">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <span>
              L'en-tête du CV exporté n'affichera pas votre {missingContactFields.join(", ")} — ces
              informations sont vides dans{" "}
              <Link to="/parametres" className="underline underline-offset-2">
                Paramètres
              </Link>
              . Renseignez-les puis revenez ici pour un CV complet.
            </span>
          </p>
        ) : null}

        {!text ? (
          <div className="space-y-4">
            {sortedApplications.length > 0 ? (
              <div className="space-y-1.5">
                <Label htmlFor="ats-source-application">Pré-remplir depuis une candidature</Label>
                <Select value={sourceApplicationId} onValueChange={applyApplication}>
                  <SelectTrigger id="ats-source-application">
                    <SelectValue placeholder="Choisir une candidature (facultatif)" />
                  </SelectTrigger>
                  <SelectContent>
                    {sortedApplications.map((app) => (
                      <SelectItem key={app.id} value={app.id}>
                        {app.position} — {app.company}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Reprend le poste, l'entreprise et la description de l'offre enregistrés sur cette
                  candidature (fiable pour les offres ajoutées depuis la recherche).
                </p>
              </div>
            ) : null}
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
              {sourceApplicationId ? (
                <Button variant="outline" onClick={handleAssociate} disabled={loading}>
                  <Save className="size-4" /> Associer à cette candidature
                </Button>
              ) : null}
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
