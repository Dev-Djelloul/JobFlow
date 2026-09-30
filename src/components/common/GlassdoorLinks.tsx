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

/** Glassdoor n'a plus d'API publique et sa fiche entreprise (qui regroupe les onglets Avis /
 * Salaires / Entretiens) nécessite un identifiant interne dans l'URL (ex. EI_IE1363581) —
 * impossible à connaître à l'avance sans intégration payante. On pointe donc vers la recherche
 * d'entreprise de Glassdoor pré-remplie avec le nom, qui liste l'entreprise en un clic. */
export function GlassdoorLinks({ companyName }: { companyName: string }) {
  const searchUrl = `https://www.glassdoor.fr/Explore/browse-companies.htm?employerName=${encodeURIComponent(
    companyName,
  )}&page=1`;

  return (
    <Card className="rounded-xl shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <img src="/img/Glassdoor-image.jpeg" alt="" aria-hidden className="h-5 w-auto rounded" />
          Transparence entreprise
        </CardTitle>
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
