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
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FOLLOW_UP_STATUSES,
  FOLLOW_UP_STATUS_LABELS,
  type FollowUp,
  type FollowUpInput,
} from "@/types/application";

const schema = z.object({
  title: z.string().trim().min(1, "Le titre est obligatoire").max(120),
  date: z.string().min(1, "La date est obligatoire"),
  status: z.enum(FOLLOW_UP_STATUSES),
  description: z.string().max(1000).default(""),
});

type FormValues = z.input<typeof schema>;

const emptyValues = (): FormValues => ({
  title: "",
  date: new Date().toISOString().slice(0, 10),
  status: "todo",
  description: "",
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  followUp?: FollowUp | null;
  onSubmit: (values: FollowUpInput) => void;
}

export function FollowUpForm({ open, onOpenChange, followUp, onSubmit }: Props) {
  const { register, handleSubmit, reset, setValue, watch, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyValues(),
  });

  useEffect(() => {
    if (!open) return;
    reset(
      followUp
        ? {
            title: followUp.title,
            date: followUp.date,
            status: followUp.status,
            description: followUp.description,
          }
        : emptyValues(),
    );
  }, [open, followUp, reset]);

  const errors = formState.errors;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{followUp ? "Modifier la relance" : "Nouvelle relance"}</DialogTitle>
          <DialogDescription>Le titre et la date de relance sont obligatoires.</DialogDescription>
        </DialogHeader>

        <form
          className="grid gap-4"
          onSubmit={handleSubmit((values) => onSubmit(schema.parse(values) as FollowUpInput))}
        >
          <div className="grid gap-1.5">
            <Label htmlFor="fu_title">Titre *</Label>
            <Input id="fu_title" {...register("title")} placeholder="Relancer par email" />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="fu_date">Date de relance *</Label>
              <DatePicker
                id="fu_date"
                value={watch("date")}
                onChange={(v) => setValue("date", v, { shouldValidate: true })}
                aria-invalid={!!errors.date}
              />
              {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="fu_status">Statut</Label>
              <Select
                value={watch("status")}
                onValueChange={(v) => setValue("status", v as FormValues["status"])}
              >
                <SelectTrigger id="fu_status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FOLLOW_UP_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {FOLLOW_UP_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="fu_description">Description</Label>
            <Textarea
              id="fu_description"
              rows={3}
              {...register("description")}
              placeholder="Contexte, contact, canal…"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit">{followUp ? "Enregistrer" : "Ajouter"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
