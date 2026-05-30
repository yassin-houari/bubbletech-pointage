const mysql = require('mysql2/promise');
require('dotenv').config();

const initDatabase = async () => {
  let connection;

  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      port: process.env.DB_PORT || 3306
    });

    console.log('📦 Connexion à MySQL établie');

    const dbName = process.env.DB_NAME || 'bubbletech_pointage';
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS ${dbName} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    await connection.query(`USE ${dbName}`);

    // Désactiver les vérifications FK pendant la création
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');

    // Supprimer tables obsolètes
    await connection.query('DROP TABLE IF EXISTS specialites');
    await connection.query('DROP TABLE IF EXISTS specialites_manager');
    await connection.query('DROP TABLE IF EXISTS equipes');
    console.log('✅ Tables obsolètes supprimées');

    // ── 1. managers (sans FK vers users pour l'instant — résolu après)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS managers (
        user_id INT PRIMARY KEY,
        date_nomination DATE NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ── 2. departements
    await connection.query(`
      CREATE TABLE IF NOT EXISTS departements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nom VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        manager_id INT,
        date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_manager_id (manager_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ── 3. users
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nom VARCHAR(100) NOT NULL,
        prenom VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin', 'manager', 'personnel', 'stagiaire') NOT NULL,
        departement_id INT NULL,
        code_secret CHAR(4) NOT NULL UNIQUE,
        actif BOOLEAN DEFAULT true,
        doit_changer_mdp BOOLEAN DEFAULT false,
        date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_code_secret (code_secret),
        INDEX idx_role (role),
        INDEX idx_departement_id (departement_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ── 4. postes
    await connection.query(`
      CREATE TABLE IF NOT EXISTS postes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nom VARCHAR(100) NOT NULL,
        departement_id INT NOT NULL,
        description TEXT,
        date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_poste_dept (nom, departement_id),
        INDEX idx_departement_id (departement_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ── 5. personnel
    await connection.query(`
      CREATE TABLE IF NOT EXISTS personnel (
        user_id INT PRIMARY KEY,
        poste_id INT NOT NULL,
        date_embauche DATE NOT NULL,
        salaire DECIMAL(10, 2),
        INDEX idx_poste_id (poste_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ── 6. stagiaires
    await connection.query(`
      CREATE TABLE IF NOT EXISTS stagiaires (
        user_id INT PRIMARY KEY,
        date_debut DATE NOT NULL,
        date_fin DATE NOT NULL,
        encadrant_id INT,
        CHECK (date_fin >= date_debut),
        INDEX idx_encadrant (encadrant_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ── 7. pointages
    await connection.query(`
      CREATE TABLE IF NOT EXISTS pointages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        date_pointage DATE NOT NULL,
        checkin_at DATETIME NOT NULL,
        checkout_at DATETIME,
        statut ENUM('en_cours', 'termine', 'incomplet') DEFAULT 'en_cours',
        duree_travail_minutes INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user_date (user_id, date_pointage),
        INDEX idx_user_statut (user_id, statut),
        INDEX idx_checkin_at (checkin_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ── 8. pauses
    await connection.query(`
      CREATE TABLE IF NOT EXISTS pauses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        pointage_id INT NOT NULL,
        debut_pause DATETIME NOT NULL,
        fin_pause DATETIME NULL,
        duree_minutes INT NULL,
        INDEX idx_pointage_id (pointage_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ── 9. notifications
    await connection.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        titre VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type ENUM('info', 'warning', 'success', 'error') DEFAULT 'info',
        date_envoi TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        lu BOOLEAN DEFAULT false,
        date_lecture TIMESTAMP NULL,
        INDEX idx_user_lu (user_id, lu),
        INDEX idx_date (date_envoi)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ── 10. logs
    await connection.query(`
      CREATE TABLE IF NOT EXISTS logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        action VARCHAR(100) NOT NULL,
        details TEXT,
        ip_address VARCHAR(45),
        user_agent TEXT,
        date_action TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user (user_id),
        INDEX idx_date (date_action),
        INDEX idx_action (action)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ── 11. password_reset_tokens
    await connection.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        code VARCHAR(6) NOT NULL,
        expires_at DATETIME NOT NULL,
        used TINYINT(1) DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_code (code)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('✅ Tables créées');

    // ── Réactiver FK et ajouter les contraintes (résout la dépendance circulaire)
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');

    const addFK = async (sql) => {
      try { await connection.query(sql); }
      catch (e) { if (!e.message.includes('Duplicate')) console.warn('⚠️ FK:', e.message); }
    };

    // managers ←→ users  (clé manquante — dépendance circulaire résolue ici)
    await addFK(`ALTER TABLE managers ADD CONSTRAINT fk_managers_users
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`);

    // departements → managers
    await addFK(`ALTER TABLE departements ADD CONSTRAINT fk_dept_manager
      FOREIGN KEY (manager_id) REFERENCES managers(user_id) ON DELETE SET NULL`);

    // users → departements
    await addFK(`ALTER TABLE users ADD CONSTRAINT fk_users_dept
      FOREIGN KEY (departement_id) REFERENCES departements(id) ON DELETE SET NULL`);

    // postes → departements
    await addFK(`ALTER TABLE postes ADD CONSTRAINT fk_postes_dept
      FOREIGN KEY (departement_id) REFERENCES departements(id) ON DELETE CASCADE`);

    // personnel → users, postes
    await addFK(`ALTER TABLE personnel ADD CONSTRAINT fk_personnel_user
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`);
    await addFK(`ALTER TABLE personnel ADD CONSTRAINT fk_personnel_poste
      FOREIGN KEY (poste_id) REFERENCES postes(id) ON DELETE RESTRICT`);

    // stagiaires → users (x2)
    await addFK(`ALTER TABLE stagiaires ADD CONSTRAINT fk_stagiaires_user
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`);
    await addFK(`ALTER TABLE stagiaires ADD CONSTRAINT fk_stagiaires_encadrant
      FOREIGN KEY (encadrant_id) REFERENCES users(id) ON DELETE SET NULL`);

    // pointages → users
    await addFK(`ALTER TABLE pointages ADD CONSTRAINT fk_pointages_user
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`);

    // pauses → pointages
    await addFK(`ALTER TABLE pauses ADD CONSTRAINT fk_pauses_pointage
      FOREIGN KEY (pointage_id) REFERENCES pointages(id) ON DELETE CASCADE`);

    // notifications → users
    await addFK(`ALTER TABLE notifications ADD CONSTRAINT fk_notifs_user
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`);

    // logs → users
    await addFK(`ALTER TABLE logs ADD CONSTRAINT fk_logs_user
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL`);

    // password_reset_tokens → users
    await addFK(`ALTER TABLE password_reset_tokens ADD CONSTRAINT fk_prt_user
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`);

    console.log('✅ Toutes les clés étrangères ajoutées');
    console.log('\n🎉 Base de données initialisée avec succès !');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    throw error;
  } finally {
    if (connection) await connection.end();
  }
};

initDatabase()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
