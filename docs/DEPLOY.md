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
| 2 | `git push origin master` | Met GitHub à jour |
| 3 | `npm run build` en local | Produit le vrai build à partir du code actuel |
| 4 | `scp build/* → public_html/` | **Seul moyen fiable** de mettre le frontend à jour |
| 5 | `git pull` + `php bin/console cache:clear` sur le serveur | Met le backend à jour |
| 6 | Vérifie que la version dans le bundle live correspond | Confirme que le déploiement a réussi |

---

## Méthode manuelle (si le script échoue)

```bash
# 1. Commiter et pousser
git add .
git commit -m "..."
git push origin master

# 2. Builder le frontend en local
cd frontend
npm run build

# 3. Transférer le build sur le serveur
scp -P 65002 -r build/* u929427688@147.79.98.101:/home/u929427688/domains/medatwork.be/public_html/

# 4. Sur le serveur : pull backend + cache
ssh -p 65002 u929427688@147.79.98.101 \
  "cd /home/u929427688/domains/medatwork.be/app && git pull origin master && cd backend && php bin/console cache:clear --env=prod"

# 5. Vérifier la version
ssh -p 65002 u929427688@147.79.98.101 \
  "grep -o 'version [0-9.]*' /home/u929427688/domains/medatwork.be/public_html/assets/index-*.js | head -1"
```

---

## Checklist avant déploiement

- [ ] `git status` propre (aucun fichier non commité)
- [ ] Tests passent : `npx vitest run`
- [ ] TypeScript OK : `npx tsc --noEmit`
- [ ] Version à jour dans `Footer.tsx` **et** `VersionController.php`
- [ ] Pas de `dd()`, `console.log` de debug, ou secret hardcodé

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

## Registre des mises en ligne

| Date | Version | Contenu | Déployé par |
|------|---------|---------|-------------|
| 2026-05-07 | 3.4.1 | Design system tableaux (densité, tri, filter chips, sidebar) ; pages Admin Manager/Residents/Years redesign ; version bump | Samy |
| *(précédentes)* | 3.4 | — | — |
