# Jobee Flow

Application personnelle de gestion de candidatures et de recherche d'emploi — tableau de
bord, suivi des candidatures, vue Kanban, relances, contacts, entreprises, modèles
d'emails, analytics et détection de qualité des données.

**100% local-first** : toutes les données (candidatures, contacts, relances, modèles
d'emails, paramètres) sont stockées dans le `localStorage` du navigateur. Aucun backend,
aucune authentification, aucune synchronisation cloud — vos données restent sur votre
machine et sont exportables/importables à tout moment (JSON ou CSV).

Jobee Flow est aussi une **Progressive Web App (PWA)** : installable, responsive, et
utilisable hors ligne après un premier chargement.

## Sommaire

- [Fonctionnalités](#fonctionnalités)
- [Stack technique](#stack-technique)
- [Installation](#installation)
- [Scripts disponibles](#scripts-disponibles)
- [Structure du projet](#structure-du-projet)
- [Stockage des données](#stockage-des-données)
- [PWA & mode hors ligne](#pwa--mode-hors-ligne)
- [Tests end-to-end](#tests-end-to-end)
- [Déploiement](#déploiement)

## Fonctionnalités

- **Dashboard** : statistiques clés (candidatures totales, envoyées, entretiens en cours,
  offres reçues, taux de réponse), dernières candidatures, prochaines actions, graphique
  d'évolution.
- **Candidatures** : liste filtrable/triable (statut, type de contrat, recherche texte),
  création, modification, suppression, historique des statuts, relances (follow-ups).
- **Kanban** : glisser-déposer les candidatures entre les colonnes (À cibler, Envoyée,
  Entretien, Test, Offre, Refusée).
- **Actions** : vue consolidée des prochaines actions et relances à traiter.
- **Entreprises** : vue dérivée automatiquement des candidatures, agrégée par entreprise.
- **Contacts** : carnet de contacts liés aux candidatures (recruteurs, RH, contacts réseau).
- **Emails** : centre de modèles d'emails personnalisables (relance, remerciement, etc.).
- **Analytics** : statistiques et graphiques sur l'ensemble du pipeline de candidatures.
- **Intelligence** : insights automatiques sur les candidatures (priorités, tendances).
- **Data Quality** : détection d'incohérences ou de données incomplètes.
- **Paramètres** : profil, thème clair/sombre, densité d'affichage, vue par défaut.
- **Sauvegarde** : export/import complet au format JSON (versionné et rétrocompatible) et
  export CSV des candidatures — tout fonctionne hors ligne.

## Stack technique

| Domaine | Technologie |
|---|---|
| Framework | [TanStack Start](https://tanstack.com/start) (SSR) + [React 19](https://react.dev) |
| Routing | [TanStack Router](https://tanstack.com/router) (file-based, `src/routes/`) |
| Data fetching | [TanStack Query](https://tanstack.com/query) |
| Build | [Vite](https://vitejs.dev) 8, via `@lovable.dev/vite-tanstack-config` |
| Déploiement | [Nitro](https://nitro.build) → Cloudflare Workers |
| Styles | [Tailwind CSS](https://tailwindcss.com) v4 |
| Composants UI | [shadcn/ui](https://ui.shadcn.com) (Radix UI + `class-variance-authority`) |
| Formulaires | [react-hook-form](https://react-hook-form.com) + [zod](https://zod.dev) |
| Graphiques | [Recharts](https://recharts.org) |
| PWA | [vite-plugin-pwa](https://vite-pwa-org.netlify.app) (Workbox, mode `injectManifest`) |
| Langage | TypeScript (strict) |
| Lint / format | ESLint + Prettier |
| Tests E2E | Playwright (scripts Python, `tests/e2e/`) |
| Stockage | `localStorage` du navigateur (aucun backend, aucune base de données) |

## Installation

Prérequis : [Node.js](https://nodejs.org) ≥ 20 et npm (ou `bun`, un `bun.lock` est fourni).

```sh
git clone <url-du-dépôt>
cd jobee-flow
npm install
npm run dev
```

L'application est servie par défaut par Vite (voir la sortie du terminal pour le port,
généralement `http://localhost:5173`, ou `http://localhost:8080` en environnement de
test — voir `tests/e2e/README.md`).

Aucune variable d'environnement n'est requise pour le développement local : l'application
ne dépend d'aucun service externe (hormis Google Fonts, chargées en ligne).

## Scripts disponibles

| Commande | Description |
|---|---|
| `npm run dev` | Démarre le serveur de développement Vite |
| `npm run build` | Build de production (client + serveur Nitro/Cloudflare) |
| `npm run build:dev` | Build en mode développement (non minifié) |
| `npm run preview` | Prévisualise le build (nécessite un environnement compatible Cloudflare Workers, voir remarque ci-dessous) |
| `npm run lint` | Vérifie le code avec ESLint (inclut les règles Prettier) |
| `npm run format` | Reformate le code avec Prettier |

> **Remarque build/preview** : le projet cible Cloudflare Workers via Nitro. `vite preview`
> seul ne suffit pas à exécuter le worker généré (`.output/server/`) — pour un test fidèle
> du build de production, utilisez `wrangler dev` depuis `.output/server/` après
> `npm run build` (nécessite `wrangler`, installable via `npx wrangler`).

## Structure du projet

```
src/
├── routes/            # Pages (file-based routing TanStack Router)
│   ├── index.tsx           # Dashboard
│   ├── candidatures.tsx
│   ├── kanban.tsx
│   ├── actions.tsx
│   ├── intelligence.tsx
│   ├── entreprises.*.tsx
│   ├── contacts.*.tsx
│   ├── emails.tsx
│   ├── analytics.tsx
│   ├── data-quality.tsx
│   ├── parametres.tsx
│   └── __root.tsx          # Layout racine, head HTML, providers
├── components/
│   ├── ui/            # Composants shadcn/ui de base
│   ├── layout/        # Sidebar, navigation, layout applicatif
│   ├── applications/  # Composants liés aux candidatures
│   ├── contacts/      # Composants liés aux contacts
│   ├── email/         # Centre d'emails et éditeur de modèles
│   ├── actions/        # Vue des prochaines actions
│   ├── settings/       # Paramètres, sauvegarde, import CSV
│   ├── pwa/            # Indicateur online/offline, prompt de mise à jour
│   └── common/         # Composants partagés divers
├── hooks/              # Contexts et hooks (candidatures, contacts, settings, emails...)
├── lib/                # Logique métier pure (storage, backup, analytics, csv-import...)
├── types/              # Types et interfaces TypeScript
├── server.ts           # Point d'entrée SSR (Cloudflare Worker)
├── start.ts            # Configuration TanStack Start (middlewares, CSRF)
├── sw.ts               # Service worker (PWA, mode injectManifest)
└── styles.css          # Design system (tokens Tailwind v4, oklch)

public/                 # Assets statiques (favicon, manifest, icônes PWA, offline.html)
tests/e2e/               # Tests end-to-end Playwright (scripts Python)
```

## Stockage des données

Toutes les données métier vivent dans le `localStorage` du navigateur, sous des clés
versionnées (`src/lib/storage.ts`) :

- `jobflow.applications.v1` — candidatures
- `jobflow.contacts.v1` — contacts
- `jobflow.settings.v1` — paramètres utilisateur
- `jobflow.emailTemplates.v1` — modèles d'emails

**Sauvegarde et migration** : la page Paramètres permet d'exporter/importer une
sauvegarde JSON complète (`src/lib/backup.ts`, format versionné avec migration
rétrocompatible v1→v4) ainsi qu'un export CSV des candidatures. Import/export
fonctionnent entièrement côté client, sans réseau.

## PWA & mode hors ligne

Jobee Flow est installable (`public/manifest.webmanifest`) et reste utilisable hors ligne
après un premier chargement en ligne :

- Un service worker custom (`src/sw.ts`, Workbox en mode `injectManifest`) met en cache
  les assets applicatifs et le rendu HTML de chaque route visitée (stratégie
  `NetworkFirst`), afin de pouvoir les resservir hors ligne.
- Une route jamais visitée en ligne affiche une page de secours conviviale
  (`public/offline.html`) plutôt qu'une erreur technique.
- Un bandeau discret signale les passages online/offline
  (`src/components/pwa/OfflineIndicator.tsx`).
- Les mises à jour de l'application sont proposées via un bandeau non intrusif
  (`src/components/pwa/UpdatePrompt.tsx`) et ne suppriment jamais les données locales.

Les données `localStorage` ne transitent jamais par le service worker : elles restent
consultables et modifiables indépendamment de l'état réseau (candidatures, contacts,
relances, exports/imports JSON et CSV inclus).

## Tests end-to-end

Des scripts Playwright (Python) couvrent la navigation et l'import CSV :

```sh
python3 tests/e2e/pages-smoke.py   # navigation + absence d'erreur console
python3 tests/e2e/csv-import.py    # import CSV : mapping, doublons, rapport
```

Voir `tests/e2e/README.md` pour les prérequis (serveur de développement sur le port
`8080`).

## Déploiement

Le build de production cible Cloudflare Workers via Nitro :

```sh
npm run build
npx nitro deploy --prebuilt
```

Le worker généré (`.output/server/`) sert les assets statiques (`.output/public/`,
dont le manifest PWA, les icônes et le service worker) via le binding `ASSETS`.
