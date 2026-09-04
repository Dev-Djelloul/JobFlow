import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { isValidLinkedInUrl } from "@/lib/contacts";
import type { Contact, ContactInput } from "@/types/contact";

const schema = z.object({
  first_name: z.string().trim().max(80).default(""),
  last_name: z.string().trim().min(1, "Le nom est obligatoire").max(80),
  company: z.string().trim().min(1, "L'entreprise est obligatoire").max(120),
  job_title: z.string().trim().max(120).default(""),
  email: z.string().trim().email("Adresse email invalide").or(z.literal("")).default(""),
  phone: z.string().trim().max(40).default(""),
  linkedin_url: z
    .string()
    .trim()
    .refine((v) => v === "" || isValidLinkedInUrl(v), "URL LinkedIn invalide (https://linkedin.com/…)")
    .default(""),
  notes: z.string().max(2000).default(""),
});

type FormValues = z.input<typeof schema>;

const emptyValues = (company = ""): FormValues => ({
  first_name: "",
  last_name: "",
  company,
  job_title: "",
  email: "",
  phone: "",
  linkedin_url: "",
  notes: "",
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact?: Contact | null;
  /** Entreprise préremplie (création depuis une fiche entreprise). */
  defaultCompany?: string;
  /** Verrouille l'entreprise lorsqu'elle est imposée par le contexte. */
  lockCompany?: boolean;
  onSubmit: (values: ContactInput) => void;
}

export function ContactForm({
  open,
  onOpenChange,
  contact,
  defaultCompany = "",
  lockCompany = false,
  onSubmit,
}: Props) {
  const { register, handleSubmit, reset, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyValues(defaultCompany),
  });

  useEffect(() => {
    if (!open) return;
    reset(
      contact
        ? {
            first_name: contact.first_name,
            last_name: contact.last_name,
            company: contact.company,
            job_title: contact.job_title,
            email: contact.email,
            phone: contact.phone,
            linkedin_url: contact.linkedin_url,
            notes: contact.notes,
          }
        : emptyValues(defaultCompany),
    );
  }, [open, contact, defaultCompany, reset]);

  const errors = formState.errors;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{contact ? "Modifier le contact" : "Nouveau contact"}</DialogTitle>
          <DialogDescription>
            Le nom et l'entreprise sont obligatoires. Les autres champs sont facultatifs.
          </DialogDescription>
        </DialogHeader>

        <form
          noValidate
          className="space-y-4"
          onSubmit={handleSubmit((values) => onSubmit(schema.parse(values) as ContactInput))}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="first_name">Prénom</Label>
              <Input id="first_name" {...register("first_name")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="last_name">Nom *</Label>
              <Input id="last_name" {...register("last_name")} aria-invalid={!!errors.last_name} />
              {errors.last_name ? (
                <p className="text-xs text-destructive">{errors.last_name.message}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="company">Entreprise *</Label>
              <Input
                id="company"
                readOnly={lockCompany}
                {...register("company")}
                aria-invalid={!!errors.company}
              />
              {errors.company ? (
                <p className="text-xs text-destructive">{errors.company.message}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="job_title">Fonction</Label>
              <Input id="job_title" placeholder="RH, Hiring Manager…" {...register("job_title")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} aria-invalid={!!errors.email} />
              {errors.email ? (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Téléphone</Label>
              <Input id="phone" {...register("phone")} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="linkedin_url">Profil LinkedIn</Label>
              <Input
                id="linkedin_url"
                placeholder="https://www.linkedin.com/in/…"
                {...register("linkedin_url")}
                aria-invalid={!!errors.linkedin_url}
              />
              {errors.linkedin_url ? (
                <p className="text-xs text-destructive">{errors.linkedin_url.message}</p>
              ) : null}
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" rows={4} {...register("notes")} />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={formState.isSubmitting}>
              {contact ? "Enregistrer" : "Ajouter le contact"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
