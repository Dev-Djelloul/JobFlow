import { Linkedin, Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { isValidLinkedInUrl } from "@/lib/contacts";
import type { Contact } from "@/types/contact";

/** Boutons « Écrire un email » et « Voir LinkedIn » (aucune intégration externe). */
export function ContactActions({
  contact,
  size = "sm",
}: {
  contact: Contact;
  size?: "sm" | "default";
}) {
  const hasEmail = !!contact.email.trim();
  const hasLinkedIn = isValidLinkedInUrl(contact.linkedin_url ?? "");

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        size={size}
        variant="outline"
        disabled={!hasEmail}
        title={hasEmail ? `Écrire à ${contact.email}` : "Aucune adresse email renseignée"}
        onClick={() => {
          if (!hasEmail) return;
          try {
            window.location.href = `mailto:${encodeURIComponent(contact.email.trim())}`;
          } catch {
            toast.error("Impossible d'ouvrir le client email.");
          }
        }}
      >
        <Mail className="size-4" /> Écrire un email
      </Button>
      <Button
        size={size}
        variant="outline"
        disabled={!hasLinkedIn}
        title={hasLinkedIn ? "Ouvrir le profil LinkedIn" : "Aucune URL LinkedIn valide"}
        onClick={() => {
          if (!hasLinkedIn) return;
          window.open(contact.linkedin_url.trim(), "_blank", "noopener,noreferrer");
        }}
      >
        <Linkedin className="size-4" /> Voir LinkedIn
      </Button>
    </div>
  );
}
