import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

/** Affiche une adresse/localisation cliquable, ouvrant Google Maps dans un nouvel onglet. */
export function AddressLink({
  address,
  className,
  showIcon = false,
}: {
  address: string | undefined | null;
  className?: string;
  showIcon?: boolean;
}) {
  const trimmed = address?.trim() ?? "";
  if (!trimmed) return <span className={className}>—</span>;

  return (
    <a
      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trimmed)}`}
      target="_blank"
      rel="noreferrer"
      title={`Ouvrir « ${trimmed} » dans Google Maps`}
      // Empêche l'ouverture du lien de déclencher un clic parent (ligne de tableau, carte…).
      onClick={(e) => e.stopPropagation()}
      className={cn("inline-flex items-center gap-1 hover:text-primary hover:underline", className)}
    >
      {showIcon ? <MapPin className="size-3.5 shrink-0" /> : null}
      {trimmed}
    </a>
  );
}
