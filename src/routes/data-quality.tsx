import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Merge, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingState } from "@/components/common/LoadingState";
import { ApplicationDetail } from "@/components/applications/ApplicationDetail";
import { ApplicationForm } from "@/components/applications/ApplicationForm";
import { ContactForm } from "@/components/contacts/ContactForm";
import { useApplications } from "@/hooks/useApplications";
import { useContacts } from "@/hooks/useContacts";
import { useApplicationDialogs } from "@/hooks/useApplicationDialogs";
import {
  buildQualityReport,
  ISSUE_SEVERITIES,
  ISSUE_TYPE_LABELS,
  SEVERITY_BADGE,
  SEVERITY_LABELS,
  sourceCoverage,
  type IssueSeverity,
  type QualityIssue,
} from "@/lib/data-quality";
import { applyMerge, planMerge, type CompanyDuplicateSuggestion } from "@/lib/company-merge";
import type { Contact } from "@/types/contact";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/data-quality")({
  head: () => ({
    meta: [
      { title: "Qualité des données — JobFlow" },
      {
        name: "description",
        content:
          "Repérez les candidatures incomplètes, les contacts injoignables et les entreprises en double, puis corrigez-les en un clic.",
      },
      { property: "og:title", content: "Qualité des données — JobFlow" },
      {
        property: "og:description",
        content: "Un centre de contrôle pour fiabiliser votre suivi de candidatures.",
      },
    ],
  }),
  component: DataQualityPage,
});

function DataQualityPage() {
  const { applications, loading, replaceAllApplications } = useApplications();
  const { contacts, replaceAllContacts, updateContact } = useContacts();
  const dialogs = useApplicationDialogs();

  const [severity, setSeverity] = useState<IssueSeverity | "all">("all");
  const [ignored, setIgnored] = useState<string[]>([]);
  const [mergeTarget, setMergeTarget] = useState<CompanyDuplicateSuggestion | null>(null);
  const [mergeName, setMergeName] = useState("");
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  const report = useMemo(
    () => buildQualityReport(applications, contacts, undefined, ignored),
    [applications, contacts, ignored],
  );

  const coverage = sourceCoverage(applications);
  const issues = report.issues.filter((i) => severity === "all" || i.severity === severity);

  const openFix = (issue: QualityIssue) => {
    if (issue.fix.kind === "edit_application") {
      const app = applications.find((a) => a.id === issue.applicationId);
      if (app) dialogs.openEdit(app);
      return;
    }
    if (issue.fix.kind === "edit_contact") {
      const contact = contacts.find((c) => c.id === issue.contactId);
      if (contact) setEditingContact(contact);
      return;
    }
    if (issue.fix.kind === "merge_company") {
      const suggestion = report.duplicates.find((d) => d.id === issue.suggestionId);
      if (suggestion) {
        setMergeTarget(suggestion);
        setMergeName(suggestion.names[0] ?? "");
      }
    }
  };

  const confirmMerge = () => {
    if (!mergeTarget || !mergeName) return;
    const plan = planMerge(mergeTarget, mergeName, applications, contacts);
    const merged = applyMerge(mergeTarget, mergeName, applications, contacts);
    replaceAllApplications(merged.applications);
    replaceAllContacts(merged.contacts);
    toast.success(
      `${plan.applications.length} candidature(s) et ${plan.contacts.length} contact(s) rattachés à « ${mergeName} ».`,
    );
    setMergeTarget(null);
  };

  const plan = mergeTarget ? planMerge(mergeTarget, mergeName, applications, contacts) : null;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Qualité des données</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Anomalies détectées à partir de vos données existantes. Rien n'est corrigé
              automatiquement : chaque action reste à votre main.
            </p>
          </div>
          <Select value={severity} onValueChange={(v) => setSeverity(v as IssueSeverity | "all")}>
            <SelectTrigger className="w-52" aria-label="Filtrer par gravité">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les gravités</SelectItem>
              {ISSUE_SEVERITIES.map((s) => (
                <SelectItem key={s} value={s}>
                  {SEVERITY_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <LoadingState />
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="rounded-xl shadow-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Score de qualité
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold tabular-nums">{report.score}/100</p>
                  <p className="text-xs text-muted-foreground">
                    {report.checked} enregistrement(s) contrôlé(s)
                  </p>
                </CardContent>
              </Card>
              {ISSUE_SEVERITIES.map((s) => (
                <Card key={s} className="rounded-xl shadow-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {SEVERITY_LABELS[s]}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-semibold tabular-nums">{report.counts[s]}</p>
                    <p className="text-xs text-muted-foreground">anomalie(s)</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="rounded-xl shadow-none">
              <CardHeader className="flex flex-row items-center gap-2 space-y-0">
                <ShieldCheck className="size-4 text-muted-foreground" />
                <CardTitle className="text-base">
                  Anomalies ({issues.length})
                  {coverage !== null && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      Source renseignée sur {Math.round(coverage * 100)} % des candidatures
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {issues.length === 0 ? (
                  <EmptyState
                    icon={CheckCircle2}
                    title="Aucune anomalie"
                    description="Vos données sont complètes et cohérentes pour ce filtre."
                  />
                ) : (
                  <ul className="space-y-2">
                    {issues.map((issue) => (
                      <li
                        key={issue.id}
                        className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border p-3"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={cn(
                                "rounded-full border px-2 py-0.5 text-[11px] font-medium",
                                SEVERITY_BADGE[issue.severity],
                              )}
                            >
                              {SEVERITY_LABELS[issue.severity]}
                            </span>
                            <p className="text-sm font-medium">{issue.title}</p>
                            <Badge variant="outline" className="text-[11px]">
                              {ISSUE_TYPE_LABELS[issue.type]}
                            </Badge>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">{issue.description}</p>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          {issue.fix.kind === "merge_company" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setIgnored((prev) => [...prev, issue.id])}
                            >
                              Ignorer
                            </Button>
                          )}
                          {issue.fix.kind !== "none" && (
                            <Button size="sm" variant="outline" onClick={() => openFix(issue)}>
                              {issue.fix.label}
                            </Button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Dialog open={mergeTarget !== null} onOpenChange={(o) => !o && setMergeTarget(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Fusionner des entreprises</DialogTitle>
            <DialogDescription>{mergeTarget?.reason}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label>Libellé à conserver</Label>
              <Select value={mergeName} onValueChange={setMergeName}>
                <SelectTrigger aria-label="Libellé conservé">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {mergeTarget?.names.map((name, i) => (
                    <SelectItem key={name} value={name}>
                      {name} ({mergeTarget.counts[i]} candidature(s))
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-lg border border-border p-3 text-sm">
              <p className="font-medium">Ce que la fusion changera</p>
              <ul className="mt-1 list-inside list-disc text-muted-foreground">
                <li>{plan?.applications.length ?? 0} candidature(s) renommée(s)</li>
                <li>{plan?.contacts.length ?? 0} contact(s) renommé(s)</li>
                <li>Aucune candidature, relance ou contact n'est supprimé</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMergeTarget(null)}>
              Annuler
            </Button>
            <Button onClick={confirmMerge} disabled={!mergeName}>
              <Merge className="size-4" /> Fusionner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ContactForm
        open={editingContact !== null}
        onOpenChange={(o) => !o && setEditingContact(null)}
        contact={editingContact}
        onSubmit={(values) => {
          if (editingContact) {
            updateContact(editingContact.id, values);
            toast.success("Contact mis à jour");
          }
          setEditingContact(null);
        }}
      />

      <ApplicationForm
        open={dialogs.formOpen}
        onOpenChange={dialogs.setFormOpen}
        application={dialogs.editing}
        onSubmit={dialogs.submit}
      />
      <ApplicationDetail
        application={dialogs.selected}
        open={dialogs.detailOpen}
        onOpenChange={dialogs.setDetailOpen}
        onEdit={dialogs.openEdit}
        onDelete={dialogs.remove}
        onStatusChange={dialogs.setStatus}
      />
    </AppLayout>
  );
}
