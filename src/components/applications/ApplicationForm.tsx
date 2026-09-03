import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CONTRACT_TYPES,
  STATUSES,
  STATUS_LABELS,
  type Application,
  type ApplicationInput,
} from "@/types/application";

const schema = z.object({
  company: z.string().trim().min(1, "L'entreprise est obligatoire").max(80),
  position: z.string().trim().min(1, "L'intitulé du poste est obligatoire").max(120),
  location: z.string().trim().max(80).default(""),
  contract_type: z.enum(CONTRACT_TYPES),
  salary: z.string().trim().max(40).default(""),
  job_url: z.string().trim().url("URL invalide").or(z.literal("")).default(""),
  application_date: z.string().min(1, "La date est obligatoire"),
  status: z.enum(STATUSES),
  notes: z.string().max(2000).default(""),
  next_action: z.string().trim().max(160).default(""),
  follow_up_date: z.string().default(""),
});

type FormValues = z.input<typeof schema>;

const emptyValues = (): FormValues => ({
  company: "",
  position: "",
  location: "",
  contract_type: "CDI",
  salary: "",
  job_url: "",
  application_date: new Date().toISOString().slice(0, 10),
  status: "to_target",
  notes: "",
  next_action: "",
  follow_up_date: "",
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  application?: Application | null;
  onSubmit: (values: ApplicationInput) => void;
}

export function ApplicationForm({ open, onOpenChange, application, onSubmit }: Props) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyValues(),
  });
  const { register, handleSubmit, reset, setValue, watch, formState } = form;

  useEffect(() => {
    if (!open) return;
    reset(
      application
        ? {
            company: application.company,
            position: application.position,
            location: application.location,
            contract_type: application.contract_type,
            salary: application.salary,
            job_url: application.job_url,
            application_date: application.application_date,
            status: application.status,
            notes: application.notes,
            next_action: application.next_action,
            follow_up_date: application.follow_up_date,
          }
        : emptyValues(),
    );
  }, [open, application, reset]);

  const errors = formState.errors;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{application ? "Modifier la candidature" : "Ajouter une candidature"}</DialogTitle>
          <DialogDescription>
            Les champs entreprise, poste et date de candidature sont obligatoires.
          </DialogDescription>
        </DialogHeader>

        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={handleSubmit((values) => {
            onSubmit(schema.parse(values) as ApplicationInput);
          })}
        >
          <div className="grid gap-1.5">
            <Label htmlFor="company">Entreprise *</Label>
            <Input id="company" {...register("company")} placeholder="Doctolib" />
            {errors.company && <p className="text-xs text-destructive">{errors.company.message}</p>}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="position">Poste *</Label>
            <Input id="position" {...register("position")} placeholder="Développeuse Frontend" />
            {errors.position && <p className="text-xs text-destructive">{errors.position.message}</p>}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="location">Localisation</Label>
            <Input id="location" {...register("location")} placeholder="Paris / Remote" />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="contract_type">Type de contrat</Label>
            <Select
              value={watch("contract_type")}
              onValueChange={(v) => setValue("contract_type", v as FormValues["contract_type"])}
            >
              <SelectTrigger id="contract_type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONTRACT_TYPES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="salary">Salaire</Label>
            <Input id="salary" {...register("salary")} placeholder="55 000 €" />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="job_url">URL de l'offre</Label>
            <Input id="job_url" {...register("job_url")} placeholder="https://…" />
            {errors.job_url && <p className="text-xs text-destructive">{errors.job_url.message}</p>}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="application_date">Date de candidature *</Label>
            <Input id="application_date" type="date" {...register("application_date")} />
            {errors.application_date && (
              <p className="text-xs text-destructive">{errors.application_date.message}</p>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="status">Statut</Label>
            <Select
              value={watch("status")}
              onValueChange={(v) => setValue("status", v as FormValues["status"])}
            >
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="next_action">Prochaine action</Label>
            <Input id="next_action" {...register("next_action")} placeholder="Relancer le recruteur" />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="follow_up_date">Date de relance</Label>
            <Input id="follow_up_date" type="date" {...register("follow_up_date")} />
          </div>

          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" rows={4} {...register("notes")} placeholder="Contacts, ressenti, prochaines étapes…" />
          </div>

          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={formState.isSubmitting}>
              {application ? "Enregistrer" : "Ajouter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
