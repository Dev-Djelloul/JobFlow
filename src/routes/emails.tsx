import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Mail, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
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
import { LoadingState } from "@/components/common/LoadingState";
import { EmailComposer } from "@/components/email/EmailComposer";
import { TemplateForm } from "@/components/email/TemplateForm";
import { useEmailTemplates } from "@/hooks/useEmailTemplates";
import type { EmailTemplate } from "@/types/email";

export const Route = createFileRoute("/emails")({
  head: () => ({
    meta: [
      { title: "Email Center — JobFlow" },
      {
        name: "description",
        content:
          "Préparez vos emails de relance et de prise de contact à partir de modèles personnalisables, en local.",
      },
      { property: "og:title", content: "Email Center — JobFlow" },
      {
        property: "og:description",
        content: "Modèles d'emails, variables dynamiques, copie et ouverture du client mail.",
      },
    ],
  }),
  component: EmailsPage,
});

function EmailsPage() {
  const { templates, loading, createTemplate, updateTemplate, deleteTemplate, resetTemplate } =
    useEmailTemplates();
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerTemplate, setComposerTemplate] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<EmailTemplate | null>(null);
  const [pendingDelete, setPendingDelete] = useState<EmailTemplate | null>(null);

  const system = templates.filter((t) => t.system);
  const custom = templates.filter((t) => !t.system);

  const card = (t: EmailTemplate) => (
    <Card key={t.id} className="rounded-xl shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t.name}</CardTitle>
        <CardDescription>{t.description || "—"}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Objet</p>
          <p className="text-sm font-medium break-words">{t.subject}</p>
        </div>
        <p className="line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">{t.body}</p>
        {t.variables.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {t.variables.map((v) => (
              <span
                key={v}
                className="rounded-md border bg-muted/50 px-1.5 py-0.5 font-mono text-[11px]"
              >{`{{${v}}}`}</span>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={() => {
              setComposerTemplate(t.id);
              setComposerOpen(true);
            }}
          >
            <Mail className="size-4" /> Utiliser
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setEditing(t);
              setFormOpen(true);
            }}
          >
            <Pencil className="size-4" /> Modifier
          </Button>
          {t.system ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                resetTemplate(t.id);
                toast.success("Modèle système réinitialisé");
              }}
            >
              <RotateCcw className="size-4" /> Réinitialiser
            </Button>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => setPendingDelete(t)}
            >
              <Trash2 className="size-4" /> Supprimer
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <AppLayout
      title="Email Center"
      description="Préparez vos emails à partir de modèles — rien n'est envoyé automatiquement."
      actions={
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">Nouveau modèle</span>
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setComposerTemplate(null);
              setComposerOpen(true);
            }}
          >
            <Mail className="size-4" />
            <span className="hidden sm:inline">Écrire un email</span>
          </Button>
        </div>
      }
    >
      {loading ? (
        <LoadingState rows={3} />
      ) : (
        <div className="space-y-6">
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Modèles système
            </h2>
            <div className="grid gap-4 lg:grid-cols-2">{system.map(card)}</div>
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Mes modèles
            </h2>
            {custom.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun modèle personnalisé pour le moment.
              </p>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">{custom.map(card)}</div>
            )}
          </section>
        </div>
      )}

      <EmailComposer
        open={composerOpen}
        onOpenChange={setComposerOpen}
        templateId={composerTemplate}
      />

      <TemplateForm
        open={formOpen}
        onOpenChange={setFormOpen}
        template={editing}
        onSubmit={(input) => {
          if (editing) {
            updateTemplate(editing.id, input);
            toast.success("Modèle mis à jour");
          } else {
            createTemplate(input);
            toast.success("Modèle créé");
          }
          setFormOpen(false);
          setEditing(null);
        }}
      />

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce modèle ?</AlertDialogTitle>
            <AlertDialogDescription>
              « {pendingDelete?.name} » sera définitivement supprimé. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingDelete) deleteTemplate(pendingDelete.id);
                setPendingDelete(null);
                toast.success("Modèle supprimé");
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
