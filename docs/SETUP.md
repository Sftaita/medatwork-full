# Guide d'Installation — Medatwork

## Prérequis

| Outil | Version Minimale | Notes |
|-------|-----------------|-------|
| PHP | 8.0+ | Extensions : `pdo_mysql`, `openssl`, `intl`, `mbstring` |
| Composer | 2.x | |
| Node.js | 16+ | |
| npm | 8+ | |
| MySQL | 5.7+ ou 8.0 | |
| Apache | 2.4+ | Avec `mod_rewrite` activé |
| Symfony CLI | Dernière | Pour `symfony serve` et `symfony console` |

---

## Installation Backend

### 1. Cloner et Installer les Dépendances

```bash
cd backend
composer install
```

### 2. Configurer l'Environnement

Créer le fichier `.env.local` (NON versionné) :

```bash
cp .env .env.local
```

Éditer `.env.local` avec vos valeurs réelles :

```dotenv
APP_ENV=dev
APP_SECRET=<générer avec: openssl rand -hex 32>

DATABASE_URL="mysql://root:@127.0.0.1:3306/medcligmedatwork"

# SendGrid — obtenir une clé sur sendgrid.com
MAILER_DSN=sendgrid://<VOTRE_CLE_API>@default
SENDGRID_API_KEY=<VOTRE_CLE_API>

# JWT — générer une passphrase sécurisée
JWT_PASSPHRASE=<générer avec: openssl rand -base64 64>
JWT_SECRET_KEY=%kernel.project_dir%/config/jwt/private.pem
JWT_PUBLIC_KEY=%kernel.project_dir%/config/jwt/public.pem

# CORS
CORS_ALLOW_ORIGIN=http://localhost:3000
```

### 3. Générer les Clés JWT

```bash
symfony console lexik:jwt:generate-keypair
```

Ceci crée :
- `config/jwt/private.pem`
- `config/jwt/public.pem`

Ces fichiers sont dans `.gitignore` — ne jamais les committer.

### 4. Créer la Base de Données

```bash
symfony console doctrine:database:create
symfony console doctrine:migrations:migrate
```

### 5. Démarrer le Serveur

```bash
symfony serve
```

L'API sera disponible sur `http://localhost:8000`

---

## Installation Frontend

### 1. Installer les Dépendances

```bash
cd frontend
npm install
```

### 2. Configurer l'URL de l'API

Éditer `src/config.js` :

```javascript
export const API_URL = "http://localhost:8000/api/";
```

> **Note :** À terme, utiliser une variable d'environnement React `.env` :
> ```
> REACT_APP_API_URL=http://localhost:8000/api/
> ```

### 3. Démarrer l'Application

```bash
npm start
```

L'application sera disponible sur `http://localhost:3000`

---

## Variables d'Environnement — Référence Complète

### Backend (`backend/.env`)

| Variable | Description | Exemple |
|----------|-------------|---------|
| `APP_ENV` | Environnement (`dev`/`prod`) | `dev` |
| `APP_SECRET` | Secret Symfony (32 chars hex) | `openssl rand -hex 32` |
| `DATABASE_URL` | URL de connexion MySQL | `mysql://root:@127.0.0.1:3306/medcligmedatwork` |
| `MAILER_DSN` | Configuration SMTP/SendGrid | `sendgrid://API_KEY@default` |
| `SENDGRID_API_KEY` | Clé API SendGrid | `SG.xxx...` |
| `JWT_PASSPHRASE` | Passphrase des clés JWT (>32 chars) | `openssl rand -base64 64` |
| `JWT_SECRET_KEY` | Chemin clé privée JWT | `%kernel.project_dir%/config/jwt/private.pem` |
| `JWT_PUBLIC_KEY` | Chemin clé publique JWT | `%kernel.project_dir%/config/jwt/public.pem` |
| `CORS_ALLOW_ORIGIN` | Origine autorisée CORS | `http://localhost:3000` |

### Frontend (`frontend/src/config.js`)

| Variable | Description |
|----------|-------------|
| `API_URL` | URL de base de l'API backend |

---

## Commandes Utiles

### Backend

```bash
# Vider le cache
symfony console cache:clear

# Créer une migration après modification d'entité
symfony console doctrine:migrations:diff

# Appliquer les migrations
symfony console doctrine:migrations:migrate

# Rollback une migration
symfony console doctrine:migrations:execute --down 'App\Migrations\VersionXXX'

# Vérifier la config Symfony
symfony console debug:config

# Lister les routes
symfony console debug:router

# Régénérer les clés JWT
symfony console lexik:jwt:generate-keypair --overwrite

# Lancer les tests
php bin/phpunit
```

### Frontend

```bash
# Démarrer en développement
npm start

# Build de production
npm run build

# Lancer les tests
npm test

# Analyser les dépendances
npm audit

# Corriger les vulnérabilités auto
npm audit fix
```

---

## Configuration Apache (Production)

Le fichier `backend/public/.htaccess` gère déjà la réécriture pour Symfony.

Pour le frontend React (SPA), `frontend/public/.htaccess` :

```apache
Options -MultiViews
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteRule ^ index.html [QSA,L]
```

---

## Problèmes Fréquents

### `The key pair is missing`
Régénérer les clés JWT :
```bash
cd backend
symfony console lexik:jwt:generate-keypair
```

### `Access to XMLHttpRequest blocked by CORS policy`
Vérifier `CORS_ALLOW_ORIGIN` dans `.env.local` — doit correspondre exactement à l'URL du frontend (sans slash final).

### `SQLSTATE[HY000] [1049] Unknown database`
La base de données n'existe pas encore :
```bash
symfony console doctrine:database:create
```

### `JWT Token not found`
Le token n'est pas envoyé dans le header `Authorization: Bearer <token>`. Vérifier `useAxiosPrivate.js` côté frontend.

### L'email ne part pas en dev
Vérifier la clé SendGrid dans `.env.local`. En dev, vous pouvez utiliser Mailtrap :
```dotenv
MAILER_DSN=smtp://username:password@sandbox.smtp.mailtrap.io:2525
```

---

*Document créé le 2026-03-20*
