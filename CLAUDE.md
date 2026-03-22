# CLAUDE.md — Medatwork Project

## Contexte du Projet

Medatwork est une application web de gestion de résidents médicaux (internes). Elle permet aux managers (responsables de stage) et aux résidents de gérer les plannings, gardes, absences, feuilles de temps et validations de période.

Le projet est en cours de **professionnalisation** : il a été initialement développé par un débutant et doit être modernisé avec des pratiques sécurisées, robustes et modernes.

---

## Architecture

```
Medatwork/
├── backend/       # API REST — Symfony 5.4 LTS + Doctrine + API Platform
├── frontend/      # SPA — React 17 + Material-UI + Axios
├── docs/          # Documentation du projet
└── CLAUDE.md      # Ce fichier
```

### Stack Technique
- **Backend:** Symfony 5.4, Doctrine ORM, API Platform 2.6, JWT (Lexik), MySQL
- **Frontend:** React 17, React Router v6, Axios, Material-UI 5, FullCalendar 6
- **Auth:** JWT + Refresh Token (cookies HttpOnly)
- **Email:** SendGrid via Symfony Mailer
- **Serveur:** Apache + WAMP (dev), probablement Apache en prod

### Deux Rôles Utilisateurs
- **Manager** : responsable de stage, gère les plannings et valide les périodes
- **Resident** : interne en médecine, saisit ses activités

---

## Commandes Utiles

### Backend
```bash
cd backend

# Démarrage
symfony serve

# Base de données
symfony console doctrine:migrations:migrate
symfony console doctrine:fixtures:load

# JWT (clés à générer au premier setup)
symfony console lexik:jwt:generate-keypair

# Cache
symfony console cache:clear

# Tests
symfony console test
php bin/phpunit
```

### Frontend
```bash
cd frontend

# Démarrage
npm start

# Build production
npm run build

# Tests
npm test
```

---

## Configuration Requise

### Fichiers à créer localement (NON versionnés)
- `backend/.env.local` — surcharge les variables sensibles de `.env`
- `backend/config/jwt/private.pem` — clé privée JWT (générer avec la commande ci-dessus)
- `backend/config/jwt/public.pem` — clé publique JWT

### Variables d'environnement clés
Voir `backend/.env` pour la liste complète. Ne jamais committer les valeurs réelles en production.

```
DATABASE_URL=mysql://user:password@127.0.0.1:3306/medcligmedatwork
MAILER_DSN=sendgrid://API_KEY@default
SENDGRID_API_KEY=...
JWT_PASSPHRASE=... (>32 chars aléatoires)
CORS_ALLOW_ORIGIN=https://www.medatwork.be
```

---

## Règles de Développement

### Sécurité (PRIORITÉ ABSOLUE)
- **Ne jamais** utiliser `md5(uniqid())` pour les tokens — utiliser `bin2hex(random_bytes(32))`
- **Ne jamais** désactiver la vérification SSL (`CURLOPT_SSL_VERIFYPEER => false`)
- **Ne jamais** committer le fichier `.env` avec de vraies credentials
- **Ne jamais** laisser `dd()`, `die()`, `exit()` dans le code de production
- **Toujours** valider et sanitizer les entrées utilisateur
- **Toujours** retourner des erreurs HTTP génériques (pas de détails système)

### Standards de Code
- Backend : PSR-12, injection de dépendances Symfony
- Frontend : ESLint, composants fonctionnels + hooks
- Pas de magic numbers — utiliser des constantes ou la configuration
- Gestion d'erreurs explicite, pas de `die()` ou `exit()`

### Structure Backend
- **Controllers** : uniquement routage + appel service, pas de logique métier
- **Services** : logique métier, < 300 lignes idéalement
- **Repositories** : accès données uniquement
- **Entities** : annotations Doctrine, pas de logique complexe

### Structure Frontend
- **pages/** : composants de page (routage)
- **components/** : composants réutilisables
- **hooks/** : logique réutilisable
- **services/** : appels API
- **contexts/** : état global

---

## Failles de Sécurité Connues

Voir `docs/SECURITY_AUDIT.md` pour l'audit complet.

### Critiques à corriger EN PREMIER
1. `md5(uniqid())` utilisé pour tokens d'activation/reset → remplacer par `bin2hex(random_bytes(32))`
2. SSL désactivé dans `CustomSendGrid.php` → retirer les options cURL
3. Endpoint `/api/fetchManagers` accessible sans auth → sécuriser
4. `dd()` en production dans plusieurs services/controllers → supprimer

---

## Documentation

| Fichier | Contenu |
|---------|---------|
| `docs/AUDIT.md` | Audit complet initial (2026-03-20) |
| `docs/ARCHITECTURE.md` | Architecture détaillée du système |
| `docs/SECURITY.md` | Guide de sécurité et failles connues |
| `docs/SETUP.md` | Guide d'installation et de configuration |
| `docs/ENTITIES.md` | Description du modèle de données |

---

## Conventions Git

- Branches : `feat/...`, `fix/...`, `refactor/...`, `docs/...`
- Commits : format conventionnel `type(scope): description`
- Ne jamais committer : `.env`, `*.pem`, `node_modules/`, `vendor/`
- Avant chaque PR : vérifier qu'aucun `dd()`, secret ou URL hardcodée n'est présent

---

## Contact & Contexte

- **Environnement dev :** WAMP, Windows 11, localhost
- **Base de données dev :** `medcligmedatwork` sur MySQL local
- **URL prod backend :** `https://api-link.medatwork.be`
- **URL prod frontend :** `https://www.medatwork.be`
