# 🚀 Guide de Démarrage Rapide

Ce guide vous permet de démarrer l'application en 5 minutes.

## ✅ Prérequis

Avant de commencer, assurez-vous d'avoir installé :

- **Node.js** (v16+) - [Télécharger](https://nodejs.org)
- **MySQL** (v8+) - [Télécharger](https://dev.mysql.com/downloads/)
- **Git** - [Télécharger](https://git-scm.com)

## 📥 Étape 1 : Télécharger le projet

```bash
# Cloner ou extraire le projet
cd bubbletech-pointage
```

## 🗄️ Étape 2 : Configurer MySQL

1. Démarrer MySQL
2. Créer un utilisateur (ou utiliser root)
3. Le script créera automatiquement la base de données

## ⚙️ Étape 3 : Configuration

### Backend

```bash
cd backend
cp .env.example .env
```

Éditer `backend/.env` avec vos informations :

```env
# Base de données MySQL
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=votre_mot_de_passe_mysql
DB_NAME=bubbletech_pointage

# Secret JWT (générez une chaîne aléatoire longue)
JWT_SECRET=changez_ceci_par_une_chaine_aleatoire_tres_longue

# Brevo (optionnel pour les emails)
BREVO_API_KEY=votre_cle_api_brevo
BREVO_SENDER_EMAIL=noreply@bubbletech.be
```

### Frontend

Le frontend est déjà configuré. Vous pouvez modifier `frontend/.env` si nécessaire.

## 🚀 Étape 4 : Installation et Démarrage

### Option A : Script automatique (Linux/Mac)

```bash
./start.sh
```

Le script va :
1. Installer les dépendances
2. Initialiser la base de données
3. Démarrer le backend et le frontend

### Option B : Manuel

#### Terminal 1 - Backend

```bash
cd backend
npm install
npm run init-db    # Créer les tables
npm run dev        # Démarrer le serveur
```

#### Terminal 2 - Frontend

```bash
cd frontend
npm install
npm start          # Démarrer l'application
```

## 🎯 Étape 5 : Créer un administrateur

### Option 1 : Via MySQL

```sql
-- Se connecter à MySQL
mysql -u root -p

-- Utiliser la base de données
USE bubbletech_pointage;

-- Créer un admin (mot de passe: Admin123!)
INSERT INTO users (nom, prenom, email, password, role, code_secret, actif, doit_changer_mdp)
VALUES (
  'Admin',
  'Super',
  'admin@bubbletech.be',
  '$2a$10$YourHashedPasswordHere',  -- Voir ci-dessous pour générer
  'admin',
  '0000',
  true,
  false
);
```

Pour générer le hash du mot de passe :

```bash
cd backend
node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('Admin123!', 10));"
```

### Option 2 : Utiliser l'API

Une fois le premier admin créé, utilisez l'interface pour créer d'autres utilisateurs.

## 🎉 Étape 6 : Connexion

Ouvrez votre navigateur sur **http://localhost:3000**

### Connexion Admin
- Email: `admin@bubbletech.be`
- Mot de passe: celui que vous avez configuré

### Pointage rapide
Allez sur **http://localhost:3000/pointage**
- Code PIN: `0000` (pour l'admin créé)

## 📊 Fonctionnalités disponibles

### Pour tous les utilisateurs
- ✅ Pointage rapide (Check-in/Check-out)
- ✅ Consultation de ses propres pointages
- ✅ Tableau de bord personnel
- ✅ Changement de mot de passe

### Pour les Managers
- ✅ Consultation des pointages de l'équipe
- ✅ Statistiques de l'équipe
- ✅ Modification des membres de l'équipe

### Pour les Administrateurs
- ✅ Gestion complète du personnel
- ✅ Création/Modification/Suppression d'utilisateurs
- ✅ Statistiques globales
- ✅ Consultation de tous les pointages
- ✅ Accès aux logs système

## 🔧 Dépannage

### Erreur de connexion MySQL

```bash
# Vérifier que MySQL est démarré
sudo systemctl status mysql

# Ou sur Mac
brew services list
```

### Port déjà utilisé

Si le port 5000 ou 3000 est déjà utilisé :

**Backend** : Modifier `PORT` dans `backend/.env`
**Frontend** : Modifier dans `frontend/package.json`

### Erreur "Cannot find module"

```bash
# Supprimer node_modules et réinstaller
rm -rf node_modules package-lock.json
npm install
```

## 📧 Configuration des emails (Optionnel)

Pour activer l'envoi d'emails :

1. Créer un compte sur [Brevo](https://www.brevo.com)
2. Générer une clé API
3. Vérifier l'email expéditeur
4. Ajouter dans `backend/.env` :
   ```
   BREVO_API_KEY=xkeysib-xxxxx
   BREVO_SENDER_EMAIL=noreply@bubbletech.be
   ```

## 📱 Tester l'application

### 1. Créer des utilisateurs

En tant qu'admin, allez dans "Personnel" et créez :
- Un manager
- Un employé
- Un stagiaire

### 2. Tester le pointage

Allez sur `/pointage` et testez avec les codes PIN générés.

### 3. Consulter les statistiques

Retournez au tableau de bord pour voir les statistiques mises à jour.

## 🎓 Prochaines étapes

1. Personnaliser les départements et postes
2. Ajouter votre équipe
3. Configurer les notifications
4. Exporter en production

## 📚 Ressources

- [Documentation complète](README.md)
- [Architecture technique](ARCHITECTURE.md)


## 💡 Besoin d'aide ?

- Consultez le README principal
- Vérifiez les logs : `backend/logs/`
- Email: yassinhoua123@gmail.com



**Bon démarrage ! Yassin vous souhaite la bienvenue 🚀**
