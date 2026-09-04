import { useEffect, useRef, useState } from "react";
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
import { VariablePicker } from "./VariablePicker";
import { insertAt } from "@/lib/email";
import type { EmailTemplate, EmailTemplateInput, EmailVariable } from "@/types/email";

export function TemplateForm({
  open,
  onOpenChange,
  template,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: EmailTemplate | null;
  onSubmit: (input: EmailTemplateInput) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);
  const lastFocused = useRef<"subject" | "body">("body");

  useEffect(() => {
    if (!open) return;
    setName(template?.name ?? "");
    setDescription(template?.description ?? "");
    setSubject(template?.subject ?? "");
    setBody(template?.body ?? "");
  }, [open, template]);

  const insertVariable = (variable: EmailVariable) => {
    const token = `{{${variable}}}`;
    if (lastFocused.current === "subject") {
      const el = subjectRef.current;
      const next = insertAt(subject, el?.selectionStart ?? subject.length, token);
      setSubject(next.value);
      return;
    }
    const el = bodyRef.current;
    const next = insertAt(body, el?.selectionStart ?? body.length, token);
    setBody(next.value);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(next.cursor, next.cursor);
    });
  };

  const submit = () => {
    if (!name.trim()) {
      toast.error("Le nom du modèle est obligatoire.");
      return;
    }
    if (!subject.trim() || !body.trim()) {
      toast.error("L'objet et le contenu sont obligatoires.");
      return;
    }
    onSubmit({
      name: name.trim().slice(0, 120),
      description: description.trim().slice(0, 300),
      subject: subject.slice(0, 300),
      body: body.slice(0, 10000),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{template ? "Modifier le modèle" : "Nouveau modèle"}</DialogTitle>
          <DialogDescription>
            Utilisez les variables pour personnaliser automatiquement vos emails.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="tpl-name">Nom</Label>
              <Input id="tpl-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tpl-desc">Description</Label>
              <Input
                id="tpl-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tpl-subject">Objet</Label>
            <Input
              id="tpl-subject"
              ref={subjectRef}
              value={subject}
              onFocus={() => (lastFocused.current = "subject")}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tpl-body">Contenu</Label>
            <Textarea
              id="tpl-body"
              ref={bodyRef}
              rows={12}
              value={body}
              onFocus={() => (lastFocused.current = "body")}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>
          <VariablePicker onInsert={insertVariable} />
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={submit}>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
