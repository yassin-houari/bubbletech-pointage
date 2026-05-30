# BubbleTech Pointage

Système web complet de gestion des présences et du temps de travail.

## Description

BubbleTech Pointage est une application full-stack permettant aux entreprises de gérer les présences de leurs employés en temps réel.

### Fonctionnalités principales

- Check-in / Check-out via code PIN à 4 chiffres
- Gestion des pauses avec calcul automatique du temps effectif
- Tableau de bord administrateur avec statistiques en temps réel
- Gestion du personnel : employés, stagiaires, managers
- Gestion des départements et des postes
- Système de réinitialisation de mot de passe par code OTP (6 chiffres)
- Envoi automatique d'emails de bienvenue lors de la création de compte
- Authentification sécurisée JWT double facteur (email/mot de passe + code PIN)
- Gestion des rôles : Admin, Manager, Personnel, Stagiaire
- Checkout automatique après 10h de travail
- Logs d'audit complets

---

## Architecture

```
┌─────────────────────┐        API REST / HTTPS        ┌─────────────────────┐
│   React.js          │ ◄────────────────────────────► │   Node.js           │
│   Frontend          │         JSON                    │   Express.js        │
│   Vercel CDN        │                                 │   Vercel Serverless │
└─────────────────────┘                                 └──────────┬──────────┘
                                                                   │
                                                    ┌──────────────┼──────────────┐
                                                    │              │              │
                                             ┌──────▼──────┐ ┌────▼────┐  ┌─────▼─────┐
                                             │   MySQL     │ │Mailjet  │  │   JWT     │
                                             │  Railway    │ │ Emails  │  │   Auth    │
                                             └─────────────┘ └─────────┘  └───────────┘
```

**Stack technique :**

| Couche | Technologie | Hébergement |
|---|---|---|
| Frontend | React.js 18, React Router, Axios | Vercel |
| Backend | Node.js, Express.js | Vercel Serverless |
| Base de données | MySQL 8 | Railway |
| Emails | Mailjet API | Cloud |
| Auth | JWT + bcrypt | — |

---

## Structure du projet

```
bubbletech-pointage/
├── backend/
│   ├── api/
│   │   └── index.js              # Point d'entrée Vercel serverless
│   ├── config/
│   │   └── database.js           # Pool de connexions MySQL
│   ├── controllers/
│   │   ├── authController.js     # Login, OTP, changement MDP
│   │   ├── userController.js     # CRUD utilisateurs + équipes manager
│   │   ├── pointageController.js # Check-in/out, pauses, stats
│   │   ├── departementController.js
│   │   ├── posteController.js
│   │   └── notificationController.js
│   ├── middleware/
│   │   ├── auth.js               # Vérification JWT + rôles
│   │   └── logger.js             # Logs d'audit automatiques
│   ├── routes/
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── pointages.js
│   │   ├── departements.js
│   │   ├── postes.js
│   │   └── notifications.js
│   ├── scripts/
│   │   ├── initDatabase.js       # Initialisation de la base
│   │   └── migrate.js            # Script de migration
│   ├── services/
│   │   └── emailService.js       # Envoi d'emails via Mailjet
│   ├── server.js                 # Application Express
│   ├── vercel.json               # Configuration Vercel backend
│   └── package.json
│
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── Navbar.js
│       │   └── ProtectedRoute.js
│       ├── contexts/
│       │   └── AuthContext.js    # État global d'authentification
│       ├── pages/
│       │   ├── Login.js
│       │   ├── ForgotPassword.js # Réinitialisation MDP par OTP
│       │   ├── ChangePassword.js
│       │   ├── Dashboard.js      # Tableau de bord + stats
│       │   ├── Pointage.js       # Kiosque de pointage PIN
│       │   ├── Personnel.js      # Gestion du personnel
│       │   └── Profile.js
│       ├── services/
│       │   └── api.js            # Appels API centralisés (Axios)
│       └── styles/
│
└── README.md
```

---

## Installation locale

### Prérequis

- Node.js v18+
- MySQL v8+
- Compte Mailjet (gratuit)

### 1. Cloner le projet

```bash
git clone https://github.com/yassin-houari/bubbletech-pointage.git
cd bubbletech-pointage
```

### 2. Configuration Backend

```bash
cd backend
npm install
```

Créer le fichier `.env` :

```env
# Base de données
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=votre_mot_de_passe
DB_NAME=bubbletech_pointage
DB_PORT=3306

# JWT
JWT_SECRET=votre_secret_jwt_tres_long_et_securise
JWT_EXPIRE=24h

# Mailjet (emails)
MAILJET_API_KEY=votre_cle_api
MAILJET_API_SECRET=votre_cle_secrete
MAILJET_FROM_EMAIL=votre@email.com

# App
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
PORT=5000
```

Initialiser la base de données :

```bash
node scripts/initDatabase.js
```

Démarrer le serveur :

```bash
npm run dev
# Serveur sur http://localhost:5000
```

### 3. Configuration Frontend

```bash
cd frontend
npm install
```

Créer `.env` :

```env
REACT_APP_API_URL=http://localhost:5000/api
```

Démarrer :

```bash
npm start
# Application sur http://localhost:3000
```

---

## Base de données

### Tables (11 tables)

| Table | Description |
|---|---|
| `users` | Table centrale — tous les utilisateurs (admin, manager, personnel, stagiaire) |
| `departements` | Départements de l'entreprise |
| `managers` | Extension de users pour le rôle manager |
| `postes` | Postes de travail par département |
| `personnel` | Extension de users pour les employés permanents |
| `stagiaires` | Extension de users pour les stagiaires |
| `pointages` | Sessions de travail (check-in / check-out) |
| `pauses` | Pauses liées à une session de pointage |
| `notifications` | Notifications en application |
| `logs` | Audit trail de toutes les actions |
| `password_reset_tokens` | Codes OTP de réinitialisation de mot de passe |

### Relations clés

```
users          ──── departements       (N users → 1 département)
departements   ──── managers           (1 département → 0..1 manager)
managers       ──── users              (1:1 — un manager est un user)
personnel      ──── users + postes     (1:1 user, N:1 poste)
stagiaires     ──── users              (1:1 + encadrant optionnel)
pointages      ──── users              (N pointages → 1 user)
pauses         ──── pointages          (N pauses → 1 pointage)
```

### Migration sur base existante

```bash
cd backend
node scripts/migrate.js
```

---

## API Endpoints

### Authentification

```
POST   /api/auth/login                   Connexion email + mot de passe
POST   /api/auth/pointage-direct         Connexion par code PIN (kiosque)
POST   /api/auth/login-code              Vérification PIN (utilisateur connecté)
POST   /api/auth/forgot-password         Demande code OTP par email
POST   /api/auth/reset-password          Réinitialisation avec code OTP
PUT    /api/auth/change-password         Changement de mot de passe
POST   /api/auth/change-secret-code      Changement de code PIN
GET    /api/auth/profile                 Profil de l'utilisateur connecté
```

### Utilisateurs

```
GET    /api/users                        Liste des utilisateurs
GET    /api/users/:id                    Détail d'un utilisateur
POST   /api/users                        Créer un utilisateur (Admin)
PUT    /api/users/:id                    Modifier un utilisateur
DELETE /api/users/:id                    Supprimer un utilisateur (Admin)
GET    /api/users/manager/team-members   Équipe du manager connecté
GET    /api/users/manager/assignable     Employés sans manager assignable
POST   /api/users/manager/team-members   Ajouter un membre à l'équipe
DELETE /api/users/manager/team-members/:id  Retirer un membre
```

### Pointages

```
POST   /api/pointages/checkin            Enregistrer l'arrivée
POST   /api/pointages/checkout           Enregistrer le départ
POST   /api/pointages/pause/start        Démarrer une pause
POST   /api/pointages/pause/end          Terminer une pause
GET    /api/pointages                    Historique des pointages
GET    /api/pointages/stats              Statistiques de présence
```

### Structures

```
GET    /api/departements                 Liste des départements
POST   /api/departements                 Créer un département (Admin)
GET    /api/postes                       Liste des postes
POST   /api/postes                       Créer un poste (Admin)
```

### Santé

```
GET    /api/health                       Statut de l'API
```

---

## Rôles et permissions

| Action | Admin | Manager | Personnel | Stagiaire |
|---|---|---|---|---|
| Connexion email/MDP | ✅ | ✅ | ✅ | ✅ |
| Connexion PIN | ✅ | ✅ | ✅ | ✅ |
| Check-in / Check-out | ✅ | ✅ | ✅ | ✅ |
| Gérer les pauses | ✅ | ✅ | ✅ | ✅ |
| Voir son historique | ✅ | ✅ | ✅ | ✅ |
| Voir l'équipe | ✅ (tous) | ✅ (son équipe) | ❌ | ❌ |
| Créer des employés | ✅ | ❌ | ❌ | ❌ |
| Gérer les départements | ✅ | ❌ | ❌ | ❌ |
| Voir les statistiques | ✅ | ✅ (équipe) | ✅ (perso) | ✅ (perso) |

---

## Sécurité

- **Mots de passe** : hachés avec bcrypt (10 rounds)
- **Tokens JWT** : expiration 24h, signés avec secret
- **Rate limiting** : 100 req/15min global, 5 tentatives/15min pour le login
- **CORS** : origines contrôlées
- **Helmet.js** : headers HTTP sécurisés
- **Trust proxy** : configuré pour Vercel
- **OTP** : codes à 6 chiffres, expiration 15 minutes, usage unique

---

## Déploiement (Production)

### Variables d'environnement Vercel (Backend)

| Variable | Description |
|---|---|
| `DB_HOST` | Hôte MySQL Railway |
| `DB_USER` | Utilisateur MySQL |
| `DB_PASSWORD` | Mot de passe MySQL |
| `DB_NAME` | Nom de la base |
| `DB_PORT` | Port MySQL |
| `JWT_SECRET` | Clé secrète JWT |
| `JWT_EXPIRE` | Durée token (ex: 24h) |
| `MAILJET_API_KEY` | Clé API Mailjet |
| `MAILJET_API_SECRET` | Clé secrète Mailjet |
| `MAILJET_FROM_EMAIL` | Email expéditeur |
| `FRONTEND_URL` | URL du frontend |
| `NODE_ENV` | production |

### URLs de production

| Service | URL |
|---|---|
| Frontend | https://bubbletech-pointage-4kdx-one.vercel.app |
| Backend API | https://bubbletech-pointage.vercel.app/api |
| Health check | https://bubbletech-pointage.vercel.app/api/health |

---

## Emails (Mailjet)

L'application envoie automatiquement des emails via Mailjet pour :

1. **Email de bienvenue** — à la création d'un compte
   - Identifiants de connexion (email + mot de passe temporaire)
   - Code PIN de pointage
   - Lien de connexion

2. **Code OTP de réinitialisation** — mot de passe oublié
   - Code à 6 chiffres valable 15 minutes
   - Usage unique — invalidé après utilisation

> **Note :** Si les emails arrivent en spam, demander à l'employé de les marquer comme "Pas du spam". Pour une livraison optimale, vérifier le domaine expéditeur dans le dashboard Mailjet.

---

## Tests manuels

```bash
# Health check
curl https://bubbletech-pointage.vercel.app/api/health

# Login
curl -X POST https://bubbletech-pointage.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@bubbletech.be","password":"password123"}'

# Check-in (avec token)
curl -X POST https://bubbletech-pointage.vercel.app/api/pointages/checkin \
  -H "Authorization: Bearer VOTRE_TOKEN"
```

---

## Perspectives d'évolution

- [ ] Export Excel / PDF des pointages
- [ ] Application mobile (React Native)
- [ ] Pointage par QR Code
- [ ] Pointage biométrique
- [ ] Gestion des congés et absences
- [ ] Notifications WebSocket en temps réel
- [ ] Tableau de bord analytique avancé
- [ ] Support multi-entreprise (SaaS)

---

## Développé par

**Yassin Houari** — Projet de Fin d'Études  
Contact : yassinhoua123@gmail.com

---

*BubbleTech Pointage — Tous droits réservés © 2025*
