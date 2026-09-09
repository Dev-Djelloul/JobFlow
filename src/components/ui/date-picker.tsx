import { CalendarIcon } from "lucide-react";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { formatDate, todayKey } from "@/lib/format";

/** Parse une date "yyyy-mm-dd" en Date locale (évite le décalage UTC de `new Date(string)`). */
function parseDateKey(value: string): Date | undefined {
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export interface DatePickerProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  "aria-invalid"?: boolean;
}

/** Sélecteur de date basé sur un calendrier (Popover + Calendar), stocke une chaîne "yyyy-mm-dd". */
export function DatePicker({
  id,
  value,
  onChange,
  placeholder = "Choisir une date",
  disabled,
  ...rest
}: DatePickerProps) {
  const selected = value ? parseDateKey(value) : undefined;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          aria-invalid={rest["aria-invalid"]}
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
          )}
        >
          <CalendarIcon className="size-4" />
          {value ? formatDate(value) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          locale={fr}
          selected={selected}
          {...(selected ? { defaultMonth: selected } : {})}
          onSelect={(date) => onChange(date ? todayKey(date) : "")}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}
