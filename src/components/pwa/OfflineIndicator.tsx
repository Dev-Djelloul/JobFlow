import { useEffect, useState } from "react";
import { WifiOff, Wifi } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

/**
 * Bandeau discret informant du changement d'état réseau. Jobee Flow ne
 * synchronise rien : ce composant est purement informatif, les données
 * locales restent consultables et modifiables dans les deux états.
 */
export function OfflineIndicator() {
  const isOnline = useOnlineStatus();
  const [showReconnected, setShowReconnected] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
      setShowReconnected(false);
      return;
    }
    if (wasOffline) {
      setShowReconnected(true);
      setWasOffline(false);
      const timer = setTimeout(() => setShowReconnected(false), 4000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isOnline, wasOffline]);

  if (!isOnline) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-muted px-4 py-2 text-sm text-muted-foreground shadow-md"
      >
        <WifiOff className="size-4" aria-hidden="true" />
        Mode hors ligne — vos données restent disponibles
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
