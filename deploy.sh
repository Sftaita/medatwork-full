#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# deploy.sh — Déploiement complet de Medatwork en production
#
# Usage :
#   bash deploy.sh
#
# Ce script :
#   1. Vérifie que tout est commité
#   2. Pousse sur GitHub
#   3. Build le frontend localement
#   4. Transfert le build sur le serveur (scp)
#   5. Pull le backend sur le serveur
#   6. Vide le cache Symfony
#   7. Vérifie que la version en ligne correspond
#
# ─────────────────────────────────────────────────────────────────────────────

set -e  # Stoppe au premier échec

SSH_HOST="u929427688@147.79.98.101"
SSH_PORT="65002"
SSH="ssh -p $SSH_PORT $SSH_HOST"
REMOTE_APP="/home/u929427688/domains/medatwork.be/app"
REMOTE_PUBLIC="/home/u929427688/domains/medatwork.be/public_html"
FRONTEND_DIR="$(dirname "$0")/frontend"
VERSION=$(grep -o '"version": "[^"]*"' "$FRONTEND_DIR/package.json" | head -1 | grep -o '[0-9.]*')

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║   MED@WORK — Déploiement production          ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# ── 1. Vérifier que le working tree est propre ────────────────────────────────
echo "▸ [1/6] Vérification git..."
cd "$(dirname "$0")"

if ! git diff --quiet || ! git diff --staged --quiet; then
  echo ""
  echo "  ✗ Des fichiers ne sont pas commités :"
  git status --short
  echo ""
  echo "  → Commitez vos modifications avant de déployer."
  exit 1
fi
echo "  ✓ Working tree propre"

# ── 2. Push GitHub ────────────────────────────────────────────────────────────
echo "▸ [2/6] Push GitHub..."
git push origin master
echo "  ✓ Push OK"

# ── 3. Build frontend ─────────────────────────────────────────────────────────
echo "▸ [3/6] Build frontend..."
cd "$FRONTEND_DIR"
npm run build
echo "  ✓ Build OK"

# ── 4. Upload build → serveur ─────────────────────────────────────────────────
echo "▸ [4/6] Upload build vers le serveur..."
scp -P "$SSH_PORT" -r build/* "$SSH_HOST:$REMOTE_PUBLIC/"
echo "  ✓ Upload OK"

# ── 5. Git pull + cache Symfony ───────────────────────────────────────────────
echo "▸ [5/6] Pull backend + cache Symfony..."
$SSH "cd $REMOTE_APP && git pull origin master && cd backend && php bin/console cache:clear --env=prod"
echo "  ✓ Backend OK"

# ── 6. Vérification version en ligne ─────────────────────────────────────────
echo "▸ [6/6] Vérification version en ligne..."
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
