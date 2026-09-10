import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ClipboardCopy, Mail, Paperclip } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { VariablePicker } from "./VariablePicker";
import { useApplications } from "@/hooks/useApplications";
import { useContacts } from "@/hooks/useContacts";
import { useCv } from "@/hooks/useCv";
import { useEmailTemplates } from "@/hooks/useEmailTemplates";
import { useSettings } from "@/hooks/useSettings";
import { companyKey } from "@/lib/companies";
import { contactFullName, contactsForCompany } from "@/lib/contacts";
import { downloadDataUrl } from "@/lib/files";
import {
  buildMailtoUrl,
  buildVariableValues,
  formatForClipboard,
  missingVariables,
  renderTemplate,
  insertAt,
} from "@/lib/email";
import { downloadCoverLetterPdf, downloadGeneratedCvPdf } from "@/lib/pdf";
import { cn } from "@/lib/utils";
import { EMAIL_VARIABLE_LABELS, type EmailVariable } from "@/types/email";

const NONE = "__none__";

const STEPS = ["Modèle", "Destinataire", "Personnaliser", "Aperçu"] as const;

export interface EmailComposerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicationId?: string | null;
  contactId?: string | null;
  templateId?: string | null;
}

export function EmailComposer({
  open,
  onOpenChange,
  applicationId = null,
  contactId = null,
  templateId = null,
}: EmailComposerProps) {
  const { applications } = useApplications();
  const { contacts } = useContacts();
  const { templates } = useEmailTemplates();
  const { settings } = useSettings();
  const { cvFile } = useCv();

  const [step, setStep] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [selectedApp, setSelectedApp] = useState<string>(NONE);
  const [selectedContact, setSelectedContact] = useState<string>(NONE);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [to, setTo] = useState("");
  const [edited, setEdited] = useState(false);
  const [attachLetter, setAttachLetter] = useState(false);
  const [attachCv, setAttachCv] = useState(false);
  const [preparingAttachments, setPreparingAttachments] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);
  const lastFocused = useRef<"subject" | "body">("body");

  // Réinitialisation à chaque ouverture avec le contexte fourni.
  useEffect(() => {
    if (!open) return;
    setStep(0);
    setEdited(false);
    setSelectedApp(applicationId ?? NONE);
    setSelectedContact(contactId ?? NONE);
    setSelectedTemplate(templateId ?? templates[0]?.id ?? "");
    setAttachLetter(false);
    setAttachCv(false);
  }, [open, applicationId, contactId, templateId, templates]);

  const application = applications.find((a) => a.id === selectedApp) ?? null;
  const contact = contacts.find((c) => c.id === selectedContact) ?? null;
  const template = templates.find((t) => t.id === selectedTemplate) ?? null;

  const hasLetter = !!application?.coverLetterText;
  const hasAtsCv = !!application?.atsCvText;
  const hasCv = hasAtsCv || !!cvFile;
  const cvAttachmentLabel = hasAtsCv ? "CV optimisé ATS (cette candidature)" : "CV importé";

  const availableContacts = useMemo(() => {
    if (application) {
      const key = companyKey(application.company);
      const sameCompany = contactsForCompany(contacts, key);
      const linked = (application.contact_ids ?? [])
        .map((id) => contacts.find((c) => c.id === id))
        .filter((c): c is NonNullable<typeof c> => !!c);
      return Array.from(new Map([...linked, ...sameCompany].map((c) => [c.id, c])).values());
    }
    return contacts;
  }, [application, contacts]);

  const availableApplications = useMemo(() => {
    if (contact) {
      const key = companyKey(contact.company);
      return applications.filter((a) => companyKey(a.company) === key);
    }
    return applications;
  }, [contact, applications]);

  const values = useMemo(
    () => buildVariableValues({ application, contact }),
    [application, contact],
  );

  // Tant que l'utilisateur n'a pas édité, le contenu suit le modèle et le contexte.
  useEffect(() => {
    if (!open || edited || !template) return;
    setSubject(template.subject);
    setBody(template.body);
  }, [open, edited, template]);

  useEffect(() => {
    if (!open) return;
    setTo(contact?.email?.trim() ?? "");
  }, [open, contact]);

  const renderedSubject = renderTemplate(subject, values);
  const renderedBody = renderTemplate(body, values);
  const missing = Array.from(
    new Set([...missingVariables(subject, values), ...missingVariables(body, values)]),
  );

  const insertVariable = (variable: EmailVariable) => {
    const token = `{{${variable}}}`;
    setEdited(true);
    if (lastFocused.current === "subject") {
      const el = subjectRef.current;
      const pos = el?.selectionStart ?? subject.length;
      const next = insertAt(subject, pos, token);
      setSubject(next.value);
      requestAnimationFrame(() => el?.setSelectionRange(next.cursor, next.cursor));
      return;
    }
    const el = bodyRef.current;
    const pos = el?.selectionStart ?? body.length;
    const next = insertAt(body, pos, token);
    setBody(next.value);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(next.cursor, next.cursor);
    });
  };

  const handleCopy = async () => {
    const text = formatForClipboard(renderedSubject, renderedBody);
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Email copié dans le presse-papiers");
    } catch {
      toast.error("Copie impossible : sélectionnez le texte manuellement.");
    }
  };

  const handleMailto = () => {
    if (!to.trim()) {
      toast.error("Renseignez un destinataire avant d'ouvrir votre client email.");
      return;
    }
    try {
      window.location.href = buildMailtoUrl(to, renderedSubject, renderedBody);
    } catch {
      toast.error("Impossible d'ouvrir le client email.");
    }
  };

  // Un lien mailto: ne peut techniquement pas joindre de fichier (limitation des navigateurs,
  // pas de l'application) : on télécharge donc les pièces sélectionnées puis on ouvre le client
  // mail, à charge pour l'utilisateur de les glisser dans le brouillon qui s'ouvre.
  const handleMailtoWithAttachments = async () => {
    if (!to.trim()) {
      toast.error("Renseignez un destinataire avant d'ouvrir votre client email.");
      return;
    }
    if (!attachLetter && !attachCv) {
      handleMailto();
      return;
    }
    setPreparingAttachments(true);
    try {
      if (attachLetter && application?.coverLetterText) {
        await downloadCoverLetterPdf(
          application.coverLetterText,
          application,
          settings.name || undefined,
        );
      }
      if (attachCv) {
        if (hasAtsCv && application?.atsCvText) {
          await downloadGeneratedCvPdf(application.atsCvText, {
            applicantName: settings.name || undefined,
            targetPosition: application.position,
            email: settings.email || undefined,
            phone: settings.phone || undefined,
            linkedinUrl: settings.linkedinUrl || undefined,
            websiteUrl: settings.websiteUrl || undefined,
          });
        } else if (cvFile) {
          downloadDataUrl(cvFile.dataUrl, cvFile.fileName);
        }
      }
      toast.info("Pièce(s) téléchargée(s) — glissez-les dans le brouillon qui s'ouvre.");
      handleMailto();
    } catch {
      toast.error("Échec de la préparation des pièces jointes.");
    } finally {
      setPreparingAttachments(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Préparer un email</DialogTitle>
          <DialogDescription>
            Aucun email n'est envoyé : le contenu est copié ou ouvert dans votre client habituel.
          </DialogDescription>
        </DialogHeader>

        <ol className="flex flex-wrap gap-2 text-xs">
          {STEPS.map((label, i) => (
            <li key={label}>
              <button
                type="button"
                onClick={() => setStep(i)}
                className={cn(
                  "rounded-full border px-2.5 py-1 font-medium transition-colors",
                  i === step
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {i + 1}. {label}
              </button>
            </li>
          ))}
        </ol>

        <Separator />

        {step === 0 && (
          <div className="space-y-2">
            {templates.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setSelectedTemplate(t.id);
                  setEdited(false);
                  setStep(1);
                }}
                className={cn(
                  "w-full rounded-lg border p-3 text-left transition-colors hover:bg-accent/50",
                  t.id === selectedTemplate && "border-primary bg-primary/5",
                )}
              >
                <p className="text-sm font-medium">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.description}</p>
              </button>
            ))}
          </div>
        )}

        {step === 1 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Candidature</Label>
              <Select value={selectedApp} onValueChange={setSelectedApp}>
                <SelectTrigger>
                  <SelectValue placeholder="Aucune" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Aucune candidature</SelectItem>
                  {availableApplications.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.position} — {a.company}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Contact destinataire</Label>
              <Select value={selectedContact} onValueChange={setSelectedContact}>
                <SelectTrigger>
                  <SelectValue placeholder="Aucun" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Aucun contact</SelectItem>
                  {availableContacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {contactFullName(c) || c.email || "Contact"}
                      {c.job_title ? ` — ${c.job_title}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {availableContacts.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Aucun contact disponible pour ce contexte.
                </p>
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="email-to">Destinataire</Label>
              <Input
                id="email-to"
                value={to}
                placeholder="prenom.nom@entreprise.com"
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email-subject">Objet</Label>
              <Input
                id="email-subject"
                ref={subjectRef}
                value={subject}
                onFocus={() => (lastFocused.current = "subject")}
                onChange={(e) => {
                  setEdited(true);
                  setSubject(e.target.value);
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email-body">Contenu</Label>
              <Textarea
                id="email-body"
                ref={bodyRef}
                rows={12}
                value={body}
                onFocus={() => (lastFocused.current = "body")}
                onChange={(e) => {
                  setEdited(true);
                  setBody(e.target.value);
                }}
              />
            </div>
            <VariablePicker onInsert={insertVariable} values={values} />
            {missing.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Sans valeur pour l'instant :{" "}
                {missing.map((v) => EMAIL_VARIABLE_LABELS[v]).join(", ")}. Ces variables seront
                retirées du texte final.
              </p>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <div className="rounded-lg border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">À</p>
              <p className="text-sm font-medium">{to || "—"}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Objet</p>
              <p className="text-sm font-medium">{renderedSubject || "—"}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Message</p>
              <p className="mt-1 whitespace-pre-wrap text-sm">{renderedBody || "—"}</p>
            </div>

            {hasLetter || hasCv ? (
              <div className="space-y-2 rounded-lg border p-3">
                <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
                  <Paperclip className="size-3.5" /> Pièces jointes
                </p>
                <p className="text-xs text-muted-foreground">
                  Un mailto: ne peut pas joindre de fichier automatiquement — les pièces cochées
                  sont téléchargées, à vous de les glisser dans le brouillon qui s'ouvre.
                </p>
                {hasLetter ? (
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={attachLetter}
                      onCheckedChange={(v) => setAttachLetter(v === true)}
                    />
                    Lettre de motivation
                  </label>
                ) : null}
                {hasCv ? (
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={attachCv} onCheckedChange={(v) => setAttachCv(v === true)} />
                    {cvAttachmentLabel}
                  </label>
                ) : null}
              </div>
            ) : null}
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={step === 0}
              onClick={() => setStep((s) => Math.max(0, s - 1))}
            >
              Précédent
            </Button>
            {step < 3 && <Button onClick={() => setStep((s) => s + 1)}>Suivant</Button>}
          </div>
          {step === 3 && (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={handleCopy}>
                <ClipboardCopy className="size-4" /> Copier
              </Button>
              <Button
                onClick={() => void handleMailtoWithAttachments()}
                disabled={preparingAttachments}
              >
                <Mail className="size-4" />
                {preparingAttachments
                  ? "Préparation…"
                  : attachLetter || attachCv
                    ? "Télécharger les pièces et ouvrir mon client mail"
                    : "Ouvrir dans mon client mail"}
              </Button>
            </div>
          )}
          {step < 3 && (
            <Button variant="ghost" onClick={() => setStep(3)}>
              <Check className="size-4" /> Aperçu
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
