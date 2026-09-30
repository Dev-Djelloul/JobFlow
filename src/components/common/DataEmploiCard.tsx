import { ExternalLink, Map, TrendingUp, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const DATA_EMPLOI_TOPICS = [
  {
    icon: Map,
    label: "Par territoire",
    description: "Région, département, bassin France Travail, intercommunalité ou comité local.",
  },
  {
    icon: TrendingUp,
    label: "Tensions & dynamique",
    description: "Offres, demandeurs d'emploi, métiers en tension, évolution dans le temps.",
  },
  {
    icon: Users,
    label: "Profils des demandeurs",
    description:
      "Répartition par âge, catégorie, ancienneté d'inscription sur le territoire choisi.",
  },
];

/** Data Emploi (dataemploi.francetravail.fr) est un portail cartographique interactif sans API
 * publique — on pointe donc vers l'accueil, où l'utilisateur cherche lui-même son territoire
 * (aucun identifiant de territoire stable à deviner pour un deep-link fiable). */
export function DataEmploiCard() {
  return (
    <Card className="rounded-xl shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <img
            src="/img/France-Travail-logo.jpg"
            alt=""
            aria-hidden
            className="h-6 w-6 rounded-md object-cover"
          />
          Data Emploi
        </CardTitle>
        <CardDescription>
          Le tableau de bord territorial officiel de France Travail sur le marché du travail — utile
          pour situer un département ou un bassin d'emploi avant une candidature ou un déménagement.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="grid gap-3 sm:grid-cols-3">
          {DATA_EMPLOI_TOPICS.map((topic) => (
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
          <a href="https://dataemploi.francetravail.fr/" target="_blank" rel="noreferrer">
            Ouvrir Data Emploi <ExternalLink className="size-3.5" />
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}
