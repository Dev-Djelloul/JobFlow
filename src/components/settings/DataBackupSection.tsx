import { useEffect, useRef, useState } from "react";
import { Download, FileSpreadsheet, FileText, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useApplications } from "@/hooks/useApplications";
import { useContacts } from "@/hooks/useContacts";
import { useSettings } from "@/hooks/useSettings";
import { Separator } from "@/components/ui/separator";
import { CsvImportSection } from "./CsvImportSection";
import { formatDate } from "@/lib/format";
import { loadLastExportAt, saveLastExportAt, writeSafetyBackup } from "@/lib/storage";
import {
  buildBackup,
  buildCsv,
  downloadCsv,
  downloadJsonBackup,
  parseBackup,
  type BackupSummary,
} from "@/lib/backup";
import { downloadApplicationsListPdf } from "@/lib/pdf";
import { STATUS_LABELS, type Application } from "@/types/application";
import type { Contact } from "@/types/contact";
import type { EmailTemplate } from "@/types/email";
import { useEmailTemplates } from "@/hooks/useEmailTemplates";

export function DataBackupSection() {
  const { applications, replaceAllApplications } = useApplications();
  const { contacts, replaceAllContacts } = useContacts();
  const { storedTemplates, replaceAllTemplates } = useEmailTemplates();
  const { settings } = useSettings();
  const fileRef = useRef<HTMLInputElement>(null);
  // Lu après hydratation : localStorage n'existe pas côté serveur.
  const [lastExport, setLastExport] = useState<string | null>(null);
  useEffect(() => setLastExport(loadLastExportAt()), []);
  const [pending, setPending] = useState<{
    summary: BackupSummary;
    applications: Application[];
    contacts: Contact[];
    emailTemplates: EmailTemplate[];
  } | null>(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);

  const followUpCount = applications.reduce((n, a) => n + (a.follow_ups?.length ?? 0), 0);

  const handleExportJson = () => {
    try {
      const backup = buildBackup(applications, contacts, settings, storedTemplates);
      downloadJsonBackup(backup);
      saveLastExportAt(backup.exported_at);
      setLastExport(backup.exported_at);
      toast.success("Sauvegarde JSON exportée");
    } catch {
      toast.error("Échec de l'export JSON");
    }
  };

  const handleExportCsv = () => {
    try {
      downloadCsv(buildCsv(applications, (s) => STATUS_LABELS[s]));
      const now = new Date().toISOString();
      saveLastExportAt(now);
      setLastExport(now);
      toast.success("Export CSV téléchargé");
    } catch {
      toast.error("Échec de l'export CSV");
    }
  };

  const [exportingPdf, setExportingPdf] = useState(false);
  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      await downloadApplicationsListPdf(applications);
      const now = new Date().toISOString();
      saveLastExportAt(now);
      setLastExport(now);
      toast.success("Export PDF téléchargé");
    } catch (e) {
      console.error(e);
      toast.error("Échec de l'export PDF");
    } finally {
      setExportingPdf(false);
    }
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const text = await file.text();
      const result = parseBackup(text);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setPending({
        summary: result.summary,
        applications: result.applications,
        contacts: result.contacts,
        emailTemplates: result.emailTemplates,
      });
    } catch {
      toast.error("Impossible de lire le fichier.");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleDeleteAll = () => {
    const count = applications.length;
    writeSafetyBackup();
    replaceAllApplications([]);
    setConfirmDeleteAll(false);
    toast.success(
      `${count} candidature(s) supprimée(s) — une sauvegarde de sécurité a été créée avant suppression.`,
    );
  };

  const confirmImport = () => {
    if (!pending) return;
    const saved = writeSafetyBackup();
    try {
      replaceAllApplications(pending.applications);
      replaceAllContacts(pending.contacts);
      replaceAllTemplates(pending.emailTemplates);
      toast.success(
        `${pending.applications.length} candidature(s) et ${pending.contacts.length} contact(s) importés${saved ? " — sauvegarde de sécurité créée" : ""}`,
      );
    } catch {
      toast.error("Import échoué : vos données actuelles sont conservées.");
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="space-y-4">
      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border p-3">
          <dt className="text-xs text-muted-foreground">Candidatures</dt>
          <dd className="text-lg font-semibold">{applications.length}</dd>
        </div>
        <div className="rounded-lg border p-3">
          <dt className="text-xs text-muted-foreground">Relances</dt>
          <dd className="text-lg font-semibold">{followUpCount}</dd>
        </div>
        <div className="rounded-lg border p-3">
          <dt className="text-xs text-muted-foreground">Contacts</dt>
          <dd className="text-lg font-semibold">{contacts.length}</dd>
        </div>
        <div className="rounded-lg border p-3">
          <dt className="text-xs text-muted-foreground">Dernier export</dt>
          <dd className="text-sm font-medium">{lastExport ? formatDate(lastExport) : "Jamais"}</dd>
        </div>
      </dl>

      <div className="flex flex-wrap gap-2">
        <Button onClick={handleExportJson}>
          <Download /> Exporter mes données (JSON)
        </Button>
        <Button variant="outline" onClick={handleExportCsv}>
          <FileSpreadsheet /> Exporter en CSV
        </Button>
        <Button variant="outline" onClick={handleExportPdf} disabled={exportingPdf}>
          <FileText /> {exportingPdf ? "Génération…" : "Exporter en PDF"}
        </Button>
        <Button variant="outline" onClick={() => fileRef.current?.click()}>
          <Upload /> Importer une sauvegarde
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>

      <Separator />

      <CsvImportSection />

      <Separator />

      <div className="space-y-2 rounded-lg border border-destructive/30 p-4">
        <p className="text-sm font-medium text-destructive">Zone dangereuse</p>
        <p className="text-sm text-muted-foreground">
          Supprime définitivement toutes vos candidatures (et leurs relances associées). Vos
          contacts et modèles d'email ne sont pas concernés. Une sauvegarde de sécurité est créée
          automatiquement avant la suppression.
        </p>
        <Button
          variant="destructive"
          onClick={() => setConfirmDeleteAll(true)}
          disabled={applications.length === 0}
        >
          <Trash2 /> Supprimer toutes les candidatures
        </Button>
      </div>

      <AlertDialog open={pending !== null} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer l'import</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>Cette sauvegarde remplacera vos données actuelles :</p>
                <ul className="list-inside list-disc">
                  <li>{pending?.summary.applications ?? 0} candidature(s)</li>
                  <li>{pending?.summary.contacts ?? 0} contact(s)</li>
                  <li>{pending?.summary.emailTemplates ?? 0} modèle(s) d'email personnalisé(s)</li>
                  <li>{pending?.summary.followUps ?? 0} relance(s)</li>
                  <li>{pending?.summary.statusEntries ?? 0} entrée(s) d'historique</li>
                  <li>
                    Exportée le {pending ? formatDate(pending.summary.exportedAt) : ""} (format v
                    {pending?.summary.version})
                  </li>
                </ul>
                <p>Une sauvegarde de vos données actuelles sera créée automatiquement.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmImport}>Importer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDeleteAll} onOpenChange={setConfirmDeleteAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer toutes les candidatures ?</AlertDialogTitle>
            <AlertDialogDescription>
              {applications.length} candidature(s) et leurs relances seront supprimées
              définitivement. Vos contacts et modèles d'email sont conservés. Une sauvegarde de
              sécurité de vos données actuelles sera créée automatiquement avant la suppression.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAll}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer tout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
