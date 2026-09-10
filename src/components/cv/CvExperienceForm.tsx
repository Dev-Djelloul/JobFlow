import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import type { CvExperience, CvExperienceInput } from "@/types/cv";

const schema = z.object({
  title: z.string().trim().min(1, "L'intitulé du poste est obligatoire").max(120),
  company: z.string().trim().min(1, "L'entreprise est obligatoire").max(120),
  location: z.string().trim().max(120).default(""),
  startDate: z.string().trim().min(1, "La date de début est obligatoire"),
  endDate: z.string().trim().default(""),
  current: z.boolean().default(false),
  description: z.string().max(2000).default(""),
});

type FormValues = z.input<typeof schema>;

const emptyValues = (): FormValues => ({
  title: "",
  company: "",
  location: "",
  startDate: "",
  endDate: "",
  current: false,
  description: "",
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  experience?: CvExperience | null;
  onSubmit: (values: CvExperienceInput) => void;
}

export function CvExperienceForm({ open, onOpenChange, experience, onSubmit }: Props) {
  const { register, handleSubmit, reset, watch, setValue, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyValues(),
  });

  useEffect(() => {
    if (!open) return;
    reset(
      experience
        ? {
            title: experience.title,
            company: experience.company,
            location: experience.location,
            startDate: experience.startDate,
            endDate: experience.endDate,
            current: experience.current,
            description: experience.description,
          }
        : emptyValues(),
    );
  }, [open, experience, reset]);

  const errors = formState.errors;
  const current = watch("current");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{experience ? "Modifier l'expérience" : "Nouvelle expérience"}</DialogTitle>
          <DialogDescription>
            Le poste, l'entreprise et la date de début sont obligatoires.
          </DialogDescription>
        </DialogHeader>

        <form
          noValidate
          className="space-y-4"
          onSubmit={handleSubmit((values) => onSubmit(schema.parse(values) as CvExperienceInput))}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="title">Intitulé du poste *</Label>
              <Input id="title" {...register("title")} aria-invalid={!!errors.title} />
              {errors.title ? (
                <p className="text-xs text-destructive">{errors.title.message}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="company">Entreprise *</Label>
              <Input id="company" {...register("company")} aria-invalid={!!errors.company} />
              {errors.company ? (
                <p className="text-xs text-destructive">{errors.company.message}</p>
              ) : null}
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="location">Lieu</Label>
              <Input id="location" placeholder="Paris, télétravail…" {...register("location")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="startDate">Date de début *</Label>
              <Input
                id="startDate"
                type="month"
                {...register("startDate")}
                aria-invalid={!!errors.startDate}
              />
              {errors.startDate ? (
                <p className="text-xs text-destructive">{errors.startDate.message}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endDate">Date de fin</Label>
              <Input id="endDate" type="month" disabled={current} {...register("endDate")} />
            </div>
            <div className="flex items-center gap-2 sm:col-span-2">
              <Checkbox
                id="current"
                checked={!!current}
                onCheckedChange={(v) => setValue("current", v === true)}
              />
              <Label htmlFor="current" className="font-normal">
                Poste actuel
              </Label>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={5}
                placeholder="Missions, réalisations, compétences mises en œuvre…"
                {...register("description")}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={formState.isSubmitting}>
              {experience ? "Enregistrer" : "Ajouter l'expérience"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
