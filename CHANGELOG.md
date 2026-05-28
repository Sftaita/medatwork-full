# CHANGELOG — Medatwork

Historique des modifications par version. Format : `[version] — date` avec catégories **Ajouts**, **Corrections**, **Infrastructure**.

---

## [3.8.0] — 2026-05-22 → 2026-05-28

### Ajouts
- **Landing page — refonte complète**
  - **Nouveau Hero** : headline *"Le planning des MACCs, enfin sans tableurs."*, eyebrow, stats meta (12 fonctionnalités / 3 rôles / PWA / FR·NL·EN), visuel Gantt avec badge et pill flottants (animations CSS `floatY / floatBadge / floatPill`)
  - **MarqueeStrip** : ticker horizontal infini des 12 fonctionnalités (fond sombre, boucle CSS `translateX(-50%)`, pause au survol, masques de fondu)
  - **Sections** : `TrustBar`, `Audiences`, `FeaturePlanning`, `FeatureEncodage`, `FeatureAnnees`, `WorkflowSection`, `FeatureGrid12`, `TechStrip`, `FinalCta` — toutes responsive mobile-first
  - **Topbar landing** : liens d'ancrage (Pour qui · Fonctionnalités · Workflow · Sécurité) dans la section gauche de la barre, visibles sur `/` non connecté uniquement ; suppression du lien "Notre service"
  - **Logo cliquable** : scroll smooth vers le haut si déjà sur `/`, sinon `navigate("/")`
  - **Scroll animé** : `scroll-behavior: smooth` global (`index.css`)
  - **Scroll ancres corrigé** : `scroll-margin-top` ajusté sur chaque section pour compenser la topbar fixe (71px desktop)
  - **Redirect utilisateurs connectés** : si `AccessToken` actif en mémoire lors de la visite de `/`, redirection automatique vers le tableau de bord du rôle (`manager → /manager/years`, `hospital_admin → /hospital-admin/dashboard`, `resident → /maccs/years`, `super_admin → /admin`)
- **Hospital Admin — création d'année** : nouvelle page dédiée `/hospital-admin/year` (`HospitalAdminYearPage`) — même design que `YearPage` (2 colonnes, live preview, counter titre), endpoint `POST /api/hospital-admin/years`, i18n `haYear.*`
- **Internationalisation complète (FR / EN / NL)** — système i18n react-i18next sur l'ensemble du frontend
  - Détection automatique de la langue (navigateur), mémorisation `localStorage`
  - `LanguageSwitcher` dans la Topbar (visiteurs non connectés)
  - Pages publiques, résidents, manager, hospital-admin — 30+ namespaces
- **Pagination admin** (client-side, `PAGE_SIZE = 25`) : managers, résidents et messages contact
- **Confirmations de suppression** : Dialogs MUI à la place de `window.confirm` dans `AdminContactPage`

### Corrections
- **AdminContactPage** : `useAxiosPrivate()` manquant → 401 silencieux corrigé
- **`WeekScheduleTable`** : prop `title` optionnelle
- **Bar chart statistiques** : clés neutralisées pour éviter conflits i18n
- **Suite de tests AdminContactPage** : 14 cas ajoutés
- **Timer / Absence — pickers MUI** : remplacement des `input[type=date/time]` natifs par `DatePicker` + `TimePicker` de `@mui/x-date-pickers` (locale FR, format DD/MM/YYYY, ouverture au clic sur toute la zone) — la valeur formatée est correctement affichée via la prop `value` du slot textField (régression corrigée : `value` top-level, pas via `inputProps`)
- **Absence — stockage date** : les dates passées à `TDateField` sont maintenant des chaînes YYYY-MM-DD (non plus des objets dayjs) pour éviter un double-wrapping `dayjs(dayjsObj)` qui invalidait la valeur affichée
- **Tests Timer/Absence** : mocks des composants MUI remplacés par des inputs simples (`fireEvent.change` compatible) ; ajout de `timerUi.test.tsx` (tests `fmtHM`, `TToggle`, `TSelect`, `TDateTimeField`, `TDateField` — dont régression affichage valeur)

### Infrastructure
- Bump version `3.7.0 → 3.8.0` (VersionController, package.json, Footer)

---

## [3.7.0] — 2026-05-18

### Ajouts
- **Super-admin — Messages contact** (`/admin/contact`) : nouvelle page de gestion des messages reçus via le formulaire public
  - Onglet "Messages" : tableau filtrable (tous / non traités / traités), modal de lecture complète, marquage "Traité" (avec horodatage + nom du traitant), suppression
  - Onglet "Destinataires CC" : configuration des adresses copiées à chaque soumission (ajout, activation/désactivation, suppression)
  - Badge "X non traités" en temps réel dans l'entête de la page
- **Formulaire contact — persistance** : chaque soumission est désormais enregistrée en base (`contact_message`) et visible dans le back-office
- **Formulaire contact — CC** : `MailerController.sendEmail` supporte un paramètre `$ccList[]` ; les CCs actifs sont automatiquement inclus à chaque envoi
- **Formulaire contact — sécurité** : rate limiting 5 messages/heure/IP, template Twig échappé (`|e`), longueur max 5 000 chars, trim côté DTO
- **Formulaire contact — UX** : `await` ajouté (succès ne s'affichait jamais en cas d'erreur), bouton "Envoi…" pendant la requête, compteur 0/5 000, fautes de frappe corrigées
- **Page contact — espacement** : centrage vertical viewport + `minHeight` calqués sur le pattern LoginPage
- **Tests** : `AuthenticationSuccessListenerTest` (6 cas), `AdminControllerTest` (4 cas avatarUrl), `AdminManagersPage` + `AdminResidentsPage` (2 cas avatar chacun)

### Corrections
- **Photo de profil — prod (bug critique)** : URLs `/uploads/avatars/{file}` non servies par Apache (Hostinger) → uniformisation sur le proxy `/api/profile/avatar/{token}` dans `AuthenticationSuccessListener`, `ProfileAccountController`, `AdminController`
- **Photo de profil — reconnexion AppAdmin** : `avatarUrl: null` hardcodé → `buildAvatarUrl(getAvatarPath())`
- **Tableau managers / résidents (admin)** : `avatarUrl` absent des réponses API → ajouté + type `AdminResident` mis à jour
- **Sidebar surlignage admin** : flag `exact` sur `/admin` — plus de double surlignage Hôpitaux + Années

### Infrastructure
- Migration `Version20260518200000` — tables `contact_message` et `contact_cc_config`
- Bump version `3.6.0 → 3.7.0` (VersionController, package.json, Footer)

---

## [3.6.0] — 2026-05-17/18

### Ajouts
- **AppAdmin** : upload et suppression de photo de profil (AppAdmin)
- **Mobile — menu utilisateur** : avatar cliquable dans la Topbar mobile, ouvre le menu Compte / Préférences / Déconnexion
- **Mobile — sidebar** : photo de profil, nom et rôle affichés en bas de la sidebar mobile

### Corrections
- **Backend critique** : recréation de la table `refresh_tokens` (manquante → 500 sur `/api/token/refresh` au chargement)
- **Backend schéma** : migration `Version20260518100000` — resync complet DB/entités Doctrine (FK `communication_message`, renommages colonnes `hrid_at→hridat`, index, types `DATETIME`)
- **Build** : retrait `@fullcalendar/resource*` du chunk manuel Vite (erreur de build)
- **Config prod** : `.env.production` pointe vers `api-link.medatwork.be` (était `api-v2`)
- **Sidebar — badge notifications** : compteur affiché inline dans le bouton (corrige décalage à droite en mode expanded)
- **Sidebar — badge MACCS** : exclusion du `commUnreadCount` du badge MACCS Notification (évitait un faux positif dû aux messages de communication non visibles sur la page)
- **Sidebar MACCS** : suppression de l'entrée "Paramètres" et son icône (page obsolète)
- **Sidebar — surlignage admin** : ajout flag `exact` sur `/admin` (Hôpitaux) — évite le double surlignage Hôpitaux + Années lors de la navigation sur `/admin/*`

### Infrastructure
- Nettoyage de 74 migrations redondantes
- Suppression route `api-v2` (backend)

---

## [3.5.0] — 2026-04

### Ajouts
- **Préférences utilisateur** : système de paramètres persistés côté serveur (thème, densité, langue…)
- **Recherche Topbar Admin** : recherche sur `/admin`, `/admin/years`, `/admin/managers` et `/admin/residents`
- **PWA** : bannière d'installation persistante + `skipWaiting` pour les mises à jour
- **Exports RH — HRID** : modal guidé pour les erreurs HRID manquants (couleur info bleue, bouton outlined)
- **API** : endpoint public `GET /api/version`

### Corrections
- **Sentry** : correction des 5 issues actives + tests
- **Deploy** : `ROOT_DIR` absolu dans le script de déploiement, vérification migrations avant/après
- **Deploy** : `VersionController.php` comme source de vérité pour la version (synchronisé avec `package.json`)

### Infrastructure
- Script de déploiement automatisé documenté
- Documentation mise à jour (ARCHITECTURE, ENTITIES, AUDIT)

---

## [3.4.0 → 3.4.1] — 2026-04

### Ajouts
- **Staff Planner — Phase 1 V2** : dirty flag + fingerprint SHA-256 par snapshot
- **Staff Planner — Phase 2** : export batch immuable + snapshots
- **Staff Planner — Phase 3** : historique exports RH + consultation snapshots
- **Staff Planner — Phase 4** : Diff Viewer RH enterprise
- **Staff Planner — Phase 5** : Lock RH / Clôture officielle
- **Staff Planner — Phase 6** : Audit Timeline RH enterprise
- **Managers** : notification + email lors de l'octroi du droit `canCreateYear`
- **UI** : design system tableaux — densité, tri colonnes, filter chips, sidebar détail

### Corrections
- **Validation** : `PeriodLockedException` → HTTP 422
- **Résident** : `dateOfMaster` nullable (suppression placeholder `1900-01-01`)
- **Prod** : 3 bugs prod + timer `called=null`
- **Staff Planner** : suppression workflow legacy cassé

---

## [3.2.0 → 3.3.0] — 2026-04

### Ajouts
- **Semaines modèles** : timeline horizontale (tous les jours en une vue), scroll horizontal, bouton aide + tutoriel
- **Exports RH** : session 24 — semaines modèles intégrées aux exports
- **Admin** : suppression manager avec email de notification + gestion FK
- **Activation** : liens prefetch-safe (POST), support `canCreateYear`, page succès UI

### Corrections
- **Admin** : suppression manager (FK `HospitalRequest`), renvoi email activation
- **Bugs** : resend-activation envoyait mauvais lien manager, realtime invisible pour HospitalAdmin
- **Routing** : `/manager/realtime` ajouté dans `HospitalAdminRoute`

---

## [3.1.0] — 2026-03

### Ajouts
- **Calendrier** : 9 améliorations (extendedProps, état dérivé, persistance, confirmation suppression)
- **Week Creator** : redesign UI + accès hospital-admin
- **Realtime** : bouton Excel par résident + spinner pendant téléchargement
- **Managers / MACCS** : statuts distincts + photo de profil dans les listes
- **Hospital Admin** : suppression forcée d'une année (avec données + notifications email), vue liste/grille dashboard
- **Super Admin** : journal d'audit `/admin/logs`
- **Avatar** : upload photo de profil sur les 4 formulaires d'inscription

### Corrections
- **Calendrier** : audit complet — 10 bugs corrigés
- **Year Delete** : FK manquantes dans `YearForceDeleteService`, remplacement DQL→DBAL raw SQL
- **Hospital Admin** : correction 500 force-delete
- **Excel** : correction bug génération + logging
- **CSP** : wildcard `*.medatwork.be` + ajout `api-v2.medatwork.be` et Sentry ingest

---

## [3.0.0] — 2026-03

### Ajouts
- **Communication** : édition/suppression messages, marquer-non-lu, filtres audit, pagination notifications
- **Profil** : système photo de profil + crop d'image, fix URL avatars en production
- **Hospital Admin** : audit complet + nouvelles fonctionnalités + audit-log avec modal explicatif
- **Admin** : promotion manager→HospitalAdmin, association managers↔hôpital, emails redesign
- **Timer** : remplacement Select pause/scientifique par NumberInput
- **Onboarding** : hint première connexion pour la photo de profil
- **Conformité légale** : documentation et système de conformité

### Corrections
- **Auth** : manager avec `adminHospital` redirigé vers `/hospital-admin/dashboard`
- **Sécurité** : defense-in-depth sur `fetchManagers`
- **Timer** : date-time pickers full width (troncature PC)
- **Email** : délivrabilité anti-spam
- **PWA** : déplacement bouton Installer après connexion
- **Avatar prod** : endpoint Symfony pour contourner CDN Hostinger

### Infrastructure
- Fusion monorepo : `backend/` et `frontend/` intégrés au dépôt racine
- Stack : Symfony 7.4 + React 17 + MUI 5 + FullCalendar 6 + JWT + Sentry

---

## Versions antérieures (< 3.0)

Développement initial — non documenté formellement dans ce fichier. Voir `git log` pour l'historique complet.
