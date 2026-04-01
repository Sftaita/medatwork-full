# Guide de Sécurité — Medatwork

**Dernière mise à jour :** 2026-04-03

## Principes Généraux

Ce document décrit les pratiques de sécurité à respecter sur ce projet, ainsi que les failles identifiées lors de l'audit initial (2026-03-20) et leur état de correction.

---

## Règles Absolues (Non Négociables)

### Tokens et Cryptographie
```php
// INTERDIT
$token = md5(uniqid());
$token = sha1(time());
$token = base64_encode(rand());

// OBLIGATOIRE
$token = bin2hex(random_bytes(32));       // Token URL-safe 64 chars hex
$token = base64_encode(random_bytes(32)); // Token Base64
```

### SSL / TLS
```php
// INTERDIT — même en développement
CURLOPT_SSL_VERIFYPEER => false,
CURLOPT_SSL_VERIFYHOST => 0,

// CORRECT — utiliser les certificats système
CURLOPT_SSL_VERIFYPEER => true,
CURLOPT_SSL_VERIFYHOST => 2,
```

### Variables d'Environnement
- Ne **jamais** committer `.env` avec de vraies valeurs
- Utiliser `.env.local` pour les overrides locaux (non versionné)
- En production : utiliser les variables d'environnement du serveur

### Code de Débogage
```php
// INTERDIT en production
dd($variable);
var_dump($variable);
die();
exit();

// CORRECT — utiliser le logger
$this->logger->debug('Variable value', ['var' => $variable]);
```

### Validation des Entrées
```php
// INTERDIT — raw json_decode sans validation
$data = json_decode($request->getContent(), true);
$email = $data['email']; // pas de vérification

// OBLIGATOIRE — utiliser un DTO typé
try {
    $dto = MonDTO::fromRequest($request);
} catch (\InvalidArgumentException $e) {
    return new JsonResponse(['message' => $e->getMessage()], 400);
}
```

### Sérialisation des Entités Doctrine
```php
// INTERDIT — référence circulaire possible (Manager → notifications → Manager → ...)
return $this->json(['notifications' => $notifications]);

// OBLIGATOIRE — array_map explicite avec uniquement les champs nécessaires
$data = array_map(fn (NotificationManager $n) => [
    'id'        => $n->getId(),
    'body'      => $n->getBody(),
    'read'      => $n->getIsRead(),
    'createdAt' => $n->getCreatedAt()->format(\DateTimeInterface::ATOM),
], $notifications);
return $this->json($data);
```

---

## État des Failles (2026-04-03)

### [C1] Tokens Cryptographiquement Faibles — ✅ CORRIGÉ

**Tous les `md5(uniqid())` remplacés par `bin2hex(random_bytes(32))` dans :**
- `ManagersAPIController` — registration manager
- `PublicAPIController` — registration résident
- `ResetPasswordToken` service — reset de mot de passe
- `ActivationTokenEncoder` event subscriber — activation de compte
- `YearsManagerSubscriber` — création d'année (token unique)

---

### [C2] SSL Désactivé dans CustomSendGrid — ✅ CORRIGÉ

Options cURL dangereuses supprimées de `CustomSendGrid.php`. SendGrid gère son propre SSL.

---

### [C3] JWT Passphrase — ⚠️ ACTION MANUELLE REQUISE

Vérifier que `JWT_PASSPHRASE` dans `.env.local` fait au moins 32 caractères aléatoires :
```bash
openssl rand -base64 64
```

---

### [C4] Secrets Exposés — ⚠️ ACTION MANUELLE REQUISE

Si le fichier `.env` a été commité avec de vraies clés : révoquer et régénérer immédiatement les clés SendGrid et la passphrase JWT.

---

### [M1] Endpoint `/api/fetchManagers` sans Auth — ✅ CORRIGÉ

`/api/fetchManagers` sécurisé avec `ROLE_MANAGER` dans `security.yaml`.

---

### [M2] Tokens d'Activation Sans Expiration — ✅ CORRIGÉ (2026-04-03)

Les tokens d'activation expirent désormais après **48 heures** dans tous les points d'entrée :
- `PublicAPIController::createNewResident` — `(new DateTime(...))->modify('+48 hours')`
- `ManagersAPIController::createNewManager` — idem
- `TokenActivationController::resendActivation` — idem

`TokenActivationController` vérifie l'expiration lors de la vérification du token et redirige vers `/token-expired` si expiré.

---

### [M5] Énumération des Utilisateurs — ✅ CORRIGÉ (2026-04-03)

Les endpoints d'inscription retournaient des réponses différentes selon que l'email était déjà enregistré, permettant d'énumérer les comptes existants.

**Correction :** `PublicAPIController` et `ManagersAPIController` retournent toujours `{"message": "ok"}` avec HTTP 200, quelle que soit l'existence de l'email.

---

### [M6] Mailer Fatal sur Inscription — ✅ CORRIGÉ (2026-04-03)

Une exception SMTP lors de l'envoi de l'email d'activation déclenchait une HTTP 500, bloquant la création de compte.

**Correction :** les trois contrôleurs enveloppent `$this->mailer->sendEmail(...)` dans `try { } catch (\Throwable) { }`. L'échec email est non-fatal — l'utilisateur peut redemander un lien via `/api/resend-activation`.

---

### [M7] Pas de mécanisme de renvoi d'activation — ✅ CORRIGÉ (2026-04-03)

Si l'email d'activation n'arrivait pas (SMTP failure, spam), l'utilisateur était bloqué sans recours.

**Correction :** nouvel endpoint `POST /api/resend-activation` (public, rate-limité) :
- Valide l'adresse email (format)
- Génère un nouveau token `bin2hex(random_bytes(32))` + expiration +48h
- Envoie l'email d'activation
- Retourne toujours `{"message": "ok"}` (pas d'énumération)

**Frontend :** `SuccessRegisterPage` et `TokenExpiredPage` proposent un bouton de renvoi avec gestion des états `idle / loading / done / error`.

---

### [m1] Code de Débogage dans les Contrôleurs — ✅ CORRIGÉ

Tous les `dd()`, `die()`, `exit()` dans les contrôleurs remplacés par des `JsonResponse` appropriées.

**`dd()` restants dans les services (à corriger) :**
- `Services/ManagerMonthValidation/GetMonthStatus.php`
- `Services/StaffPlanner/CheckResidentResources.php`
- `Services/YearsManagement/UpdateYear.php`

---

### [m2] Validation JSON Insuffisante — ✅ CORRIGÉ (2026-03-22)

**19 DTOs** créés avec validation stricte et typage PHP 8.1 :

| DTO | Endpoint(s) |
|-----|-------------|
| `TimesheetInputDTO` | Création/mise à jour feuille de temps |
| `GardeInputDTO` | Création garde résident |
| `AbsenceInputDTO` | Création absence résident |
| `ValidationBatchInputDTO` | Validation batch gardes/absences/timesheets |
| `MonthValidationStatusInputDTO` | Validation mensuelle |
| `YearResidentStatusInputDTO` | Statut résident-année |
| `PasswordResetRequestInputDTO` | Demande reset mot de passe |
| `PasswordResetWithTokenInputDTO` | Reset avec token |
| `ResidentRegistrationInputDTO` | Inscription résident |
| `YearTokenInputDTO` | Rejoindre une année |
| `ContactMessageInputDTO` | Message de contact |
| `WeekTemplateInputDTO` | Création/maj template hebdo |
| `WeekTaskInputDTO` | Création/maj tâche hebdo |
| `IntegerIdsInputDTO` | Tableaux d'IDs entiers (StaffPlanner) |
| `NewManagerInputDTO` | Inscription manager |
| `UpdateRightsInputDTO` | Mise à jour des droits manager |
| `LinkWeekTemplateInputDTO` | Liaison template ↔ année |
| `AddManagerInputDTO` | Ajout manager à une année |
| `CreateYearInputDTO` | Création d'une année |

---

### [m3] Rate Limiting — ⚠️ PARTIELLEMENT IMPLÉMENTÉ

Actif sur :
- Inscription manager (`registerLimiter`)
- Reset de mot de passe (`passwordResetLimiter`)

Manquant sur :
- Login (`/api/login_check`)
- Refresh token (`/api/token/refresh`)

---

### [m5] Race Condition sur le Refresh Token — ✅ CORRIGÉ (2026-03-28)

Avec `single_use: true` (gesdinet), deux requêtes simultanées recevant un 401 déclenchaient deux refreshes en parallèle. Le second échouait et déconnectait l'utilisateur.

**Correction dans `useAxiosPrivate.ts` :**
```ts
let refreshPromise: Promise<string> | null = null;

if (!refreshPromise) {
  refreshPromise = refresh().finally(() => { refreshPromise = null; });
}
const newAccessToken = await refreshPromise;
```

---

### [m6] Toast d'erreur sur le polling de notifications — ✅ CORRIGÉ (2026-03-28)

Le polling de notifications toutes les 30s affichait un toast "Oups ! Une erreur s'est produite" à chaque échec réseau temporaire (comportement très intrusif).

**Correction :** flag `meta: { suppressErrorToast: true }` sur la query React Query + vérification dans le handler global de `QueryCache`.

---

## Checklist Sécurité — Avant Chaque Déploiement

```
[ ] Aucun dd(), var_dump(), die(), exit() dans le code
[ ] Aucune clé API ou mot de passe dans le code source
[ ] .env non commité avec de vraies credentials
[ ] SSL vérifié (CURLOPT_SSL_VERIFYPEER = true)
[ ] Tous les tokens générés avec bin2hex(random_bytes(32))
[ ] Tous les endpoints protégés (vérifier security.yaml)
[ ] Toutes les entrées validées via DTO (pas de json_decode nu)
[ ] Pas de $this->json($entity) avec entités liées (référence circulaire)
[ ] Messages d'erreur génériques (pas de stack trace en prod)
[ ] APP_ENV=prod en production
```

---

## Authentification JWT — Bonnes Pratiques

### Durée de Vie des Tokens
```yaml
# lexik_jwt_authentication.yaml
lexik_jwt_authentication:
    secret_key: '%env(resolve:JWT_SECRET_KEY)%'
    public_key: '%env(resolve:JWT_PUBLIC_KEY)%'
    pass_phrase: '%env(JWT_PASSPHRASE)%'
    token_ttl: 3600  # 1 heure — ne pas mettre > 24h
```

### Refresh Token
- Durée de vie : 1 mois maximum
- Stocké en cookie `HttpOnly` + `SameSite=Strict`
- Invalider à la déconnexion
- `single_use: true` activé → chaque token n'est utilisable qu'une seule fois

### Révocation
En cas de compromission d'un compte :
1. Invalider le refresh token en base
2. Changer la JWT_PASSPHRASE invalide TOUS les JWT actifs (option nucléaire)

---

## Gestion des Mots de Passe

Symfony gère automatiquement le hachage via `UserPasswordHasherInterface`. Ne jamais :
- Stocker un mot de passe en clair
- Utiliser MD5 ou SHA1 pour les mots de passe
- Implémenter son propre algorithme de hachage

L'algorithme par défaut (`auto`) utilise `bcrypt` ou `argon2id` selon la disponibilité.

---

*Document créé le 2026-03-20 — Dernière mise à jour : 2026-04-03*
