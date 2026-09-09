import { useEffect, useState } from "react";
import { WifiOff, Wifi, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

const OFFLINE_AUTO_HIDE_MS = 8000;
const RECONNECTED_AUTO_HIDE_MS = 4000;

/**
 * Bandeau discret informant du changement d'état réseau. Jobee Flow ne
 * synchronise rien : ce composant est purement informatif, les données
 * locales restent consultables et modifiables dans les deux états. Se
 * referme automatiquement après quelques secondes, ou via le bouton de
 * fermeture, pour ne pas gêner la lecture du contenu en dessous.
 */
export function OfflineIndicator() {
  const isOnline = useOnlineStatus();
  const [showReconnected, setShowReconnected] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);
  const [dismissedOffline, setDismissedOffline] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
      setShowReconnected(false);
      setDismissedOffline(false);
      const timer = setTimeout(() => setDismissedOffline(true), OFFLINE_AUTO_HIDE_MS);
      return () => clearTimeout(timer);
    }
    if (wasOffline) {
      setShowReconnected(true);
      setWasOffline(false);
      const timer = setTimeout(() => setShowReconnected(false), RECONNECTED_AUTO_HIDE_MS);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isOnline, wasOffline]);

  if (!isOnline && !dismissedOffline) {
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
          onClick={() => setDismissedOffline(true)}
        >
          <X className="size-3.5" />
        </Button>
      </div>
    );
  }

  if (showReconnected) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-primary px-4 py-2 text-sm text-primary-foreground shadow-md"
      >
        <Wifi className="size-4" aria-hidden="true" />
        Connexion rétablie
      </div>
    );
  }

  return null;
}
