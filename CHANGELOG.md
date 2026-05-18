# CHANGELOG — Medatwork

Historique des modifications par version. Format : `[version] — date` avec catégories **Ajouts**, **Corrections**, **Infrastructure**.

---

## [3.6.x] — 2026-05 (en cours)

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
