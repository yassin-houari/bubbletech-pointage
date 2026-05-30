const { pool } = require('../config/database');
require('dotenv').config();

const migrate = async () => {
  const connection = await pool.getConnection();
  try {
    console.log('🔧 Migration de la base de données...\n');

    const run = async (label, sql) => {
      try {
        await connection.query(sql);
        console.log(`✅ ${label}`);
      } catch (e) {
        if (e.message.includes('Duplicate') || e.message.includes("doesn't exist")) {
          console.log(`⏭️  ${label} (déjà fait)`);
        } else {
          console.warn(`⚠️  ${label}: ${e.message}`);
        }
      }
    };

    await connection.query('SET FOREIGN_KEY_CHECKS = 0');

    // 1. Supprimer la table specialites (inutilisée)
    await run('Supprimer specialites', 'DROP TABLE IF EXISTS specialites');

    // 2. Ajouter la FK manquante : managers → users
    await run(
      'FK managers → users',
      `ALTER TABLE managers ADD CONSTRAINT fk_managers_users
       FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`
    );

    // 3. Créer password_reset_tokens si elle n'existe pas
    await run(
      'Créer password_reset_tokens',
      `CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        code VARCHAR(6) NOT NULL,
        expires_at DATETIME NOT NULL,
        used TINYINT(1) DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_code (code)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    );

    // 4. Ajouter FK password_reset_tokens → users
    await run(
      'FK password_reset_tokens → users',
      `ALTER TABLE password_reset_tokens ADD CONSTRAINT fk_prt_user
       FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`
    );

    await connection.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log('\n🎉 Migration terminée avec succès !');
  } catch (err) {
    console.error('❌ Erreur migration:', err.message);
  } finally {
    connection.release();
    process.exit(0);
  }
};

migrate();
