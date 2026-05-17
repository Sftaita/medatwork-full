# Profil utilisateur — Mon compte

**Implémenté :** 2026-05-14 (Phase 6)

---

## Distinction Mon compte / Préférences

Ces deux modules coexistent mais couvrent des périmètres distincts :

| | Mon compte (`/profile/account`) | Préférences (`/profile/settings`) |
|---|---|---|
| **Objet** | Identité de la personne | Comportement de l'interface |
| **Exemples** | Prénom, nom, spécialité, mot de passe | Thème sombre, vue calendrier, taille des tableaux |
| **Persistance backend** | Entités Doctrine (Manager, Resident…) | `UserSetting` JSON par utilisateur |
| **Sauvegarde** | Bouton explicite | Auto-save à chaque changement |
| **Accès** | Menu déroulant Topbar → "Mon compte" | Menu déroulant Topbar → "Préférences" |

> Pour la documentation des préférences, voir [USER_SETTINGS.md](./USER_SETTINGS.md).

---

## Backend

### Endpoints

| Méthode | Route | Description |
|---|---|---|
| `GET` | `/api/profile/account` | Retourne le profil de l'utilisateur authentifié (rôle-dépendant) |
| `PATCH` | `/api/profile/account` | Met à jour les champs autorisés selon le rôle |
| `PATCH` | `/api/profile/password` | Modifie le mot de passe (vérifie le mot de passe actuel) |

Accès : tous les rôles JWT authentifiés (Manager, Resident, HospitalAdmin, AppAdmin).

Contrôleur : `src/Controller/ProfileAPI/ProfileAccountController.php`

### Réponse GET — structure

```
{
  "role":      "manager" | "resident" | "hospital_admin" | "app_admin",
  "firstname": string,
  "lastname":  string,
  "email":     string,
  "avatarUrl": string | null,
  // Manager uniquement :
  "sexe": "male" | "female",
  "job":  "medical supervisor" | "human resources" | "doctor" | null,
  // Resident uniquement :
  "sexe":         "male" | "female",
  "speciality":   string | null,
  "university":   string | null,
  "dateOfMaster": "YYYY-MM-DD" | null,
  // HospitalAdmin uniquement :
  "hospitalName": string
}
```

### Champs modifiables par rôle

| Champ | Manager | Resident | HospitalAdmin | AppAdmin |
|---|---|---|---|---|
| `firstname` | ✓ (min 2, max 50) | ✓ | ✓ | ✓ |
| `lastname` | ✓ (min 2, max 70) | ✓ (max 50) | ✓ | ✓ |
| `sexe` | ✓ (`Sexe` enum) | ✓ | — | — |
| `job` | ✓ (`ManagerJob` values) | — | — | — |
| `speciality` | — | ✓ (max 100, non-nullable setter) | — | — |
| `university` | — | ✓ (max 255) | — | — |
| `dateOfMaster` | — | ✓ (YYYY-MM-DD ou null) | — | — |

### Champs volontairement non modifiables

| Champ | Raison |
|---|---|
| `email` | Changer l'email = changer le login. Nécessite un flux de vérification d'identité dédié (hors scope). |
| `roles` | Changement de rôle = opération d'administration, pas de profil. |
| `validatedAt` | Horodatage d'activation du compte — géré par le système d'invitation. |
| `status` | État du compte — géré par les admins hôpital. |
| `adminHospital` | Lien d'administration — accordé par super-admin uniquement. |
| `canCreateYear` | Droit métier — accordé par hospital-admin via endpoint dédié. |
| `password` (direct) | Uniquement via `PATCH /api/profile/password` avec vérification du mot de passe actuel. |

### Validation DTO

`src/DTO/ProfileAccountPatchInputDTO.php`

- **Taille body** : non limitée (différent des settings — les champs texte peuvent être longs).
- **Clés inconnues** : rejetées avec HTTP 400.
- **Par rôle** : les clés autorisées sont déterminées dynamiquement selon `$userType`. Envoyer un champ Resident pour un Manager retourne 400.
- **`$provided` set** : distingue explicitement "clé absente" de "clé envoyée avec valeur null". Permet de vider des champs nullable (university, dateOfMaster) sans ambiguïté.
- **`speciality`** : le setter Doctrine est `setSpeciality(string)` (non-nullable). Envoyer `null` est ignoré silencieusement — la valeur n'est pas effacée. Pour vider la spécialité, envoyer une chaîne vide (convertie en null côté DTO mais ignorée par le setter).

### `ManagerJob` enum

Valeurs acceptées pour le champ `job` :

| Valeur API | Label affiché |
|---|---|
| `"medical supervisor"` | Maître de stage |
| `"human resources"` | Ressources humaines |
| `"doctor"` | Médecin |

Le controller convertit la string en `ManagerJob::from($value)` avant `setJob()`.

### Sécurité mot de passe

`src/DTO/ProfilePasswordInputDTO.php` + `ProfileAccountController::patchPassword()`

| Règle | Détail |
|---|---|
| `currentPassword` requis | Non vide — vérifié via `UserPasswordHasherInterface::isPasswordValid()` |
| `newPassword` minimum | 8 caractères (supérieur au minimum de 6 en signup, par sécurité renforcée) |
| `newPassword` maximum | 150 caractères (limite Doctrine) |
| `confirmPassword` | Doit correspondre à `newPassword` (vérifié dans le DTO avant même d'appeler la BD) |
| Réponse succès | HTTP 204 (No Content) |
| Réponse erreur | HTTP 400 avec message explicite |
| Hash | `UserPasswordHasherInterface::hashPassword()` — Argon2i en prod |

---

## Frontend

### Fichiers

| Fichier | Rôle |
|---|---|
| `src/services/profileAccountApi.ts` | Appels HTTP : `getAccount()`, `patchAccount()`, `patchPassword()` |
| `src/hooks/useProfileAccount.ts` | React Query : `useProfileAccount`, `useUpdateProfileAccount`, `useChangePassword` |
| `src/pages/Profile/ProfileAccountPage.tsx` | Page `/profile/account` |

### `useProfileAccount`

- `queryKey: ["profile-account"]`
- `staleTime: 5 min`
- `retry: 1`
- Aucun `placeholderData` — les champs du formulaire restent vides jusqu'à la réponse.

### `useUpdateProfileAccount`

- Met à jour le cache React Query sur succès (`onSuccess: (data) => qc.setQueryData(..., data)`).
- Pas d'optimistic update — les infos personnelles nécessitent une confirmation serveur.

### `useChangePassword`

- Mutation simple sans interaction cache.
- L'erreur "Mot de passe actuel incorrect" est gérée dans le callback `onError` de la page, non dans le hook.

### Page `ProfileAccountPage`

Deux sections distinctes avec bouton de sauvegarde explicite (pas d'auto-save) :

**Section "Informations personnelles"**
- Formulaire contrôlé via `useState`, initialisé depuis le profil chargé via `useEffect`.
- Email affiché en `Chip` read-only (pas d'`<input>`).
- Champs role-spécifiques conditionnels (Select Fonction pour manager, Spécialité/Université/Date pour resident, Chip Hôpital pour hospital_admin).
- Validation frontend légère avant envoi (longueurs minimales prénom/nom).
- Feedback : `Alert` inline succès ou erreur (pas de toast).

**Section "Mot de passe"**
- 3 champs password avec toggle show/hide indépendant par champ.
- Validation frontend complète (longueur, correspondance) avant mutation.
- Erreur "mot de passe actuel incorrect" → affichée dans le `helperText` du champ courant.
- Succès → alert + réinitialisation des 3 champs.

### Navigation

Le menu déroulant de la Topbar (clic sur avatar + nom) expose :

```
Mon compte     → /profile/account
Préférences    → /profile/settings
────────────
Se déconnecter
```

---

## Tests

### Backend

| Fichier | Tests | Couverture |
|---|---|---|
| `tests/Unit/DTO/ProfileAccountPatchInputDTOTest.php` | 27 | Champs par rôle, types, sécurité, `has()` |
| `tests/Unit/DTO/ProfilePasswordInputDTOTest.php` | 10 | Longueurs, correspondance, JSON invalide |
| `tests/Unit/Controller/ProfileAccountControllerTest.php` | 22 | GET par rôle, champs sensibles absents, PATCH validation, password hash/flush/rollback |

### Frontend

| Fichier | Tests | Couverture |
|---|---|---|
| `src/pages/Profile/ProfileAccountPage.test.tsx` | 46 | Rendu par rôle, email read-only, sauvegarde, validation, password, show/hide, navigation |
| `src/components/layout/components/Topbar/Topbar.test.tsx` | 8 | Menu dropdown, navigation Mon compte/Préférences/Déconnexion |
