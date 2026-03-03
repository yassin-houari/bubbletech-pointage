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
    console.log(`✅ Base de données '${dbName}' créée ou déjà existante`);

    await connection.query(`USE ${dbName}`);

    await connection.query('DROP TABLE IF EXISTS specialites_manager');
    await connection.query('DROP TABLE IF EXISTS equipes');
    await connection.query('DROP TABLE IF EXISTS pauses');
    console.log('✅ Anciennes tables obsolètes supprimées si existantes');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS managers (
        user_id INT PRIMARY KEY,
        date_nomination DATE NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Table managers créée');

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
        INDEX idx_departement_id (departement_id),
        FOREIGN KEY (departement_id) REFERENCES departements(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Table users créée');

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
    console.log('✅ Table pointages créée');

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

initDatabase()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
