# ListeCourse — mise en route

Application mobile (Expo / React Native) + backend Supabase pour la liste de
courses partagée en foyer, conforme à la maquette validée.

## 1. Provisionner Supabase

1. Créez un projet sur [supabase.com](https://supabase.com) (offre gratuite suffisante pour démarrer).
2. Dans **SQL Editor**, exécutez dans l'ordre les fichiers de `supabase/migrations/` :
   - `20260824000000_init.sql` — schéma, RLS, realtime, bucket photos.
   - `20260824000001_seed_catalog.sql` — fonction de catalogue initial (appelée
     automatiquement à la création d'un foyer, voir plus bas).
   (Si vous utilisez la Supabase CLI : `supabase db push` depuis la racine du projet.)
3. Dans **Project Settings → API**, récupérez `Project URL` et la clé `anon public`.

## 2. Configurer l'application

```bash
cp .env.example .env
```

Renseignez dans `.env` :

```
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

Ne mettez jamais la clé `service_role` dans ce fichier : seule la clé `anon`
(protégée par les policies RLS) est destinée au client.

## 3. Lancer l'app

```bash
npm install
npx expo start
```

Scannez le QR code avec Expo Go (iOS/Android), ou `npx expo start --web` pour
un aperçu rapide dans le navigateur (React Native Web).

## 4. Premier lancement

1. Créez un compte (email/mot de passe) — chaque personne du foyer a le sien.
2. À l'écran de bienvenue, **Créer un foyer** : le catalogue initial (légumes,
   fruits, épicerie, etc. — voir cahier des charges) est peuplé automatiquement,
   sans photo. Vous devenez administrateur du foyer.
3. Depuis **Administration → Catalogue**, ajoutez les photos produit par produit
   (caméra ou galerie) — la fiche produit sert aussi à créer de nouveaux produits
   ou catégories.
4. Les autres membres du foyer rejoignent avec **Rejoindre un foyer** et le code
   d'invitation (visible dans l'onglet *Plus*). Ils cochent "Je prépare aussi les
   listes" s'ils doivent voir l'écran Préparateur ; sinon ils n'ont que l'écran
   Acheteur (Courses / Historique / Plus).

## Ce qui est en place

- Isolation stricte des données par foyer (RLS Postgres).
- Écran Préparateur : sélection en un clic, sauvegarde automatique à chaque
  tape (pas de bouton "enregistrer" requis pour ne rien perdre), recherche,
  ajout d'un produit hors catalogue, bouton "Enregistrer la liste".
- Écran Acheteur : cases à cocher, synchronisation **temps réel** (Supabase
  Realtime) entre tous les téléphones du foyer, "Acheté par …", barre de
  progression, "Terminer la liste" (même si tout n'est pas acheté).
- Une liste par jour par foyer, jamais supprimée (voir `get_or_create_today_list`
  côté SQL) → Historique.
- Administration complète du catalogue : catégories (ajout, icône, ordre via
  flèches, actif/inactif, suppression si vide) et produits (photo caméra/galerie
  avec aperçu, catégorie, ordre, prioritaire, actif/inactif, suppression) —
  visible immédiatement côté utilisateurs (pas de nouvelle version d'app requise).
- Produit sans photo → placeholder propre (jamais de crash).

## Ce qui n'est pas encore fait (prochaines étapes)

- **Notifications push** : le schéma et les statuts de liste (`brouillon` →
  `a_acheter` → `traitee`) sont en place pour les déclencher, mais l'envoi
  réel (Edge Function Supabase + Expo Push / FCM / APNs) n'est pas câblé.
- **Glisser-déposer** pour réordonner produits/catégories : remplacé pour l'instant
  par des flèches haut/bas (résultat identique, geste moins fluide).
- **Mode hors-ligne avancé** : Supabase gère déjà la reconnexion, mais il n'y a
  pas encore de file d'attente locale explicite pour les actions faites sans
  réseau.
- **Quantité / note par article** (facultatif dans le cahier des charges) : pas
  encore dans l'UI, la colonne `quantity`/`note` existe déjà côté `list_items`.
- Gestion des membres du foyer (changer un rôle, retirer un appareil) : possible
  en base (RLS déjà en place) mais pas encore d'écran dédié.

## Structure du projet

```
app/                 écrans (Expo Router — file-based routing)
  preparateur.tsx     Profil 1
  (buyer)/            Profil 2 — Courses / Historique / Plus (onglets)
  admin/              Catalogue / Catégories / fiche produit
components/          composants UI réutilisables
lib/                 client Supabase, thème, hooks de données
supabase/migrations/ schéma SQL + policies RLS + fonctions
```
