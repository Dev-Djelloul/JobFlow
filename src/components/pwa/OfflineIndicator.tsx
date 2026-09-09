import { useEffect, useRef, useState } from "react";
import { WifiOff, Wifi, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

const OFFLINE_AUTO_HIDE_MS = 8000;
const RECONNECTED_AUTO_HIDE_MS = 4000;

type Banner = "offline" | "reconnected" | null;

/**
 * Bandeau discret informant du changement d'état réseau. Jobee Flow ne
 * synchronise rien : ce composant est purement informatif, les données
 * locales restent consultables et modifiables dans les deux états. Se
 * referme automatiquement après quelques secondes, ou via le bouton de
 * fermeture, pour ne pas gêner la lecture du contenu en dessous.
 */
export function OfflineIndicator() {
  const isOnline = useOnlineStatus();
  const [banner, setBanner] = useState<Banner>(null);
  const wasOnline = useRef(isOnline);

  // Décide quel bandeau afficher, uniquement sur un vrai changement d'état réseau.
  useEffect(() => {
    if (wasOnline.current === isOnline) return;
    wasOnline.current = isOnline;
    setBanner(isOnline ? "reconnected" : "offline");
  }, [isOnline]);

  // Minuterie de disparition automatique, indépendante du reste : ne se
  // réarme que lorsque le bandeau affiché change réellement.
  useEffect(() => {
    if (!banner) return;
    const delay = banner === "offline" ? OFFLINE_AUTO_HIDE_MS : RECONNECTED_AUTO_HIDE_MS;
    const timer = setTimeout(() => setBanner(null), delay);
    return () => clearTimeout(timer);
  }, [banner]);

  if (banner === "offline") {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-muted py-2 pl-4 pr-2 text-sm text-muted-foreground shadow-md"
      >
        <WifiOff className="size-4 shrink-0" aria-hidden="true" />
        Mode hors ligne — vos données restent disponibles
        <Button
          variant="ghost"
          size="icon"
          className="size-6 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
          aria-label="Fermer"
          onClick={() => setBanner(null)}
        >
          <X className="size-3.5" />
        </Button>
      </div>
    );
  }

  if (banner === "reconnected") {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-primary py-2 pl-4 pr-2 text-sm text-primary-foreground shadow-md"
      >
        <Wifi className="size-4 shrink-0" aria-hidden="true" />
        Connexion rétablie
        <Button
          variant="ghost"
          size="icon"
          className="size-6 shrink-0 rounded-full text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
          aria-label="Fermer"
          onClick={() => setBanner(null)}
        >
          <X className="size-3.5" />
        </Button>
      </div>
    );
  }

  return null;
}
