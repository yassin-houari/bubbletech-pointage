#!/bin/bash

# Script de démarrage rapide pour BubbleTech Pointage
# Usage: ./start.sh

echo "🚀 Démarrage de BubbleTech Pointage"
echo "===================================="
echo ""

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Vérifier si Node.js est installé
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js n'est pas installé${NC}"
    echo "Veuillez installer Node.js depuis https://nodejs.org"
    exit 1
fi

echo -e "${GREEN}✅ Node.js $(node -v) détecté${NC}"

# Vérifier si MySQL est installé et démarré
if ! command -v mysql &> /dev/null; then
    echo -e "${YELLOW}⚠️  MySQL n'est pas installé ou pas dans le PATH${NC}"
    echo "Assurez-vous que MySQL est installé et démarré"
fi

# Backend
echo ""
echo "📦 Configuration du Backend..."
cd backend

if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  Fichier .env non trouvé${NC}"
    echo "Copie de .env.example vers .env"
    cp .env.example .env
    echo -e "${YELLOW}⚠️  Veuillez configurer le fichier backend/.env avant de continuer${NC}"
    echo "Appuyez sur Entrée une fois la configuration terminée..."
    read
fi

if [ ! -d node_modules ]; then
    echo "Installation des dépendances backend..."
    npm install
fi

# Demander si l'utilisateur veut initialiser la DB
read -p "Voulez-vous initialiser/réinitialiser la base de données ? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Initialisation de la base de données..."
    npm run init-db
fi

# Frontend
echo ""
echo "📦 Configuration du Frontend..."
cd ../frontend

if [ ! -d node_modules ]; then
    echo "Installation des dépendances frontend..."
    npm install
fi

# Démarrage
echo ""
echo "🎯 Démarrage des serveurs..."
echo ""

# Démarrer le backend en arrière-plan
cd ../backend
echo -e "${GREEN}▶️  Démarrage du backend sur http://localhost:5000${NC}"
npm run dev &
BACKEND_PID=$!

# Attendre un peu que le backend démarre
sleep 3

# Démarrer le frontend
cd ../frontend
echo -e "${GREEN}▶️  Démarrage du frontend sur http://localhost:3000${NC}"
echo ""
echo "=========================================="
echo "✅ Application démarrée avec succès !"
echo "=========================================="
echo ""
echo "Backend:  http://localhost:5000"
echo "Frontend: http://localhost:3000"
echo ""
echo "Appuyez sur Ctrl+C pour arrêter les serveurs"
echo ""

npm start

# Nettoyer à l'arrêt
kill $BACKEND_PID
