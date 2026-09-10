import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Download, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CvFilePreview } from "@/components/cv/CvFilePreview";
import { AtsCvGenerator } from "@/components/cv/AtsCvGenerator";
import { CoverLetterGenerator } from "./CoverLetterGenerator";
import { useApplications } from "@/hooks/useApplications";
import { useCv } from "@/hooks/useCv";
import { useSettings } from "@/hooks/useSettings";
import { downloadCoverLetterPdf, downloadGeneratedCvPdf } from "@/lib/pdf";
import type { Application } from "@/types/application";

export function ApplicationDocumentsSection({ application }: { application: Application }) {
  const { settings } = useSettings();
  const { updateApplication } = useApplications();
  const { cvFile } = useCv();
  const [coverLetterOpen, setCoverLetterOpen] = useState(false);
  const [atsOpen, setAtsOpen] = useState(false);
  const [exportingLetter, setExportingLetter] = useState(false);
  const [exportingAts, setExportingAts] = useState(false);

  const handleExportLetter = async () => {
    if (!application.coverLetterText) return;
    setExportingLetter(true);
    try {
      await downloadCoverLetterPdf(
        application.coverLetterText,
        application,
        settings.name || undefined,
      );
    } catch {
      toast.error("Échec de l'export PDF");
    } finally {
      setExportingLetter(false);
    }
  };

  const handleRemoveLetter = () => {
    updateApplication(application.id, { coverLetterText: "" });
    toast.success("Lettre retirée de la candidature");
  };

  const handleExportAts = async () => {
    if (!application.atsCvText) return;
    setExportingAts(true);
    try {
      await downloadGeneratedCvPdf(application.atsCvText, {
        applicantName: settings.name || undefined,
        targetPosition: application.position,
        email: settings.email || undefined,
        phone: settings.phone || undefined,
        linkedinUrl: settings.linkedinUrl || undefined,
        websiteUrl: settings.websiteUrl || undefined,
      });
    } catch {
      toast.error("Échec de l'export PDF");
    } finally {
      setExportingAts(false);
    }
  };

  const handleRemoveAts = () => {
    updateApplication(application.id, { atsCvText: "" });
    toast.success("CV ATS retiré de la candidature");
  };

  return (
    <div className="space-y-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">Documents</p>

      {/* Lettre de motivation */}
      <div className="space-y-2 rounded-lg border p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium">Lettre de motivation</p>
          <div className="flex flex-wrap gap-1.5">
            <Button size="sm" variant="outline" onClick={() => setCoverLetterOpen(true)}>
              <Sparkles className="size-3.5" />
              {application.coverLetterText ? "Modifier" : "Générer"}
            </Button>
            {application.coverLetterText ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleExportLetter}
                  disabled={exportingLetter}
                >
                  <Download className="size-3.5" /> PDF
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label="Retirer la lettre"
                  onClick={handleRemoveLetter}
                >
                  <Trash2 className="size-3.5 text-destructive" />
                </Button>
              </>
            ) : null}
          </div>
        </div>
        {application.coverLetterText ? (
          <p className="line-clamp-3 whitespace-pre-wrap text-xs text-muted-foreground">
            {application.coverLetterText}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Aucune lettre enregistrée pour cette candidature.
          </p>
        )}
      </div>

      {/* CV */}
      <div className="space-y-3 rounded-lg border p-3">
        <p className="text-sm font-medium">CV</p>

        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">
            CV importé (le même pour toutes vos candidatures)
          </p>
          {cvFile ? (
            <CvFilePreview file={cvFile} height={260} />
          ) : (
            <p className="text-xs text-muted-foreground">
              Aucun CV importé.{" "}
              <Link to="/mon-cv" className="underline underline-offset-2">
                Importez-le depuis Mon CV
              </Link>
              .
            </p>
          )}
        </div>

        <div className="space-y-1.5 border-t pt-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">CV optimisé ATS pour cette offre</p>
            <div className="flex flex-wrap gap-1.5">
              <Button size="sm" variant="outline" onClick={() => setAtsOpen(true)}>
                <Sparkles className="size-3.5" />
                {application.atsCvText ? "Régénérer" : "Générer"}
              </Button>
              {application.atsCvText ? (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleExportAts}
                    disabled={exportingAts}
                  >
                    <Download className="size-3.5" /> PDF
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label="Retirer le CV ATS"
                    onClick={handleRemoveAts}
                  >
                    <Trash2 className="size-3.5 text-destructive" />
                  </Button>
                </>
              ) : null}
            </div>
          </div>
          {application.atsCvText ? (
            <p className="line-clamp-3 whitespace-pre-wrap text-xs text-muted-foreground">
              {application.atsCvText}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Aucun CV ATS associé à cette candidature.
            </p>
          )}
        </div>
      </div>

      <CoverLetterGenerator
        application={application}
        open={coverLetterOpen}
        onOpenChange={setCoverLetterOpen}
      />
      <AtsCvGenerator open={atsOpen} onOpenChange={setAtsOpen} applicationId={application.id} />
    </div>
  );
}
