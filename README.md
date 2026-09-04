# Job Seeker Hub

Test Lovable — JobFlow

Crée une application web SaaS responsive appelée JobFlow, destinée à permettre à un utilisateur de gérer et suivre ses candidatures professionnelles.

1. Interface

Créer une interface moderne, professionnelle et responsive.

Style :

SaaS moderne

Interface claire et minimaliste

Sidebar de navigation sur desktop

Navigation adaptée au mobile

Cartes avec coins légèrement arrondis

Hiérarchie visuelle claire

Design professionnel plutôt que très coloré

Créer les pages suivantes :

Dashboard

Afficher :

Nombre total de candidatures

Candidatures envoyées

Entretiens en cours

Offres reçues

Taux de réponse

Dernières candidatures

Prochaines actions

Un graphique simple montrant l'évolution des candidatures

Candidatures

Afficher les candidatures sous forme de tableau avec :

Entreprise

Poste

Localisation

Date

Statut

Prochaine action

Ajouter :

Recherche

Filtre par statut

Filtre par type de contrat

Tri par date

Bouton "Ajouter une candidature"

Vue Kanban

Créer un tableau Kanban avec les colonnes :

À cibler
Candidature envoyée
Entretien
Test
Offre
Refusée

Permettre de déplacer une candidature d'une colonne à une autre.

Détail d'une candidature

Créer une page ou une modal affichant :

Informations de l'entreprise

Intitulé du poste

URL de l'offre

Date de candidature

Statut

Salaire

Notes

Historique des changements de statut

Prochaine action

Date de relance

Permettre de modifier et supprimer une candidature.

Paramètres

Créer une page permettant de modifier :

Nom

Email

Préférences d'affichage

Mode clair/sombre

2. Données

Créer une structure de données permettant de stocker les candidatures.

Une candidature doit contenir au minimum :

id
company
position
location
contract_type
salary
job_url
application_date
status
notes
next_action
follow_up_date
created_at
updated_at

Prévoir plusieurs données fictives afin que l'interface soit immédiatement démontrable.

3. Fonctionnalités

Implémenter réellement :

Création d'une candidature

Modification

Suppression

Recherche

Filtres

Tri

Changement de statut

Vue Kanban

Calcul automatique des statistiques du dashboard

Responsive desktop/tablette/mobile

Mode clair/sombre

4. UX

Ajouter :

États vides

États de chargement

Messages de confirmation

Messages d'erreur

Confirmation avant suppression

Validation des formulaires

L'application doit être utilisable sans explication particulière.

5. Architecture

Utiliser une architecture propre et maintenable.

Séparer :

composants UI

pages

logique métier

gestion des données

types/interfaces

services

Ne pas mettre toute la logique dans un seul fichier.

Avant d'implémenter une fonctionnalité complexe, privilégier une solution simple et robuste.

6. Important

Je veux que tu construises d'abord une version fonctionnelle complète du MVP.

Ne rajoute pas de fonctionnalités non demandées.

À la fin, indique clairement :

les technologies utilisées ;

la structure des fichiers ;

les fonctionnalités réellement implémentées ;

les éventuelles limitations ;

les prochaines améliorations possibles.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://jobee-flow.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/f397b579-7a3e-470c-a6ec-b0c22b7ec2fd).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
