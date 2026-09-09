import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Building2,
  CheckCircle2,
  ExternalLink,
  MapPin,
  Plus,
  Save,
  Search,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/common/EmptyState";
import { ApplicationForm } from "@/components/applications/ApplicationForm";
import { useApplications } from "@/hooks/useApplications";
import { searchFranceTravailOffers, type FranceTravailOffer } from "@/lib/france-travail";
import { departmentName } from "@/lib/french-departments";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
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

// L'API renvoie un code (typeContrat) mais les stages/alternances n'y sont pas toujours
// distingués de façon fiable : on complète donc par une lecture du libellé texte de l'offre.
function mapContractType(offer: FranceTravailOffer): ContractType {
  const libelle = offer.typeContratLibelle.toLowerCase();
  if (libelle.includes("stage")) return "Stage";
  if (
    libelle.includes("alternance") ||
    libelle.includes("apprentissage") ||
    libelle.includes("professionnalisation")
  )
    return "Alternance";
  const byCode: Record<string, ContractType> = {
    CDI: "CDI",
    CDD: "CDD",
    MIS: "Intérim",
    TTI: "Intérim",
    LIB: "Freelance",
    SAI: "CDD",
  };
  return byCode[offer.typeContrat] ?? "CDI";
}

// Filtre client-side : ces deux catégories ne correspondent pas à un code fiable et unique
// côté API "typeContrat", on les applique donc après réception des résultats.
type ContractFilter = "" | "CDI" | "CDD" | "MIS" | "LIB" | "SAI" | "STAGE" | "ALTERNANCE";

const CONTRACT_TYPE_OPTIONS: { value: ContractFilter; label: string }[] = [
  { value: "", label: "Tous les contrats" },
  { value: "CDI", label: "CDI" },
  { value: "CDD", label: "CDD" },
  { value: "MIS", label: "Intérim" },
  { value: "LIB", label: "Freelance / libéral" },
  { value: "SAI", label: "Saisonnier" },
  { value: "STAGE", label: "Stage" },
  { value: "ALTERNANCE", label: "Alternance" },
];

// Codes reconnus tels quels par le paramètre "typeContrat" de l'API ; Stage/Alternance sont
// filtrés côté client (voir mapContractType) car non fiablement identifiables par un code seul.
const API_CONTRACT_CODES = new Set(["CDI", "CDD", "MIS", "LIB", "SAI"]);

const PAGE_SIZE_OPTIONS = [20, 50, 100, 150] as const;

const SAVED_SEARCH_KEY = "jobflow.offres.savedSearch.v1";
const FAVORITE_OFFERS_KEY = "jobflow.offres.favorites.v1";

interface SavedSearch {
  motsCles: string;
  departement: string;
  typeContrat: ContractFilter;
  pageSize: number;
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

function loadFavoriteOfferIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(FAVORITE_OFFERS_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
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

// Style aligné sur la mise en évidence de l'expérience côté candidature (ApplicationDetail) :
// vert pour "débutant accepté", ambre quand une expérience est demandée.
function experienceBadgeClasses(exige: string): string {
  if (exige === "D") return "bg-success/12 text-success border-success/30";
  if (exige === "E" || exige === "S")
    return "bg-warning/15 text-warning-foreground border-warning/35 dark:text-warning";
  return "bg-muted text-muted-foreground border-border";
}

// Correspondance approximative entre le code d'exigence France Travail et nos niveaux
// structurés — sert uniquement de valeur de départ, modifiable dans le formulaire.
function mapExperienceLevel(exige: string): string {
  if (exige === "D") return "debutant";
  if (exige === "S") return "junior";
  if (exige === "E") return "confirme";
  return "";
}

function matchesContractFilter(offer: FranceTravailOffer, filter: ContractFilter): boolean {
  if (!filter) return true;
  if (filter === "STAGE" || filter === "ALTERNANCE") {
    const mapped = mapContractType(offer);
    return filter === "STAGE" ? mapped === "Stage" : mapped === "Alternance";
  }
  return offer.typeContrat === filter;
}

function OffresPage() {
  const { applications, createApplication } = useApplications();
  const [query, setQuery] = useState("");
  const [departement, setDepartement] = useState("");
  const [typeContrat, setTypeContrat] = useState<ContractFilter>("");
  const [pageSize, setPageSize] = useState<number>(20);
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [beginnerOnly, setBeginnerOnly] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() => new Set());
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
      if (saved.pageSize) setPageSize(saved.pageSize);
    }
    setFavoriteIds(loadFavoriteOfferIds());
  }, []);

  const toggleFavoriteOffer = (offerId: string) => {
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (next.has(offerId)) next.delete(offerId);
      else next.add(offerId);
      window.localStorage.setItem(FAVORITE_OFFERS_KEY, JSON.stringify([...next]));
      return next;
    });
  };

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
          pageSize,
          ...(departement.trim() ? { departement: departement.trim() } : {}),
          ...(API_CONTRACT_CODES.has(typeContrat) ? { typeContrat } : {}),
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
    const saved: SavedSearch = { motsCles, departement, typeContrat, pageSize };
    window.localStorage.setItem(SAVED_SEARCH_KEY, JSON.stringify(saved));
    toast.success("Recherche enregistrée — elle sera proposée à chaque visite.");
  };

  const visibleOffers = offers
    .filter((o) => matchesContractFilter(o, typeContrat))
    .filter((o) => (remoteOnly ? looksRemote(o) : true))
    .filter((o) => (beginnerOnly ? o.experienceExige === "D" : true))
    .filter((o) => (favoritesOnly ? favoriteIds.has(o.id) : true));

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
      // Certaines offres France Travail masquent le nom de l'entreprise ("recruteur anonyme") :
      // le champ étant obligatoire dans le formulaire, une valeur vide bloquait silencieusement
      // l'ajout de la candidature (aucun message visible, le dialogue restait simplement ouvert).
      company: offer.entreprise || "Entreprise non communiquée",
      position: offer.intitule,
      location: offer.lieu,
      contract_type: mapContractType(offer),
      salary: offer.salaire,
      job_url: offer.url,
      source: "france_travail",
      source_url: offer.url,
      application_date: new Date().toISOString().slice(0, 10),
      status: "to_target",
      notes: offer.description,
      favorite: favoriteIds.has(offer.id),
      experience_level: mapExperienceLevel(offer.experienceExige),
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
        <form onSubmit={handleSearch} className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
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
            onChange={(e) => setTypeContrat(e.target.value as ContractFilter)}
            aria-label="Type de contrat"
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs sm:w-48"
          >
            {CONTRACT_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            aria-label="Nombre d'offres par page"
            title="Nombre d'offres par page"
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs sm:w-40"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size} offres / page
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

        <div className="flex flex-wrap gap-x-5 gap-y-2">
          <label className="flex w-fit items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={remoteOnly}
              onChange={(e) => setRemoteOnly(e.target.checked)}
              className="size-4 rounded border-input"
            />
            Télétravail uniquement (détecté depuis l'annonce)
          </label>
          <label className="flex w-fit items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={beginnerOnly}
              onChange={(e) => setBeginnerOnly(e.target.checked)}
              className="size-4 rounded border-input"
            />
            Ouvert aux débutants uniquement
          </label>
          <label className="flex w-fit items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={favoritesOnly}
              onChange={(e) => setFavoritesOnly(e.target.checked)}
              className="size-4 rounded border-input"
            />
            Favoris uniquement
          </label>
        </div>

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
              <div className="flex items-center gap-3">
                <h2 className="flex shrink-0 items-center gap-2 rounded-lg border border-primary/25 bg-primary/10 px-3 py-1.5">
                  <MapPin className="size-4 text-primary" />
                  <span className="text-sm font-bold text-primary">
                    {group.zone}
                    {departmentName(group.zone) ? ` — ${departmentName(group.zone)}` : ""}
                  </span>
                  <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-xs font-semibold text-primary-foreground">
                    {group.items.length}
                  </span>
                </h2>
                <div className="h-px flex-1 bg-gradient-to-r from-primary/30 to-transparent" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {group.items.map((offer) => {
                  const alreadyAdded = offer.url ? existingUrls.has(offer.url) : false;
                  const isFavorite = favoriteIds.has(offer.id);
                  return (
                    <Card key={offer.id} className="gap-2 rounded-lg p-4 shadow-none">
                      <CardContent className="space-y-2 p-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium leading-snug">{offer.intitule}</p>
                          <div className="flex shrink-0 items-center gap-2">
                            <button
                              type="button"
                              onClick={() => toggleFavoriteOffer(offer.id)}
                              aria-label={
                                isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"
                              }
                              title={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
                              className="text-muted-foreground hover:text-amber-500"
                            >
                              <Star
                                className={cn(
                                  "size-4",
                                  isFavorite && "fill-amber-400 text-amber-400",
                                )}
                              />
                            </button>
                            {offer.url ? (
                              <a
                                href={offer.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-muted-foreground hover:text-primary"
                                title="Voir l'offre originale"
                              >
                                <ExternalLink className="size-4" />
                              </a>
                            ) : null}
                          </div>
                        </div>
                        {offer.experienceLibelle ? (
                          <span
                            className={cn(
                              "inline-flex w-fit items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium",
                              experienceBadgeClasses(offer.experienceExige),
                            )}
                          >
                            {offer.experienceLibelle}
                          </span>
                        ) : null}
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
