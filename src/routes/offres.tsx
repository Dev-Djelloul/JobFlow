import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Building2, CheckCircle2, ExternalLink, MapPin, Plus, Save, Search } from "lucide-react";
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

const CONTRACT_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Tous les contrats" },
  { value: "CDI", label: "CDI" },
  { value: "CDD", label: "CDD" },
  { value: "MIS", label: "Intérim" },
  { value: "LIB", label: "Freelance / libéral" },
  { value: "SAI", label: "Saisonnier" },
];

const SAVED_SEARCH_KEY = "jobflow.offres.savedSearch.v1";

interface SavedSearch {
  motsCles: string;
  departement: string;
  typeContrat: string;
}

function loadSavedSearch(): SavedSearch | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SAVED_SEARCH_KEY);
    return raw ? (JSON.parse(raw) as SavedSearch) : null;
  } catch {
    return null;
  }
}

// L'API France Travail v2 n'a pas de paramètre dédié au télétravail : on filtre côté client
// sur la présence du mot "télétravail" dans l'intitulé/la description des offres déjà chargées.
function looksRemote(offer: FranceTravailOffer): boolean {
  const haystack = `${offer.intitule} ${offer.description}`.toLowerCase();
  return (
    haystack.includes("télétravail") ||
    haystack.includes("teletravail") ||
    haystack.includes("remote")
  );
}

function OffresPage() {
  const { applications, createApplication } = useApplications();
  const [query, setQuery] = useState("");
  const [departement, setDepartement] = useState("");
  const [typeContrat, setTypeContrat] = useState("");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searched, setSearched] = useState(false);
  const [offers, setOffers] = useState<FranceTravailOffer[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [prefill, setPrefill] = useState<Partial<ApplicationInput> | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    const saved = loadSavedSearch();
    if (saved) {
      setQuery(saved.motsCles);
      setDepartement(saved.departement);
      setTypeContrat(saved.typeContrat);
    }
  }, []);

  // URLs déjà présentes dans le suivi de candidatures — pour repérer les offres déjà ajoutées.
  const existingUrls = useMemo(
    () => new Set(applications.map((a) => a.job_url).filter(Boolean)),
    [applications],
  );

  const runSearch = async (targetPage: number) => {
    const motsCles = query.trim();
    if (!motsCles) return;
    const isFirstPage = targetPage === 0;
    if (isFirstPage) setLoading(true);
    else setLoadingMore(true);
    setError(null);
    try {
      const result = await searchFranceTravailOffers({
        data: {
          motsCles,
          page: targetPage,
          ...(departement.trim() ? { departement: departement.trim() } : {}),
          ...(typeContrat ? { typeContrat } : {}),
        },
      });
      if (!result.ok) {
        setError(result.error ?? "La recherche a échoué.");
        if (isFirstPage) setOffers([]);
      } else {
        setOffers((prev) => (isFirstPage ? result.offers : [...prev, ...result.offers]));
        setTotal(result.total ?? null);
        setPage(targetPage);
        setSearched(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "La recherche a échoué (erreur inattendue).");
    } finally {
      if (isFirstPage) setLoading(false);
      else setLoadingMore(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    void runSearch(0);
  };

  const handleSaveSearch = () => {
    const motsCles = query.trim();
    if (!motsCles) {
      toast.error("Renseignez des mots-clés avant d'enregistrer la recherche.");
      return;
    }
    const saved: SavedSearch = { motsCles, departement, typeContrat };
    window.localStorage.setItem(SAVED_SEARCH_KEY, JSON.stringify(saved));
    toast.success("Recherche enregistrée — elle sera proposée à chaque visite.");
  };

  const visibleOffers = remoteOnly ? offers.filter(looksRemote) : offers;

  // Regroupe les offres par région/département (préfixe du champ "lieu", ex. "75 - Paris") pour
  // rendre visible la répartition géographique — l'API ne renvoie pas de résultats triés par zone.
  const groupedOffers = visibleOffers.reduce<{ zone: string; items: FranceTravailOffer[] }[]>(
    (groups, offer) => {
      const zone = offer.lieu.split(" - ")[0]?.trim() || "Non précisé";
      const group = groups.find((g) => g.zone === zone);
      if (group) group.items.push(offer);
      else groups.push({ zone, items: [offer] });
      return groups;
    },
    [],
  );
  groupedOffers.sort((a, b) => a.zone.localeCompare(b.zone, "fr", { numeric: true }));

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

  const canLoadMore = total !== null && offers.length < total;

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
              placeholder="Mots-clés (ex : chef de projet digital)"
              className="pl-9"
              aria-label="Mots-clés de recherche"
            />
          </div>
          <Input
            value={departement}
            onChange={(e) => setDepartement(e.target.value)}
            placeholder="Département (ex : 75)"
            className="sm:w-44"
            aria-label="Département"
            inputMode="numeric"
            maxLength={3}
          />
          <select
            value={typeContrat}
            onChange={(e) => setTypeContrat(e.target.value)}
            aria-label="Type de contrat"
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs sm:w-48"
          >
            {CONTRACT_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <Button type="submit" disabled={loading || !query.trim()}>
            {loading ? "Recherche…" : "Rechercher"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleSaveSearch}
            title="Enregistrer cette recherche par défaut"
          >
            <Save className="size-4" />
          </Button>
        </form>

        <label className="flex w-fit items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={remoteOnly}
            onChange={(e) => setRemoteOnly(e.target.checked)}
            className="size-4 rounded border-input"
          />
          Télétravail uniquement (détecté depuis l'annonce)
        </label>

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

        {searched && !loading && visibleOffers.length === 0 && !error ? (
          <EmptyState
            title="Aucune offre trouvée"
            description="Essayez d'autres mots-clés ou élargissez votre recherche."
          />
        ) : null}

        <div className="space-y-6">
          {groupedOffers.map((group) => (
            <div key={group.zone} className="space-y-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <MapPin className="size-4" />
                {group.zone}
                <span className="font-normal">
                  ({group.items.length} offre{group.items.length > 1 ? "s" : ""})
                </span>
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {group.items.map((offer) => {
                  const alreadyAdded = offer.url ? existingUrls.has(offer.url) : false;
                  return (
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
                          {offer.dateCreation ? (
                            <span>{formatDate(offer.dateCreation)}</span>
                          ) : null}
                        </div>
                        {offer.description ? (
                          <p className="line-clamp-3 text-sm text-muted-foreground">
                            {offer.description}
                          </p>
                        ) : null}
                        {alreadyAdded ? (
                          <span className="flex w-fit items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="size-3.5" /> Déjà ajoutée
                          </span>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => handleAdd(offer)}>
                            <Plus className="size-4" /> Ajouter comme candidature
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {canLoadMore ? (
          <div className="flex justify-center pt-2">
            <Button
              variant="outline"
              onClick={() => void runSearch(page + 1)}
              disabled={loadingMore}
            >
              {loadingMore ? "Chargement…" : `Voir plus d'offres (${offers.length}/${total})`}
            </Button>
          </div>
        ) : null}
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
