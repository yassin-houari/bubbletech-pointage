# MLD — BubbleTech Pointage
## Modèle Logique de Données

> Conventions :
> - **#attr** → clé primaire (PK)
> - **&attr** → clé étrangère (FK)
> - Les noms de tables sont au **singulier**

---

## 1. user

```
user (
  #id            : INT AUTO_INCREMENT,
   nom           : VARCHAR(100)        NOT NULL,
   prenom        : VARCHAR(100)        NOT NULL,
   email         : VARCHAR(255)        NOT NULL UNIQUE,
   password      : VARCHAR(255)        NOT NULL,
   role          : ENUM('admin','manager','personnel','stagiaire')  NOT NULL,
  &departement_id: INT                 NULL  → departement(id),
   code_secret   : CHAR(4)             NOT NULL UNIQUE,
   actif         : BOOLEAN             DEFAULT true,
   doit_changer_mdp : BOOLEAN          DEFAULT false,
   date_creation : TIMESTAMP           DEFAULT CURRENT_TIMESTAMP,
   date_modification : TIMESTAMP       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)
```

---

## 2. departement

```
departement (
  #id            : INT AUTO_INCREMENT,
   nom           : VARCHAR(100)        NOT NULL UNIQUE,
   description   : TEXT,
  &manager_id    : INT                 NULL  → manager(user_id),
   date_creation : TIMESTAMP           DEFAULT CURRENT_TIMESTAMP
)
```

---

## 3. poste

```
poste (
  #id            : INT AUTO_INCREMENT,
   nom           : VARCHAR(100)        NOT NULL,
  &departement_id: INT                 NOT NULL  → departement(id),
   description   : TEXT,
   date_creation : TIMESTAMP           DEFAULT CURRENT_TIMESTAMP
)
```

---

## 4. manager

```
manager (
  #user_id        : INT  → user(id),
   date_nomination : DATE NOT NULL
)
```

---

## 5. personnel

```
personnel (
  #user_id      : INT  → user(id),
  &poste_id     : INT  NOT NULL  → poste(id),
   date_embauche : DATE NOT NULL,
   salaire       : DECIMAL(10,2)
)
```

---

## 6. stagiaire

```
stagiaire (
  #user_id      : INT  → user(id),
   date_debut   : DATE NOT NULL,
   date_fin     : DATE NOT NULL,
  &encadrant_id : INT  NULL  → user(id),
   CONTRAINTE : date_fin >= date_debut
)
```

---

## 7. specialite

```
specialite (
  #id            : INT AUTO_INCREMENT,
   nom           : VARCHAR(100)   NOT NULL UNIQUE,
   description   : TEXT,
   date_creation : TIMESTAMP      DEFAULT CURRENT_TIMESTAMP
)
```

---

## 8. pointage

```
pointage (
  #id                    : INT AUTO_INCREMENT,
  &user_id               : INT       NOT NULL  → user(id),
   date_pointage         : DATE      NOT NULL,
   checkin_at            : DATETIME  NOT NULL,
   checkout_at           : DATETIME  NULL,
   statut                : ENUM('en_cours','termine','incomplet')  DEFAULT 'en_cours',
   duree_travail_minutes : INT       NULL,
   created_at            : TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
   updated_at            : TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)
```

---

## 9. pause

```
pause (
  #id             : INT AUTO_INCREMENT,
  &pointage_id    : INT      NOT NULL  → pointage(id),
   debut_pause    : DATETIME NOT NULL,
   fin_pause      : DATETIME NULL,
   duree_minutes  : INT      NULL
)
```

---

## 10. notification

```
notification (
  #id           : INT AUTO_INCREMENT,
  &user_id      : INT          NOT NULL  → user(id),
   titre        : VARCHAR(255) NOT NULL,
   message      : TEXT         NOT NULL,
   type         : ENUM('info','warning','success','error')  DEFAULT 'info',
   date_envoi   : TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
   lu           : BOOLEAN      DEFAULT false,
   date_lecture : TIMESTAMP    NULL
)
```

---

## 11. log

```
log (
  #id          : INT AUTO_INCREMENT,
  &user_id     : INT          NULL  → user(id),
   action      : VARCHAR(100) NOT NULL,
   details     : TEXT,
   ip_address  : VARCHAR(45),
   user_agent  : TEXT,
   date_action : TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
)
```

---

## Schéma des relations

```
user ──────────────────────────────── departement
  │  (departement_id → id)                │
  │                                       │
  ├── manager ◄──────────────────────────┘
  │     (user_id → user.id)         (manager_id → manager.user_id)
  │
  ├── personnel ────────── poste ───── departement
  │     (user_id)         (poste_id)   (departement_id)
  │
  ├── stagiaire ──────────── user (encadrant)
  │     (user_id)
  │
  ├── pointage
  │     (user_id) ──── pause (pointage_id)
  │
  ├── notification
  │     (user_id)
  │
  └── log
        (user_id)
```

---

## Résumé des tables

| Table         | Clé Primaire | Clés Étrangères                              |
|---------------|-------------|----------------------------------------------|
| user          | id          | departement_id → departement                 |
| departement   | id          | manager_id → manager                         |
| poste         | id          | departement_id → departement                 |
| manager       | user_id     | user_id → user                               |
| personnel     | user_id     | user_id → user, poste_id → poste             |
| stagiaire     | user_id     | user_id → user, encadrant_id → user          |
| specialite    | id          | —                                            |
| pointage      | id          | user_id → user                               |
| pause         | id          | pointage_id → pointage                       |
| notification  | id          | user_id → user                               |
| log           | id          | user_id → user                               |
