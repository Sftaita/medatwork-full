#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# deploy.sh — Déploiement complet de Medatwork en production
#
# Usage :
#   bash deploy.sh
#
# Ce script :
#   1. Vérifie que tout est commité
#   2. Vérifie que les migrations locales sont à jour
#   3. Pousse sur GitHub
#   4. Build le frontend localement
#   5. Transfert le build sur le serveur (scp)
#   6. Pull le backend sur le serveur
#   7. Applique les migrations en production (doctrine:migrations:migrate)
#   8. Vide le cache Symfony
#   9. Vérifie que la version en ligne correspond
#
# Pourquoi l'étape 2 est critique :
#   Les tests unitaires mockent la base de données — ils ne détectent pas les
#   migrations en attente. Sans cette vérification, un 500 en production est
#   la seule façon de s'en rendre compte. Cette étape bloque le déploiement
#   avant même le push si des colonnes manquent en base locale.
#
# ─────────────────────────────────────────────────────────────────────────────

set -e  # Stoppe au premier échec

# Chemin absolu du projet — insensible au répertoire courant d'appel
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

SSH_HOST="u929427688@147.79.98.101"
SSH_PORT="65002"
SSH="ssh -p $SSH_PORT $SSH_HOST"
REMOTE_APP="/home/u929427688/domains/medatwork.be/app"
REMOTE_PUBLIC="/home/u929427688/domains/medatwork.be/public_html"
FRONTEND_DIR="$ROOT_DIR/frontend"
# Source de vérité : VersionController.php (synchronisé avec Footer.tsx)
VERSION=$(grep -o "'[0-9][0-9.]*'" "$ROOT_DIR/backend/src/Controller/VersionController.php" | tr -d "'")

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║   MED@WORK — Déploiement production          ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# ── 1. Vérifier que le working tree est propre ────────────────────────────────
echo "▸ [1/9] Vérification git..."
cd "$ROOT_DIR"

if ! git diff --quiet || ! git diff --staged --quiet; then
  echo ""
  echo "  ✗ Des fichiers ne sont pas commités :"
  git status --short
  echo ""
  echo "  → Commitez vos modifications avant de déployer."
  exit 1
fi
echo "  ✓ Working tree propre"

# ── 2. Vérification migrations locales ───────────────────────────────────────
# Les tests unitaires mockent la BDD — ils ne détectent pas les migrations
# en attente. Cette étape bloque le déploiement avant le push si des
# colonnes manquent en base locale.
echo "▸ [2/9] Vérification migrations locales..."
cd "$ROOT_DIR/backend"

if ! php bin/console doctrine:migrations:up-to-date --no-interaction 2>&1; then
  echo ""
  echo "  ✗ Des migrations ne sont pas appliquées localement !"
  echo ""
  php bin/console doctrine:migrations:status 2>&1 | grep -E "New|Current|Next"
  echo ""
  echo "  → Exécutez d'abord : php bin/console doctrine:migrations:migrate"
  echo "  → Puis relancez deploy.sh"
  exit 1
fi
cd "$ROOT_DIR"
echo "  ✓ Migrations locales à jour"

# ── 3. Push GitHub ────────────────────────────────────────────────────────────
echo "▸ [3/9] Push GitHub..."
git push origin master
echo "  ✓ Push OK"

# ── 4. Build frontend ─────────────────────────────────────────────────────────
echo "▸ [4/9] Build frontend..."
cd "$FRONTEND_DIR"
npm run build
echo "  ✓ Build OK"

# ── 5. Upload build → serveur ─────────────────────────────────────────────────
echo "▸ [5/9] Upload build vers le serveur..."
scp -P "$SSH_PORT" -r build/* "$SSH_HOST:$REMOTE_PUBLIC/"
echo "  ✓ Upload OK"

# ── 6. Git pull backend ───────────────────────────────────────────────────────
echo "▸ [6/9] Pull backend..."
$SSH "cd $REMOTE_APP && git pull origin master"
echo "  ✓ Pull OK"

# ── 7. Migrations production ──────────────────────────────────────────────────
# Critique : toutes les migrations du commit viennent d'être pullées.
# On les applique avant le cache:clear pour éviter un 500.
echo "▸ [7/9] Migrations production..."
MIGRATION_OUTPUT=$($SSH "cd $REMOTE_APP/backend && php bin/console doctrine:migrations:migrate --no-interaction --env=prod 2>&1")
echo "$MIGRATION_OUTPUT"

if echo "$MIGRATION_OUTPUT" | grep -q "ERROR\|Exception\|failed"; then
  echo ""
  echo "  ✗ Échec des migrations en production !"
  echo "  → Vérifiez le log Symfony sur le serveur."
  exit 1
fi
echo "  ✓ Migrations OK"

# ── 8. Cache Symfony ──────────────────────────────────────────────────────────
echo "▸ [8/9] Cache Symfony..."
$SSH "cd $REMOTE_APP/backend && php bin/console cache:clear --env=prod"
echo "  ✓ Cache OK"

# ── 9. Vérification version en ligne ─────────────────────────────────────────
echo "▸ [9/9] Vérification version en ligne..."
LIVE_INDEX=$($SSH "grep -o 'assets/index[^\"]*\.js' $REMOTE_PUBLIC/index.html | head -1")
LIVE_VERSION=$($SSH "grep -o 'version [0-9.]*' $REMOTE_PUBLIC/$LIVE_INDEX 2>/dev/null | head -1 | grep -o '[0-9.]*'")

if [ "$LIVE_VERSION" = "$VERSION" ]; then
  echo "  ✓ Version $LIVE_VERSION confirmée en ligne"
else
  echo "  ✗ Version attendue : $VERSION — version live : $LIVE_VERSION"
  echo "  → Quelque chose s'est mal passé, vérifiez manuellement."
  exit 1
fi

echo ""
echo "  🚀 Déploiement terminé — v$VERSION est en production"
echo "  🌐 https://www.medatwork.be"
echo ""
