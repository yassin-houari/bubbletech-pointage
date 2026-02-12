# 🕐 BubbleTech Pointage

Application web de gestion du temps et de présence pour l'ASBL BubbleTech.

## 📋 Description

BubbleTech Pointage est une plateforme complète permettant :
- ✅ Check-in/Check-out avec code PIN à 4 chiffres
- 👥 Gestion du personnel et des stagiaires
- 📊 Statistiques et rapports de présence
- 🔔 Notifications par email (Brevo)
- 🔐 Authentification sécurisée avec JWT
- 📱 Interface responsive (desktop et mobile)

## 🏗️ Architecture

**Client-Server Architecture**
- **Frontend**: React 18 + React Router + Axios
- **Backend**: Node.js + Express.js
- **Base de données**: MySQL
- **Service de notification**: Brevo (anciennement Sendinblue)

```
┌─────────────┐      API REST      ┌─────────────┐      ┌──────────┐
│   React     │ ◄─────────────────► │  Express.js │ ◄───► │  MySQL   │
│  Frontend   │      (JSON)         │   Backend   │       │ Database │
└─────────────┘                     └─────────────┘      └──────────┘
                                           │
                                           ▼
                                    ┌─────────────┐
                                    │    Brevo    │
                                    │  (Emails)   │
                                    └─────────────┘
```

## 📦 Structure du projet

```
bubbletech-pointage/
├── backend/                 # Serveur Node.js/Express
│   ├── config/             # Configuration (DB, etc.)
│   ├── controllers/        # Logique métier
│   ├── middleware/         # Middlewares (auth, logs)
│   ├── routes/             # Routes API
│   ├── scripts/            # Scripts utilitaires
│   ├── services/           # Services (Brevo, etc.)
│   ├── .env.example        # Variables d'environnement
│   ├── package.json        # Dépendances backend
│   └── server.js           # Point d'entrée
│
├── frontend/               # Application React
│   ├── public/            # Fichiers statiques
│   ├── src/
│   │   ├── components/    # Composants réutilisables
│   │   ├── contexts/      # Contexts React (Auth)
│   │   ├── pages/         # Pages de l'application
│   │   ├── services/      # Services API
│   │   ├── styles/        # Fichiers CSS
│   │   ├── App.js         # Composant principal
│   │   └── index.js       # Point d'entrée
│   ├── .env               # Variables d'environnement
│   └── package.json       # Dépendances frontend
│
└── README.md              # Ce fichier
```

## 🚀 Installation

### Prérequis

- Node.js (v16 ou supérieur)
- MySQL (v8 ou supérieur)
- Compte Brevo (pour les emails)

### 1. Cloner le projet

```bash
git clone <url-du-repo>
cd bubbletech-pointage
```

### 2. Configuration Backend

```bash
cd backend
npm install
```

Copier `.env.example` vers `.env` et configurer :

```env
# Base de données
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=votre_mot_de_passe
DB_NAME=bubbletech_pointage

# JWT
JWT_SECRET=votre_secret_jwt_tres_long_et_securise

# Brevo
BREVO_API_KEY=votre_cle_api_brevo
BREVO_SENDER_EMAIL=noreply@bubbletech.be
```

Initialiser la base de données :

```bash
npm run init-db
```

Démarrer le serveur :

```bash
npm run dev
```

Le serveur démarre sur `http://localhost:5000`

### 3. Configuration Frontend

```bash
cd frontend
npm install
npm start
```

L'application démarre sur `http://localhost:3000`

## 🗄️ Base de données

### Schéma relationnel

La base de données est normalisée en 3ème forme normale (3NF) :

**Tables principales:**
- `users` - Table mère pour tous les utilisateurs
- `departements` - Départements de l'entreprise
- `postes` - Postes par département
- `personnel` - Données spécifiques aux employés
- `stagiaires` - Données spécifiques aux stagiaires
- `managers` - Managers et leurs spécialités
- `equipes` - Relations manager-membres
- `pointages` - Enregistrements de présence
- `pauses` - Pauses multiples par jour
- `notifications` - Notifications système
- `logs` - Audit trail

### Diagramme relationnel

```
users (1) ──┬── (1) personnel ── (N) postes ── (N) departements
            ├── (1) stagiaires
            └── (1) managers ── (N) specialites_manager
                             └── (N) equipes

pointages (N) ── (1) users
          └── (N) pauses

notifications (N) ── (1) users
logs (N) ── (1) users
```

## 🔐 Authentification & Sécurité

### Méthodes d'authentification

1. **Login classique** : Email + Mot de passe → JWT token
2. **Login rapide** : Code PIN 4 chiffres (pour pointage uniquement)

### Sécurité

- ✅ Mots de passe hashés (bcrypt)
- ✅ Tokens JWT avec expiration
- ✅ Rate limiting sur les endpoints sensibles
- ✅ Validation des entrées
- ✅ Protection CORS
- ✅ Helmet.js pour headers sécurisés
- ✅ Logs d'audit complets

## 📡 API Endpoints

### Authentification

```
POST   /api/auth/login                  # Connexion email/password
POST   /api/auth/login-code             # Connexion code PIN
POST   /api/auth/request-password-reset # Demande réinitialisation
POST   /api/auth/change-password        # Changement de mot de passe
GET    /api/auth/profile                # Profil utilisateur
```

### Utilisateurs (Admin/Manager uniquement)

```
GET    /api/users           # Liste des utilisateurs
GET    /api/users/:id       # Détails utilisateur
POST   /api/users           # Créer utilisateur (Admin)
PUT    /api/users/:id       # Modifier utilisateur
DELETE /api/users/:id       # Supprimer utilisateur (Admin)
```

### Pointages

```
POST   /api/pointages/checkin      # Check-in
POST   /api/pointages/checkout     # Check-out
POST   /api/pointages/break/start  # Début pause
POST   /api/pointages/break/end    # Fin pause
GET    /api/pointages              # Liste pointages (filtrable)
GET    /api/pointages/stats        # Statistiques
```

## 👥 Rôles et permissions

| Rôle       | Connexion | Pointage | Voir son profil | Voir équipe | Gérer personnel |
|------------|-----------|----------|-----------------|-------------|-----------------|
| Admin      | ✅        | ✅       | ✅              | ✅ (tous)   | ✅              |
| Manager    | ✅        | ✅       | ✅              | ✅ (équipe) | ✅ (équipe)     |
| Personnel  | ✅        | ✅       | ✅              | ❌          | ❌              |
| Stagiaire  | ✅        | ✅       | ✅              | ❌          | ❌              |

## 📧 Notifications Email (Brevo)

L'application envoie automatiquement des emails via Brevo pour :

1. **Email de bienvenue** - Envoyé lors de la création d'un compte
   - Mot de passe temporaire
   - Code PIN de pointage
   - Lien de connexion

2. **Réinitialisation de mot de passe**
   - Nouveau mot de passe temporaire
   - Obligation de le changer à la connexion

3. **Alertes d'absence** (optionnel)
   - Notification si aucun pointage détecté

### Configuration Brevo

1. Créer un compte sur [Brevo](https://www.brevo.com)
2. Générer une clé API
3. Configurer l'email expéditeur vérifié
4. Ajouter la clé dans `.env`

## 🎨 Interface utilisateur

### Pages principales

1. **Login** (`/login`)
   - Connexion email/password
   - Lien vers pointage rapide
   - Lien mot de passe oublié

2. **Pointage rapide** (`/pointage`)
   - Interface code PIN
   - Check-in/Check-out
   - Feedback visuel immédiat

3. **Dashboard** (`/dashboard`)
   - Statistiques globales (Admin)
   - Présences du jour
   - Pointages récents
   - Actions rapides

4. **Gestion du personnel** (`/users`) *(Admin uniquement)*
   - Liste des utilisateurs
   - Création/Modification/Suppression
   - Filtres et recherche

## 🧪 Tests

### Test manuel de l'API

```bash
# Health check
curl http://localhost:5000/api/health

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@bubbletech.be","password":"password123"}'

# Check-in (avec token)
curl -X POST http://localhost:5000/api/pointages/checkin \
  -H "Authorization: Bearer VOTRE_TOKEN" \
  -H "Content-Type: application/json"
```

## 🔧 Maintenance

### Créer un administrateur

```sql
-- Dans MySQL
INSERT INTO users (nom, prenom, email, password, role, code_secret, actif)
VALUES (
  'Admin', 
  'Super', 
  'admin@bubbletech.be',
  '$2a$10$...', -- Hash bcrypt du mot de passe
  'admin',
  '0000',
  true
);
```

Ou utiliser le endpoint POST /api/users avec un compte admin existant.

### Sauvegardes

```bash
# Sauvegarde MySQL
mysqldump -u root -p bubbletech_pointage > backup_$(date +%Y%m%d).sql

# Restauration
mysql -u root -p bubbletech_pointage < backup_20240101.sql
```

## 📊 Monitoring

Les logs sont enregistrés dans la table `logs` :
- Actions utilisateur
- Tentatives de connexion
- Erreurs système
- IP et User-Agent

Consulter les logs :

```sql
SELECT * FROM logs 
ORDER BY date_action DESC 
LIMIT 100;
```

## 🐛 Dépannage

### Problème de connexion à MySQL

```bash
# Vérifier que MySQL est démarré
sudo systemctl status mysql

# Vérifier les credentials dans .env
# Tester la connexion
mysql -u root -p
```

### Erreur CORS

Vérifier que `FRONTEND_URL` dans `.env` backend correspond à l'URL du frontend.

### Emails non envoyés

1. Vérifier la clé API Brevo
2. Vérifier que l'email expéditeur est vérifié
3. Consulter les logs backend

## 📝 TODO / Améliorations futures

- [ ] Export Excel des pointages
- [ ] Graphiques de statistiques
- [ ] Application mobile native
- [ ] Reconnaissance faciale
- [ ] Géolocalisation du pointage
- [ ] Notifications push
- [ ] Multi-langue (FR/NL/EN)

## 👨‍💻 Développement

### Conventions de code

- **Backend** : ESLint avec config standard
- **Frontend** : ESLint avec config React
- Indentation : 2 espaces
- Noms de variables : camelCase
- Noms de fichiers : PascalCase pour composants React

### Git workflow

```bash
git checkout -b feature/nouvelle-fonctionnalite
# Développement...
git commit -m "feat: description de la fonctionnalité"
git push origin feature/nouvelle-fonctionnalite
# Pull Request
```

## 📄 Licence

Propriété de BubbleTech ASBL. Tous droits réservés.

## 📞 Support

Pour toute question : support@bubbletech.be

---

**Développé avec ❤️ pour BubbleTech Apar Yassin Houari**
