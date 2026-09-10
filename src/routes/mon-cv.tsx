import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Briefcase, Building2, Download, MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingState } from "@/components/common/LoadingState";
import { CvExperienceForm } from "@/components/cv/CvExperienceForm";
import { useCv } from "@/hooks/useCv";
import { useSettings } from "@/hooks/useSettings";
import { experiencePeriodLabel, sortExperiences } from "@/lib/cv";
import { downloadCvPdf } from "@/lib/pdf";
import type { CvExperience } from "@/types/cv";

export const Route = createFileRoute("/mon-cv")({
  head: () => ({
    meta: [
      { title: "Mon CV — JobFlow" },
      {
        name: "description",
        content: "Renseignez vos expériences professionnelles et exportez votre CV en PDF.",
      },
      { property: "og:title", content: "Mon CV — JobFlow" },
      {
        property: "og:description",
        content:
          "Votre CV structuré : expériences professionnelles, disponible et exportable en PDF.",
      },
    ],
  }),
  component: CvPage,
});

function CvPage() {
  const { experiences, loading, createExperience, updateExperience, deleteExperience } = useCv();
  const { settings } = useSettings();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CvExperience | null>(null);
  const [toDelete, setToDelete] = useState<CvExperience | null>(null);
  const [exporting, setExporting] = useState(false);

  const sorted = sortExperiences(experiences);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (exp: CvExperience) => {
    setEditing(exp);
    setFormOpen(true);
  };

  const handleSubmit = (values: Parameters<typeof createExperience>[0]) => {
    if (editing) {
      updateExperience(editing.id, values);
      toast.success("Expérience mise à jour");
    } else {
      createExperience(values);
      toast.success("Expérience ajoutée");
    }
    setFormOpen(false);
  };

  const confirmDelete = () => {
    if (!toDelete) return;
    deleteExperience(toDelete.id);
    toast.success("Expérience supprimée");
    setToDelete(null);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadCvPdf(experiences, {
        applicantName: settings.name,
        email: settings.email,
        cvSummary: settings.cvSummary,
      });
      toast.success("CV exporté en PDF");
    } catch {
      toast.error("L'export du CV a échoué");
    } finally {
      setExporting(false);
    }
  };

  return (
    <AppLayout
      title="Mon CV"
      description="Vos expériences professionnelles, prêtes à être exportées en PDF."
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport} disabled={exporting}>
            <Download className="size-4" />
            <span className="hidden sm:inline">Exporter en PDF</span>
          </Button>
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            <span className="hidden sm:inline">Ajouter une expérience</span>
          </Button>
        </div>
      }
    >
      {loading ? (
        <LoadingState rows={4} />
      ) : (
        <div className="space-y-4">
          <Card className="rounded-xl shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Résumé du profil</CardTitle>
              <CardDescription>
                {settings.cvSummary
                  ? "Ce résumé libre sert aussi de contexte à la génération de lettres de motivation par IA."
                  : "Aucun résumé pour l'instant."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {settings.cvSummary ? (
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {settings.cvSummary}
                </p>
              ) : null}
              <Button asChild variant="link" className="h-auto p-0 text-sm">
                <Link to="/parametres">
                  {settings.cvSummary ? "Modifier le résumé" : "Rédiger mon résumé"} dans Paramètres
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-xl shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Expérience professionnelle</CardTitle>
              <CardDescription>
                {experiences.length} expérience{experiences.length > 1 ? "s" : ""} enregistrée
                {experiences.length > 1 ? "s" : ""}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sorted.length === 0 ? (
                <EmptyState
                  title="Aucune expérience enregistrée"
                  description="Ajoutez vos expériences professionnelles pour construire votre CV."
                  action={
                    <Button onClick={openCreate}>
                      <Plus className="size-4" /> Ajouter une expérience
                    </Button>
                  }
                />
              ) : (
                <ul className="space-y-3">
                  {sorted.map((exp) => (
                    <li key={exp.id} className="rounded-lg border p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium">{exp.title}</p>
                          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                              <Building2 className="size-3.5" />
                              {exp.company}
                            </span>
                            {exp.location ? (
                              <span className="flex items-center gap-1.5">
                                <MapPin className="size-3.5" />
                                {exp.location}
                              </span>
                            ) : null}
                            <span className="flex items-center gap-1.5">
                              <Briefcase className="size-3.5" />
                              {experiencePeriodLabel(exp)}
                            </span>
                          </p>
                          {exp.description ? (
                            <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                              {exp.description}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Modifier"
                            onClick={() => openEdit(exp)}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Supprimer"
                            onClick={() => setToDelete(exp)}
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <CvExperienceForm
        open={formOpen}
        onOpenChange={setFormOpen}
        experience={editing}
        onSubmit={handleSubmit}
      />

      <AlertDialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette expérience ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. L'expérience « {toDelete?.title} » sera définitivement
              supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
