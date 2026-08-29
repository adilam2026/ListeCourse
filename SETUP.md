# ListeCourse — mise en route

Application mobile (Expo / React Native) + backend Supabase pour la liste de
courses partagée en foyer, multi-foyers, conforme à la maquette validée.

## 1. Provisionner Supabase

1. Créez un projet sur [supabase.com](https://supabase.com) (offre gratuite suffisante pour démarrer).
2. Dans **SQL Editor**, exécutez **dans l'ordre** les fichiers de `supabase/migrations/` :
   - `20260824000000_init.sql` — schéma de base, RLS, realtime, bucket photos.
   - `20260824000001_seed_catalog.sql` — fonction de catalogue initial.
   - `20260829000000_roles_and_username_auth.sql` — rôles (admin / responsable /
     personnel), connexion par identifiant pour les comptes secondaires,
     durcissement RLS (voir §4).
   (Si vous utilisez la Supabase CLI : `supabase db push` depuis la racine du projet.)
3. Dans **Project Settings → API**, récupérez `Project URL` et la clé publique
   (`anon` / `publishable`).

## 2. Configurer l'application

```bash
cp .env.example .env
```

Renseignez dans `.env` :

```
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

Ne mettez jamais la clé `service_role`/`secret` dans ce fichier : seule la clé
publique (protégée par les policies RLS) est destinée au client.

## 3. Déployer les Edge Functions (obligatoire)

La création de compte, la réinitialisation de mot de passe et la suppression
d'un utilisateur secondaire (§4) passent par 3 Edge Functions Supabase — elles
seules ont le droit de créer/modifier des comptes `auth.users`, avec le rôle
`service_role` qui ne doit jamais être exposé côté client.

```bash
npx supabase login                          # ouvre un navigateur, ou --token <access-token>
npx supabase link --project-ref <votre-ref> # ex. kznfyixoaxzyxxurbvww
npx supabase functions deploy admin-create-user
npx supabase functions deploy admin-reset-password
npx supabase functions deploy admin-delete-user
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY` et `SUPABASE_SERVICE_ROLE_KEY` sont
injectées automatiquement par la plateforme dans chaque fonction — rien à
configurer manuellement.

## 4. Lancer l'app

```bash
npm install
npx expo start
```

Scannez le QR code avec Expo Go (iOS/Android), ou `npx expo start --web` pour
un aperçu rapide dans le navigateur (React Native Web).

## 5. Premier lancement — modèle d'authentification

L'app distingue deux façons de se connecter, choisies sur l'écran d'accueil :

- **« Créer un nouveau foyer »** — réservé à la personne qui met en place le
  foyer. Elle saisit prénom, email, mot de passe (+ confirmation) et le nom du
  foyer. Compte email classique Supabase Auth (confirmation par email si
  activée dans le projet, mot de passe oublié standard). Elle devient
  automatiquement **Administrateur**.
- **« J'ai déjà un accès »** — pour tous les autres membres, créés PAR
  l'administrateur (Administration → Utilisateurs → *+ Ajouter un
  utilisateur*). Ils n'ont ni email ni confirmation à faire : juste le code du
  foyer + un identifiant + un mot de passe/PIN (6 caractères min.) donnés par
  l'admin. Le code du foyer est mémorisé sur l'appareil après la première
  connexion — il n'est plus redemandé ensuite.

Trois rôles : **Administrateur** (tout, y compris gérer les utilisateurs et le
catalogue), **Responsable du foyer** (courses, cocher/décocher, clôturer,
historique), **Personnel de maison** (écran Préparateur uniquement — préparer
la liste du jour, rien d'autre).

Techniquement, un membre secondaire est un vrai compte `auth.users` Supabase
(JWT, RLS, session inchangés) avec un email synthétique dérivé de façon
déterministe (`<identifiant>@<household_id>.listecourse.internal`), que le
client ne manipule jamais directement — il passe par la fonction SQL
`resolve_login_email()`.

## Sécurité — ce qui est vérifié côté serveur (pas seulement l'UI)

- Chaque table (`categories`, `products`, `shopping_lists`, `list_items`,
  `household_members`…) est protégée par RLS : toute requête est filtrée par
  `household_id` + appartenance de l'utilisateur courant (`auth.uid()`).
- `is_household_admin()`/`is_household_member()` vérifient aussi `active =
  true` : un compte désactivé par l'admin perd l'accès immédiatement, même
  avec une session déjà ouverte.
- Créer/réinitialiser/supprimer un compte secondaire exige le `service_role`
  (Edge Functions) — chaque fonction revérifie côté serveur que l'appelant est
  bien admin actif du foyer ciblé, avant toute action. Un rôle envoyé par le
  client n'est jamais pris pour argent comptant.
- Aucune auto-inscription directe dans un foyer n'est possible : la seule
  policy qui le permettait a été supprimée (migration `20260829000000`).

## Ce qui est en place

- Isolation stricte des données par foyer (RLS Postgres), multi-foyers dès
  le départ.
- Auth multi-rôles (§5) : admin (email), responsable et personnel
  (identifiant/mot de passe créés par l'admin).
- Administration → Utilisateurs : lister, ajouter, changer le rôle,
  activer/désactiver, réinitialiser le mot de passe, supprimer l'accès.
- Écran Préparateur : sélection en un clic, sauvegarde automatique à chaque
  tape, recherche, ajout d'un produit hors catalogue, bouton "Enregistrer la
  liste".
- Écran Acheteur : cases à cocher, synchronisation **temps réel** (Supabase
  Realtime), "Acheté par …", barre de progression, "Terminer la liste".
- Une liste par jour par foyer, jamais supprimée → Historique.
- Administration du catalogue : catégories (icône, ordre, actif/inactif) et
  produits (photo caméra/galerie, catégorie, ordre, prioritaire,
  actif/inactif) — visible immédiatement côté utilisateurs.
- Produit sans photo → placeholder propre (jamais de crash).

## Ce qui n'est pas encore fait (prochaines étapes)

- **Notifications push** : les statuts de liste (`brouillon` → `a_acheter` →
  `traitee`) sont en place pour les déclencher, mais l'envoi réel (Edge
  Function + Expo Push/FCM/APNs) n'est pas câblé.
- **Glisser-déposer** pour réordonner produits/catégories : remplacé pour
  l'instant par des flèches haut/bas.
- **Mode hors-ligne avancé** : pas encore de file d'attente locale explicite
  pour les actions faites sans réseau.
- **Quantité / note par article** (facultatif) : colonnes déjà présentes côté
  `list_items`, pas encore dans l'UI.
- **Forcer la déconnexion des appareils** d'un utilisateur désactivé : le
  blocage est immédiat au niveau des données (RLS), mais la session locale de
  l'appareil n'est pas révoquée activement à distance.

## Structure du projet

```
app/                        écrans (Expo Router — file-based routing)
  login.tsx                  choix : créer un foyer / j'ai déjà un accès
  creer-foyer.tsx             inscription admin (email + nom du foyer)
  confirmez-email.tsx         écran d'attente si confirmation email active
  acces-existant.tsx          connexion foyer + identifiant + mot de passe
  preparateur.tsx              Personnel de maison
  (buyer)/                    Responsable/Admin — Courses / Historique / Plus
  admin/
    utilisateurs.tsx           liste des membres du foyer
    utilisateur/nouveau.tsx    créer un accès secondaire
    utilisateur/[id].tsx       rôle / actif / reset mot de passe / suppression
    catalogue.tsx, categories.tsx, produit/[id].tsx
components/                 composants UI réutilisables
lib/                        client Supabase, thème, hooks, adminUsers.ts
supabase/migrations/        schéma SQL + policies RLS + fonctions
supabase/functions/         Edge Functions (service_role) — gestion comptes
```
