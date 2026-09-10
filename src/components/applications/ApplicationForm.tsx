import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect } from "react";
import { Star } from "lucide-react";
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
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SourceLogo } from "@/components/common/SourceLogo";
import {
  APPLICATION_SOURCES,
  CONTRACT_TYPES,
  EXPERIENCE_LEVEL_LABELS,
  EXPERIENCE_LEVELS,
  REMOTE_LABELS,
  REMOTE_MODES,
  SOURCE_LABELS,
  STATUSES,
  STATUS_LABELS,
  type Application,
  type ApplicationInput,
} from "@/types/application";
import { cn } from "@/lib/utils";

const schema = z.object({
  company: z.string().trim().min(1, "L'entreprise est obligatoire").max(80),
  position: z.string().trim().min(1, "L'intitulé du poste est obligatoire").max(120),
  location: z.string().trim().max(80).default(""),
  contract_type: z.enum(CONTRACT_TYPES),
  salary: z.string().trim().max(40).default(""),
  job_url: z.string().trim().url("URL invalide").or(z.literal("")).default(""),
  source: z.enum(APPLICATION_SOURCES).or(z.literal("")).default(""),
  source_url: z.string().trim().url("URL invalide").or(z.literal("")).default(""),
  remote: z.enum(REMOTE_MODES).or(z.literal("")).default(""),
  experience_level: z.string().trim().max(120).default(""),
  application_date: z.string().min(1, "La date est obligatoire"),
  status: z.enum(STATUSES),
  notes: z.string().default(""),
  next_action: z.string().trim().max(160).default(""),
  follow_up_date: z.string().default(""),
  favorite: z.boolean().default(false),
});

type FormValues = z.input<typeof schema>;

const emptyValues = (): FormValues => ({
  company: "",
  position: "",
  location: "",
  contract_type: "CDI",
  salary: "",
  job_url: "",
  source: "",
  source_url: "",
  remote: "",
  experience_level: "",
  application_date: new Date().toISOString().slice(0, 10),
  status: "to_target",
  notes: "",
  next_action: "",
  follow_up_date: "",
  favorite: false,
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  application?: Application | null;
  /** Préremplit un nouveau formulaire (ex. depuis une offre importée), sans passer en mode édition. */
  initialValues?: Partial<ApplicationInput> | undefined;
  onSubmit: (values: ApplicationInput) => void;
}

export function ApplicationForm({
  open,
  onOpenChange,
  application,
  initialValues,
  onSubmit,
}: Props) {
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
            source: application.source ?? "",
            source_url: application.source_url ?? "",
            remote: application.remote ?? "",
            experience_level: application.experience_level ?? "",
            application_date: application.application_date,
            status: application.status,
            notes: application.notes,
            next_action: application.next_action,
            follow_up_date: application.follow_up_date,
            favorite: application.favorite ?? false,
          }
        : { ...emptyValues(), ...initialValues },
    );
  }, [open, application, initialValues, reset]);

  const errors = formState.errors;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 pr-6">
            {application ? "Modifier la candidature" : "Ajouter une candidature"}
            <button
              type="button"
              onClick={() => setValue("favorite", !watch("favorite"))}
              aria-label={watch("favorite") ? "Retirer des favoris" : "Ajouter aux favoris"}
              title={watch("favorite") ? "Retirer des favoris" : "Ajouter aux favoris"}
              className="text-muted-foreground hover:text-amber-500"
            >
              <Star
                className={cn("size-4", watch("favorite") && "fill-amber-400 text-amber-400")}
              />
            </button>
          </DialogTitle>
          <DialogDescription>
            Les champs entreprise, poste et date de candidature sont obligatoires.
          </DialogDescription>
        </DialogHeader>

        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={handleSubmit(
            (values) => {
              const parsed = schema.parse(values);
              const { source, source_url, remote, experience_level, ...rest } = parsed;
              onSubmit({
                ...rest,
                // Champs optionnels : on n'enregistre que ce qui est réellement renseigné.
                ...(source ? { source } : {}),
                ...(source_url ? { source_url } : {}),
                ...(remote ? { remote } : {}),
                ...(experience_level ? { experience_level } : {}),
              } as ApplicationInput);
            },
            // Filet de sécurité : sans ce callback, une validation en échec bloque la
            // soumission sans aucun signal visible si le message d'erreur du champ concerné
            // n'est pas affiché à l'écran (déjà arrivé avec les Notes, puis l'Entreprise).
            (formErrors) => {
              const firstMessage = Object.values(formErrors)[0]?.message;
              toast.error(
                firstMessage || "Certains champs sont invalides, vérifiez le formulaire.",
              );
            },
          )}
        >
          <div className="grid gap-1.5">
            <Label htmlFor="company">Entreprise *</Label>
            <Input id="company" {...register("company")} placeholder="Doctolib" />
            {errors.company && <p className="text-xs text-destructive">{errors.company.message}</p>}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="position">Poste *</Label>
            <Input id="position" {...register("position")} placeholder="Développeuse Frontend" />
            {errors.position && (
              <p className="text-xs text-destructive">{errors.position.message}</p>
            )}
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
            <Label htmlFor="source">Source</Label>
            <Select
              value={watch("source") || "none"}
              onValueChange={(v) =>
                setValue("source", (v === "none" ? "" : v) as FormValues["source"])
              }
            >
              <SelectTrigger id="source">
                <SelectValue placeholder="Non renseignée" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Non renseignée</SelectItem>
                {APPLICATION_SOURCES.map((s) => (
                  <SelectItem key={s} value={s}>
                    <span className="flex items-center gap-1.5">
                      <SourceLogo source={s} size={14} />
                      {SOURCE_LABELS[s]}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="source_url">URL source</Label>
            <Input id="source_url" {...register("source_url")} placeholder="https://…" />
            {errors.source_url && (
              <p className="text-xs text-destructive">{errors.source_url.message}</p>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="remote">Télétravail</Label>
            <Select
              value={watch("remote") || "none"}
              onValueChange={(v) =>
                setValue("remote", (v === "none" ? "" : v) as FormValues["remote"])
              }
            >
              <SelectTrigger id="remote">
                <SelectValue placeholder="Non renseigné" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Non renseigné</SelectItem>
                {REMOTE_MODES.map((m) => (
                  <SelectItem key={m} value={m}>
                    {REMOTE_LABELS[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="experience_level">Niveau d'expérience</Label>
            <Select
              value={watch("experience_level") || "none"}
              onValueChange={(v) =>
                setValue(
                  "experience_level",
                  (v === "none" ? "" : v) as FormValues["experience_level"],
                )
              }
            >
              <SelectTrigger id="experience_level">
                <SelectValue placeholder="Non renseigné" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Non renseigné</SelectItem>
                {EXPERIENCE_LEVELS.map((level) => (
                  <SelectItem key={level} value={level}>
                    {EXPERIENCE_LEVEL_LABELS[level]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="application_date">Date de candidature *</Label>
            <DatePicker
              id="application_date"
              value={watch("application_date")}
              onChange={(v) => setValue("application_date", v, { shouldValidate: true })}
              aria-invalid={!!errors.application_date}
            />
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
            <Input
              id="next_action"
              {...register("next_action")}
              placeholder="Relancer le recruteur"
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="follow_up_date">Date de relance</Label>
            <DatePicker
              id="follow_up_date"
              value={watch("follow_up_date") ?? ""}
              onChange={(v) => setValue("follow_up_date", v, { shouldValidate: true })}
            />
          </div>

          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              rows={4}
              {...register("notes")}
              placeholder="Contacts, ressenti, prochaines étapes…"
            />
            {errors.notes && <p className="text-xs text-destructive">{errors.notes.message}</p>}
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
