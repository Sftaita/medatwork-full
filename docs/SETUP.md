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

---

## Démarrage avec Docker (option dev rapide)

Le projet inclut un `docker-compose.yml` qui lance backend + frontend + mailpit en un seul appel. Le backend se connecte à ta DB WAMP locale.

### Prérequis
- Docker Desktop installé et démarré
- WAMP en cours d'exécution (MySQL sur le port 3306)

### Démarrage

```bash
docker compose up -d
```

Les services démarrent sur :
| Service | URL |
|---|---|
| Frontend React (Vite) | http://localhost:3000 |
| Backend Symfony | http://localhost:8000 |
| Mailpit (emails dev) | http://localhost:8025 |

Le backend exécute automatiquement au démarrage :
1. `composer install`
2. `lexik:jwt:generate-keypair --skip-if-exists`
3. `doctrine:migrations:migrate`
4. `symfony serve --no-tls --port=8000 --allow-all-ip`

### Configuration Docker → DB WAMP

Dans `docker-compose.yml`, le backend pointe sur ta DB WAMP via `host.docker.internal` :

```yaml
DATABASE_URL: mysql://root:@host.docker.internal:3306/medcligmedatwork?serverVersion=8.0&charset=utf8mb4
extra_hosts:
  - "host.docker.internal:host-gateway"
```

### Problèmes fréquents Docker

#### Migrations échouent au boot
Si une migration tente d'altérer une table qui n'existe pas encore :
```bash
# Marquer manuellement une migration comme exécutée sans la jouer
docker exec medatwork_backend php bin/console doctrine:migrations:version "DoctrineMigrations\VersionXXX" --add --no-interaction
docker exec medatwork_backend php bin/console doctrine:migrations:migrate --no-interaction
```

#### JWT Token invalide (Unable to create a signed JWT)
Les clés `.pem` du volume sont incompatibles avec la passphrase Docker. Régénérer :
```bash
docker exec medatwork_backend sh -c 'rm -f config/jwt/private.pem config/jwt/public.pem && php bin/console lexik:jwt:generate-keypair --no-interaction'
```

#### 401 — Utilisateur non trouvé
Le backend Docker utilise la DB WAMP (`medcligmedatwork`). Utilise un compte qui y existe déjà.
Pour réinitialiser un mot de passe directement :
```bash
docker exec medatwork_backend php -r "
\$pdo = new PDO('mysql:host=host.docker.internal;dbname=medcligmedatwork;charset=utf8mb4','root','');
\$hash = password_hash('NouveauMDP!', PASSWORD_BCRYPT, ['cost'=>13]);
\$stmt = \$pdo->prepare('UPDATE manager SET token=NULL, validated_at=NOW(), password=? WHERE email=?');
\$stmt->execute([\$hash, 'ton@email.be']);
echo 'rows: '.\$stmt->rowCount();
"
```

*Document créé le 2026-03-20 — Dernière mise à jour : 2026-04-04*
