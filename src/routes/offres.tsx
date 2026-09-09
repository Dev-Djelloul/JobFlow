import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Building2, ExternalLink, MapPin, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/common/EmptyState";
import { ApplicationForm } from "@/components/applications/ApplicationForm";
import { useApplications } from "@/hooks/useApplications";
import { searchFranceTravailOffers, type FranceTravailOffer } from "@/lib/france-travail";
import { formatDate } from "@/lib/format";
import type { ApplicationInput, ContractType } from "@/types/application";

export const Route = createFileRoute("/offres")({
  head: () => ({
    meta: [
      { title: "Offres France Travail — JobFlow" },
      {
        name: "description",
        content: "Recherchez des offres d'emploi France Travail et ajoutez-les à vos candidatures.",
      },
    ],
  }),
  component: OffresPage,
});

const CONTRACT_TYPE_MAP: Record<string, ContractType> = {
  CDI: "CDI",
  CDD: "CDD",
  MIS: "Intérim",
  TTI: "Intérim",
  LIB: "Freelance",
  SAI: "CDD",
};

function mapContractType(code: string): ContractType {
  return CONTRACT_TYPE_MAP[code] ?? "CDI";
}

function OffresPage() {
  const { createApplication } = useApplications();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [offers, setOffers] = useState<FranceTravailOffer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [prefill, setPrefill] = useState<Partial<ApplicationInput> | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const motsCles = query.trim();
    if (!motsCles) return;
    setLoading(true);
    setError(null);
    try {
      const result = await searchFranceTravailOffers({ data: { motsCles } });
      if (!result.ok) {
        setError(result.error ?? "La recherche a échoué.");
        setOffers([]);
      } else {
        setOffers(result.offers);
        setSearched(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "La recherche a échoué (erreur inattendue).");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = (offer: FranceTravailOffer) => {
    setPrefill({
      company: offer.entreprise,
      position: offer.intitule,
      location: offer.lieu,
      contract_type: mapContractType(offer.typeContrat),
      salary: offer.salaire,
      job_url: offer.url,
      source: "france_travail",
      source_url: offer.url,
      application_date: new Date().toISOString().slice(0, 10),
      status: "to_target",
      notes: offer.description,
    });
    setFormOpen(true);
  };

  return (
    <AppLayout
      title="Offres France Travail"
      description="Recherchez des offres et ajoutez-les directement à vos candidatures."
    >
      <div className="space-y-4">
        <form onSubmit={handleSearch} className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Mots-clés (ex : chef de projet digital Paris)"
              className="pl-9"
              aria-label="Mots-clés de recherche"
            />
          </div>
          <Button type="submit" disabled={loading || !query.trim()}>
            {loading ? "Recherche…" : "Rechercher"}
          </Button>
        </form>

        {error ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {!searched && !loading ? (
          <EmptyState
            title="Rechercher des offres"
            description="Tapez un métier, un intitulé ou une entreprise pour voir les offres disponibles sur France Travail."
          />
        ) : null}

        {searched && !loading && offers.length === 0 && !error ? (
          <EmptyState
            title="Aucune offre trouvée"
            description="Essayez d'autres mots-clés ou élargissez votre recherche."
          />
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          {offers.map((offer) => (
            <Card key={offer.id} className="gap-2 rounded-lg p-4 shadow-none">
              <CardContent className="space-y-2 p-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium leading-snug">{offer.intitule}</p>
                  {offer.url ? (
                    <a
                      href={offer.url}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 text-muted-foreground hover:text-primary"
                      title="Voir l'offre originale"
                    >
                      <ExternalLink className="size-4" />
                    </a>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
                  {offer.entreprise ? (
                    <span className="flex items-center gap-1">
                      <Building2 className="size-3.5" /> {offer.entreprise}
                    </span>
                  ) : null}
                  {offer.lieu ? (
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3.5" /> {offer.lieu}
                    </span>
                  ) : null}
                  <span>{offer.typeContratLibelle || offer.typeContrat}</span>
                  {offer.dateCreation ? <span>{formatDate(offer.dateCreation)}</span> : null}
                </div>
                {offer.description ? (
                  <p className="line-clamp-3 text-sm text-muted-foreground">{offer.description}</p>
                ) : null}
                <Button size="sm" variant="outline" onClick={() => handleAdd(offer)}>
                  <Plus className="size-4" /> Ajouter comme candidature
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <ApplicationForm
        open={formOpen}
        onOpenChange={setFormOpen}
        initialValues={prefill ?? undefined}
        onSubmit={(values) => {
          try {
            createApplication(values);
            setFormOpen(false);
            toast.success("Candidature ajoutée depuis l'offre");
          } catch {
            toast.error("Une erreur est survenue, réessayez.");
          }
        }}
      />
    </AppLayout>
  );
}
