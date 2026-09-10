import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Bell,
  BellPlus,
  Building2,
  CheckCircle2,
  ExternalLink,
  MapPin,
  Plus,
  Search,
  Star,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/common/EmptyState";
import { SourceLogo } from "@/components/common/SourceLogo";
import { ApplicationForm } from "@/components/applications/ApplicationForm";
import { useApplications } from "@/hooks/useApplications";
import { searchAdzunaOffers } from "@/lib/adzuna";
import { searchFranceTravailOffers } from "@/lib/france-travail";
import { looksRemote, mapContractType, type JobOffer, type OfferSource } from "@/lib/job-offers";
import {
  createAlert,
  loadAlerts,
  markAlertSeen,
  refreshAllAlerts,
  saveAlerts,
  type JobAlert,
} from "@/lib/job-alerts";
import { departmentName } from "@/lib/french-departments";
import { formatDate, relativeDateLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ApplicationInput, ContractType } from "@/types/application";

export const Route = createFileRoute("/offres")({
  head: () => ({
    meta: [
      { title: "Offres d'emploi — JobFlow" },
      {
        name: "description",
        content:
          "Recherchez des offres d'emploi (France Travail, Adzuna) et ajoutez-les à vos candidatures.",
      },
    ],
  }),
  component: OffresPage,
});

const SOURCE_OPTIONS: { value: OfferSource; label: string }[] = [
  { value: "france_travail", label: "France Travail" },
  { value: "adzuna", label: "Adzuna" },
];

type ContractFilter = "" | ContractType;

const CONTRACT_TYPE_OPTIONS: { value: ContractFilter; label: string }[] = [
  { value: "", label: "Tous les contrats" },
  { value: "CDI", label: "CDI" },
  { value: "CDD", label: "CDD" },
  { value: "Intérim", label: "Intérim" },
  { value: "Freelance", label: "Freelance / libéral" },
  { value: "Stage", label: "Stage" },
  { value: "Alternance", label: "Alternance" },
];

const PAGE_SIZE_OPTIONS_BY_SOURCE: Record<OfferSource, readonly number[]> = {
  france_travail: [20, 50, 100, 150],
  adzuna: [20, 50],
};

const FAVORITE_OFFERS_KEY = "jobflow.offres.favorites.v1";

function loadFavoriteOfferIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(FAVORITE_OFFERS_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
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
// structurés — sert uniquement de valeur de départ, modifiable dans le formulaire. Adzuna ne
// fournit pas cette information : experienceExige y est toujours vide, donc sans effet ici.
function mapExperienceLevel(exige: string): string {
  if (exige === "D") return "debutant";
  if (exige === "S") return "junior";
  if (exige === "E") return "confirme";
  return "";
}

function OffresPage() {
  const { applications, createApplication } = useApplications();
  const [source, setSource] = useState<OfferSource>("france_travail");
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [typeContrat, setTypeContrat] = useState<ContractFilter>("");
  const [pageSize, setPageSize] = useState<number>(20);
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [beginnerOnly, setBeginnerOnly] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searched, setSearched] = useState(false);
  const [offers, setOffers] = useState<JobOffer[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [prefill, setPrefill] = useState<Partial<ApplicationInput> | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [alerts, setAlerts] = useState<JobAlert[]>([]);
  const [alertsChecking, setAlertsChecking] = useState(false);
  const [creatingAlert, setCreatingAlert] = useState(false);
  const [newAlertName, setNewAlertName] = useState("");

  useEffect(() => {
    setFavoriteIds(loadFavoriteOfferIds());
    const stored = loadAlerts();
    setAlerts(stored);
    if (stored.length > 0) {
      setAlertsChecking(true);
      refreshAllAlerts(stored)
        .then((updated) => {
          setAlerts(updated);
          saveAlerts(updated);
        })
        .finally(() => setAlertsChecking(false));
    }
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

  // Accepte des critères explicites (utilisés en ouvrant une alerte) plutôt que de ne lire
  // que l'état du composant : juste après setSource/setQuery/setLocation, l'état React n'a
  // pas encore été mis à jour au moment de l'appel, ce qui lancerait la recherche avec les
  // anciennes valeurs si on ne pouvait pas les passer explicitement.
  const runSearch = async (
    targetPage: number,
    overrides?: { source?: OfferSource; motsCles?: string; location?: string },
  ) => {
    const activeSource = overrides?.source ?? source;
    const motsCles = (overrides?.motsCles ?? query).trim();
    const activeLocation = overrides?.location ?? location;
    if (!motsCles) return;
    const isFirstPage = targetPage === 0;
    if (isFirstPage) setLoading(true);
    else setLoadingMore(true);
    setError(null);
    try {
      const result =
        activeSource === "france_travail"
          ? await searchFranceTravailOffers({
              data: {
                motsCles,
                page: targetPage,
                pageSize,
                ...(activeLocation.trim() ? { departement: activeLocation.trim() } : {}),
              },
            })
          : await searchAdzunaOffers({
              data: {
                motsCles,
                page: targetPage,
                pageSize,
                ...(activeLocation.trim() ? { lieu: activeLocation.trim() } : {}),
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
      // Erreur inattendue (pas un ok:false renvoyé proprement par le serveur) : on affiche le
      // maximum de contexte disponible pour pouvoir diagnostiquer sans devoir rouvrir la console.
      const detail =
        e instanceof Error
          ? `${e.name}: ${e.message}${e.stack ? `\n${e.stack.split("\n").slice(0, 3).join("\n")}` : ""}`
          : String(e);
      setError(`Erreur inattendue (${source}) — ${detail}`);
    } finally {
      if (isFirstPage) setLoading(false);
      else setLoadingMore(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    void runSearch(0);
  };

  const handleSourceChange = (next: OfferSource) => {
    setSource(next);
    const maxSize = PAGE_SIZE_OPTIONS_BY_SOURCE[next][
      PAGE_SIZE_OPTIONS_BY_SOURCE[next].length - 1
    ] as number;
    if (pageSize > maxSize) setPageSize(PAGE_SIZE_OPTIONS_BY_SOURCE[next][0] as number);
  };

  const handleOpenCreateAlert = () => {
    const motsCles = query.trim();
    if (!motsCles) {
      toast.error("Renseignez des mots-clés avant de créer une alerte.");
      return;
    }
    setNewAlertName(`${motsCles}${location.trim() ? ` — ${location.trim()}` : ""}`);
    setCreatingAlert(true);
  };

  const handleConfirmCreateAlert = () => {
    const name = newAlertName.trim();
    if (!name) {
      toast.error("Donnez un nom à cette alerte.");
      return;
    }
    const alert = createAlert({
      name,
      motsCles: query.trim(),
      location: location.trim(),
      source,
      typeContrat,
    });
    const next = [alert, ...alerts];
    setAlerts(next);
    saveAlerts(next);
    setCreatingAlert(false);
    toast.success("Alerte créée — elle sera vérifiée à chaque visite de cette page.");
    void refreshAllAlerts([alert]).then(([updated]) => {
      if (!updated) return;
      setAlerts((prev) => {
        const merged = prev.map((a) => (a.id === updated.id ? updated : a));
        saveAlerts(merged);
        return merged;
      });
    });
  };

  const handleDeleteAlert = (id: string) => {
    const next = alerts.filter((a) => a.id !== id);
    setAlerts(next);
    saveAlerts(next);
    toast.success("Alerte supprimée");
  };

  // Reprend les critères d'une alerte dans le formulaire, lance la recherche, et marque ses
  // offres en attente comme vues (le badge "nouvelles offres" repart à zéro après consultation).
  const handleViewAlert = (alert: JobAlert) => {
    setSource(alert.source);
    setQuery(alert.motsCles);
    setLocation(alert.location);
    setTypeContrat(alert.typeContrat);
    const updated = markAlertSeen(alert);
    const next = alerts.map((a) => (a.id === alert.id ? updated : a));
    setAlerts(next);
    saveAlerts(next);
    void runSearch(0, {
      source: alert.source,
      motsCles: alert.motsCles,
      location: alert.location,
    });
  };

  const visibleOffers = offers
    .filter((o) => (typeContrat ? mapContractType(o) === typeContrat : true))
    .filter((o) => (remoteOnly ? looksRemote(o) : true))
    .filter((o) => (beginnerOnly ? o.experienceExige === "D" : true))
    .filter((o) => (favoritesOnly ? favoriteIds.has(o.id) : true));

  // Regroupe les offres par région/département (préfixe du champ "lieu", ex. "75 - Paris") pour
  // rendre visible la répartition géographique — l'API ne renvoie pas de résultats triés par zone.
  const groupedOffers = visibleOffers.reduce<{ zone: string; items: JobOffer[] }[]>(
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

  const handleAdd = (offer: JobOffer) => {
    setPrefill({
      // Certaines offres masquent le nom de l'entreprise ("recruteur anonyme") : le champ
      // étant obligatoire dans le formulaire, une valeur vide bloquait silencieusement
      // l'ajout de la candidature (aucun message visible, le dialogue restait simplement ouvert).
      company: offer.entreprise || "Entreprise non communiquée",
      position: offer.intitule,
      location: offer.lieu,
      contract_type: mapContractType(offer),
      salary: offer.salaire,
      job_url: offer.url,
      source: offer.source,
      source_url: offer.url,
      application_date: new Date().toISOString().slice(0, 10),
      status: "to_target",
      // L'API Adzuna ne renvoie qu'une description tronquée dans ses résultats de recherche
      // (contrairement à France Travail) — aucun paramètre ne permet d'obtenir le texte
      // complet, qui n'existe que sur la page de l'offre. On le signale explicitement pour
      // éviter de faire croire à une perte de données côté JobFlow.
      notes:
        offer.source === "adzuna"
          ? `${offer.description}\n\n[Description tronquée par Adzuna — voir le texte complet sur l'offre originale : ${offer.url}]`
          : offer.description,
      favorite: favoriteIds.has(offer.id),
      experience_level: mapExperienceLevel(offer.experienceExige),
      ...(looksRemote(offer) ? { remote: "remote" as const } : {}),
    });
    setFormOpen(true);
  };

  const canLoadMore = total !== null && offers.length < total;
  const pageSizeOptions = PAGE_SIZE_OPTIONS_BY_SOURCE[source];
  const locationPlaceholder =
    source === "france_travail" ? "Département (ex : 75)" : "Ville ou code postal (ex : Paris)";

  return (
    <AppLayout
      title="Offres d'emploi"
      description="Recherchez des offres (France Travail, Adzuna) et ajoutez-les directement à vos candidatures."
    >
      <div className="space-y-4">
        <div className="flex w-fit rounded-lg border border-input bg-muted/50 p-0.5">
          {SOURCE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleSourceChange(opt.value)}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                source === opt.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <SourceLogo source={opt.value} size={16} />
              {opt.label}
            </button>
          ))}
        </div>

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
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder={locationPlaceholder}
            className="sm:w-52"
            aria-label="Lieu"
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
            {pageSizeOptions.map((size) => (
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
            onClick={handleOpenCreateAlert}
            title="Créer une alerte à partir de cette recherche"
          >
            <BellPlus className="size-4" />
          </Button>
        </form>

        {creatingAlert ? (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/25 bg-primary/5 p-3">
            <Input
              value={newAlertName}
              onChange={(e) => setNewAlertName(e.target.value)}
              placeholder="Nom de l'alerte"
              className="sm:w-64"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleConfirmCreateAlert();
                }
              }}
            />
            <Button size="sm" onClick={handleConfirmCreateAlert}>
              Créer l'alerte
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setCreatingAlert(false)}>
              Annuler
            </Button>
          </div>
        ) : null}

        {alerts.length > 0 ? (
          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Bell className="size-3.5" />
              Mes alertes {alertsChecking ? "(vérification…)" : ""}
            </p>
            <div className="flex flex-wrap gap-2">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center gap-2 rounded-lg border border-border bg-card py-1.5 pl-3 pr-1.5"
                >
                  <button
                    type="button"
                    onClick={() => handleViewAlert(alert)}
                    className="flex items-center gap-2 text-left text-sm"
                  >
                    <SourceLogo
                      source={alert.source}
                      size={16}
                      title={SOURCE_OPTIONS.find((o) => o.value === alert.source)?.label}
                    />
                    <span className="font-medium">{alert.name}</span>
                    {alert.pendingOfferIds.length > 0 ? (
                      <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 py-0.5 text-xs font-semibold text-destructive-foreground">
                        {alert.pendingOfferIds.length}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {alert.lastCheckedAt
                          ? `à jour · ${relativeDateLabel(alert.lastCheckedAt)}`
                          : "en attente"}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteAlert(alert.id)}
                    aria-label={`Supprimer l'alerte ${alert.name}`}
                    title="Supprimer cette alerte"
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : null}

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
          <p className="whitespace-pre-wrap break-words rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {!searched && !loading ? (
          <EmptyState
            title="Rechercher des offres"
            description="Tapez un métier, un intitulé ou une entreprise pour voir les offres disponibles."
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
                    <Card
                      key={`${offer.source}-${offer.id}`}
                      className="gap-2 rounded-lg p-4 shadow-none"
                    >
                      <CardContent className="space-y-2 p-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="flex items-start gap-1.5 font-medium leading-snug">
                            <SourceLogo
                              source={offer.source}
                              size={16}
                              className="mt-0.5 shrink-0"
                            />
                            {offer.intitule}
                          </p>
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
                          <span className="flex w-fit items-center gap-1.5 rounded-full bg-success/12 px-2.5 py-1 text-xs font-medium text-success">
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
