# Procédure de déploiement — Medatwork

## Pourquoi cette doc existe

Le build frontend (`frontend/build/`) n'est **pas** dans git (`.gitignore`).  
Un simple `git pull` sur le serveur ne met donc **jamais** le frontend à jour.  
Sans cette procédure, on risque de mettre en ligne un ancien build sans s'en rendre compte.

---

## Méthode recommandée — script automatique

```bash
bash deploy.sh
```

Le script fait dans l'ordre :

| Étape | Action | Pourquoi |
|-------|--------|----------|
| 1 | Vérifie que le working tree est propre | Évite de déployer sans commiter |
| 2 | **`doctrine:migrations:up-to-date` en local** | **Bloque si des migrations ne sont pas appliquées** |
| 3 | `git push origin master` | Met GitHub à jour |
| 4 | `npm run build` en local | Produit le vrai build à partir du code actuel |
| 5 | `scp build/* → public_html/` | **Seul moyen fiable** de mettre le frontend à jour |
| 6 | `git pull` sur le serveur | Récupère le nouveau code |
| 7 | **`doctrine:migrations:migrate` sur le serveur** | **Applique les nouvelles migrations avant le cache** |
| 8 | `php bin/console cache:clear` sur le serveur | Active le nouveau code |
| 9 | Vérifie que la version live = `VersionController::VERSION` | Confirme que le déploiement a réussi |

### Pourquoi les étapes 2 et 7 sont critiques

Les tests unitaires **mockent** la base de données — ils ne font jamais de vraie requête SQL. Une migration en attente provoque un **500 silencieux en production** que les tests ne détectent pas.

- **Étape 2** bloque le déploiement localement si des colonnes manquent en base. C'est la détection précoce.
- **Étape 7** applique les migrations sur le serveur *avant* le `cache:clear`. L'ordre est important : si on vide le cache avant d'appliquer les migrations, Doctrine tente d'accéder aux nouvelles colonnes avant qu'elles existent → 500 immédiat.

---

## Méthode manuelle (si le script échoue)

```bash
# 1. Commiter et pousser
git add .
git commit -m "..."
git push origin master

# 2. Vérifier les migrations locales
cd backend
php bin/console doctrine:migrations:up-to-date
# Si des migrations sont en attente → les appliquer d'abord :
php bin/console doctrine:migrations:migrate
cd ..

# 3. Builder le frontend en local
cd frontend
npm run build

# 4. Transférer le build sur le serveur
scp -P 65002 -r build/* u929427688@147.79.98.101:/home/u929427688/domains/medatwork.be/public_html/

# 5. Sur le serveur : pull backend
ssh -p 65002 u929427688@147.79.98.101 \
  "cd /home/u929427688/domains/medatwork.be/app && git pull origin master"

# 6. Appliquer les migrations en production (AVANT le cache:clear)
ssh -p 65002 u929427688@147.79.98.101 \
  "cd /home/u929427688/domains/medatwork.be/app/backend && php bin/console doctrine:migrations:migrate --no-interaction --env=prod"

# 7. Vider le cache Symfony
ssh -p 65002 u929427688@147.79.98.101 \
  "cd /home/u929427688/domains/medatwork.be/app/backend && php bin/console cache:clear --env=prod"

# 8. Vérifier la version
ssh -p 65002 u929427688@147.79.98.101 \
  "grep -o 'version [0-9.]*' /home/u929427688/domains/medatwork.be/public_html/assets/index-*.js | head -1"
```

---

## Checklist avant déploiement

- [ ] `git status` propre (aucun fichier non commité)
- [ ] **Migrations locales à jour** : `php bin/console doctrine:migrations:up-to-date`
- [ ] Tests passent : `php bin/phpunit tests/Unit/` et `npx vitest run`
- [ ] TypeScript OK : `npx tsc --noEmit`
- [ ] Version à jour dans **3 endroits synchronisés** :
  - `frontend/src/components/layout/components/Footer/Footer.tsx` (affiché à l'utilisateur)
  - `backend/src/Controller/VersionController.php` (endpoint `/api/version` + source du script)
  - `frontend/package.json` (cohérence npm)
- [ ] Pas de `dd()`, `console.log` de debug, ou secret hardcodé

> ⚠️ **Les tests unitaires ne détectent pas les migrations en attente** (ils mockent la BDD).  
> La commande `doctrine:migrations:up-to-date` est la seule vérification fiable.

> ℹ️ Le script lit la version depuis `VersionController.php` — c'est la source de vérité pour la vérification finale (étape 9).

---

## Erreur fréquente à éviter

> ❌ **Ne jamais faire `cp` depuis `app/frontend/build/` sur le serveur.**  
> Ce répertoire contient le dernier build qui a été copié manuellement — il peut dater de semaines.  
> Le bon build est toujours celui produit localement par `npm run build` juste avant le déploiement.

---

## Infos serveur

| Paramètre | Valeur |
|-----------|--------|
| SSH | `ssh -p 65002 u929427688@147.79.98.101` |
| App | `/home/u929427688/domains/medatwork.be/app` |
| Public | `/home/u929427688/domains/medatwork.be/public_html` |
| URL prod | `https://www.medatwork.be` |
| URL API | `https://api-link.medatwork.be` |

---

## Domaine backend actif

Un seul backend depuis le 2026-05-17 :

| Domaine | Version | Usage |
|---------|---------|-------|
| `api-link.medatwork.be` | **v3.6.0** (actuel) | ✅ Seul backend — déployé par `deploy.sh` |

**`.env.production` doit toujours pointer sur `api-link.medatwork.be`.**

> **Historique — incident résolu le 2026-05-17**  
> `api-v2.medatwork.be` (Symfony v3.4.1) existait en parallèle. Le frontend pointait par erreur sur ce domaine figé, causant des 404 (routes absentes en v3.4.1). Corrigé via `.env.production`, puis `api-v2` a été **entièrement supprimé** (DNS + fichiers + 282 MB de backend). DNS Hostinger à retirer manuellement dans hPanel si pas encore fait.

---

## Registre des mises en ligne

| Date | Version | Contenu | Déployé par |
|------|---------|---------|-------------|
| 2026-05-17 | 3.6.0 | Préférences utilisateur, topbar search admin, corrections Sentry (5 issues), recherche topbar admin pages ; **fix critique : .env.production → api-link.medatwork.be** | Samy |
| 2026-05-12 | 3.5.0 | Phases 1V2→6 : dirty flag, fingerprints, snapshots, historique RH, diff viewer, lock RH, audit timeline 14 event types, design system ExportsPage | Samy |
| 2026-05-07 | 3.4.1 | Design system tableaux (densité, tri, filter chips, sidebar) ; pages Admin Manager/Residents/Years redesign | Samy |
| *(précédentes)* | 3.4 | — | — |
