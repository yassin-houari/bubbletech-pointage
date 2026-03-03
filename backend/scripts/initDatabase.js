const mysql = require('mysql2/promise');
require('dotenv').config();

const initDatabase = async () => {
  let connection;
  
  try {
    // Connexion sans spécifier la base de données
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      port: process.env.DB_PORT || 3306
    });

    console.log('📦 Connexion à MySQL établie');

    // Créer la base de données si elle n'existe pas
    const dbName = process.env.DB_NAME || 'bubbletech_pointage';
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbName} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log(`✅ Base de données '${dbName}' créée ou déjà existante`);

    // Utiliser la base de données
    await connection.query(`USE ${dbName}`);

    // Nettoyage des anciennes structures
    await connection.query(`DROP TABLE IF EXISTS specialites_manager`);
    console.log('✅ Ancienne table specialites_manager supprimée si existante');

    // Table User (table mère pour tous les utilisateurs)
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
    console.log('✅ Table users créée');

    // Table Manager
    await connection.query(`
      CREATE TABLE IF NOT EXISTS managers (
        user_id INT PRIMARY KEY,
        date_nomination DATE NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Table managers créée');

    // Table Département (pour normalisation 3NF)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS departements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nom VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        manager_id INT,
        date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (manager_id) REFERENCES managers(user_id) ON DELETE SET NULL,
        INDEX idx_manager_id (manager_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Table departements créée');

    // Migration compat: ajouter users.departement_id si absent
    try {
      await connection.query('ALTER TABLE users ADD COLUMN departement_id INT NULL');
      console.log('✅ Colonne users.departement_id ajoutée');
    } catch (error) {
      if (error.code !== 'ER_DUP_FIELDNAME') {
        throw error;
      }
    }

    // Migration compat: ajouter index users.departement_id si absent
    try {
      await connection.query('CREATE INDEX idx_departement_id ON users(departement_id)');
      console.log('✅ Index users.departement_id ajouté');
    } catch (error) {
      if (error.code !== 'ER_DUP_KEYNAME') {
        throw error;
      }
    }

    // Migration compat: lier users.departement_id -> departements.id
    try {
      await connection.query(
        'ALTER TABLE users ADD CONSTRAINT fk_users_departement FOREIGN KEY (departement_id) REFERENCES departements(id) ON DELETE SET NULL'
      );
      console.log('✅ FK users.departement_id créée');
    } catch (error) {
      if (error.code !== 'ER_DUP_KEY' && error.code !== 'ER_FK_DUP_NAME') {
        throw error;
      }
    }

    // Table Poste (pour normalisation 3NF)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS postes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nom VARCHAR(100) NOT NULL,
        departement_id INT NOT NULL,
        description TEXT,
        date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (departement_id) REFERENCES departements(id) ON DELETE CASCADE,
        UNIQUE KEY unique_poste_dept (nom, departement_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Table postes créée');

    // Table Personnel
    await connection.query(`
      CREATE TABLE IF NOT EXISTS personnel (
        user_id INT PRIMARY KEY,
        poste_id INT NOT NULL,
        date_embauche DATE NOT NULL,
        salaire DECIMAL(10, 2),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (poste_id) REFERENCES postes(id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Table personnel créée');

    // Table Stagiaire
    await connection.query(`
      CREATE TABLE IF NOT EXISTS stagiaires (
        user_id INT PRIMARY KEY,
        date_debut DATE NOT NULL,
        date_fin DATE NOT NULL,
        encadrant_id INT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (encadrant_id) REFERENCES users(id) ON DELETE SET NULL,
        CHECK (date_fin >= date_debut)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Table stagiaires créée');

    // Suppression de la table equipes (remplacée par users.departement_id)
    await connection.query('DROP TABLE IF EXISTS equipes');
    console.log('✅ Table equipes supprimée si existante');

    // Table Pointage (supporte plusieurs sessions par jour)
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
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_date (user_id, date_pointage),
        INDEX idx_user_statut (user_id, statut),
        INDEX idx_checkin_at (checkin_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Table pointages créée (avec checkin_at/checkout_at)');

    // Table Pauses (gestion de plusieurs pauses par session)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS pauses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        pointage_id INT NOT NULL,
        debut_at DATETIME NOT NULL,
        fin_at DATETIME,
        duree_minutes INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (pointage_id) REFERENCES pointages(id) ON DELETE CASCADE,
        INDEX idx_pointage (pointage_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Table pauses créée (avec debut_at/fin_at)');

    // Table Notifications
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
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_lu (user_id, lu),
        INDEX idx_date (date_envoi)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Table notifications créée');

    // Table Logs (pour l'audit et la traçabilité)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        action VARCHAR(100) NOT NULL,
        details TEXT,
        ip_address VARCHAR(45),
        user_agent TEXT,
        date_action TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_user (user_id),
        INDEX idx_date (date_action),
        INDEX idx_action (action)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Table logs créée');

    console.log('\n🎉 Base de données initialisée avec succès !');
    console.log('\n📝 Prochaines étapes :');
    console.log('   1. Vérifiez le fichier .env');
    console.log('   2. Créez un utilisateur administrateur');
    console.log('   3. Lancez le serveur avec "npm run dev"');

  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

// Exécution
initDatabase()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
