import { ExternalLink, MessageSquareText, Users, Wallet } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const GLASSDOOR_TOPICS = [
  {
    icon: MessageSquareText,
    label: "Avis employés",
    description: "Culture d'entreprise, management, ambiance — vus par ceux qui y travaillent.",
  },
  {
    icon: Wallet,
    label: "Rémunération",
    description: "Fourchettes de salaires déclarées par poste, pour comparer avec l'offre reçue.",
  },
  {
    icon: Users,
    label: "Entretiens",
    description: "Retours sur le déroulé du processus de recrutement et questions posées.",
  },
];

/** Glassdoor n'a plus d'API publique et ne permet pas de lien direct vers les onglets Avis /
 * Salaires / Entretiens d'une entreprise sans son identifiant interne — impossible à obtenir
 * sans intégration payante. On propose donc une recherche pré-remplie plutôt que d'inventer
 * des données : l'utilisateur atterrit sur la fiche entreprise Glassdoor, qui regroupe ces trois
 * onglets, en un clic. */
export function GlassdoorLinks({ companyName }: { companyName: string }) {
  const searchUrl = `https://www.glassdoor.fr/Recherche/resultats.htm?keyword=${encodeURIComponent(
    companyName,
  )}`;

  return (
    <Card className="rounded-xl shadow-none">
      <CardHeader>
        <CardTitle className="text-base">Transparence entreprise</CardTitle>
        <CardDescription>
          Avis employés, salaires et retours d'entretien pour {companyName}, via Glassdoor.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="grid gap-3 sm:grid-cols-3">
          {GLASSDOOR_TOPICS.map((topic) => (
            <li key={topic.label} className="flex gap-2 rounded-lg border p-3">
              <topic.icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{topic.label}</p>
                <p className="text-xs text-muted-foreground">{topic.description}</p>
              </div>
            </li>
          ))}
        </ul>
        <Button asChild variant="outline" size="sm">
          <a href={searchUrl} target="_blank" rel="noreferrer">
            Rechercher {companyName} sur Glassdoor <ExternalLink className="size-3.5" />
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}
