const mysql = require('mysql2/promise');
require('dotenv').config();
const debug = require('debug')('bubbletech:db');

// Pool de connexions pour de meilleures performances
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_NAME || 'bubbletech_pointage',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Émettre un warning à chaque erreur de pool
pool.on('error', (err) => {
  console.error('❌ Erreur de pool de connexion MySQL:', err.message);
  debug(`Pool error details: ${JSON.stringify(err)}`);
});

// Test de connexion
const testConnection = async () => {
  try {
    debug(`Tentative de connexion à MySQL (host: ${process.env.DB_HOST}, user: ${process.env.DB_USER}, db: ${process.env.DB_NAME})`);
    
    const connection = await pool.getConnection();
    
    // Tester une requête simple
    const result = await connection.query('SELECT 1 as test');
    
    console.log('✅ Connexion à MySQL réussie');
    debug(`Base de données: ${process.env.DB_NAME}`);
    
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Erreur de connexion à MySQL:', error.message);
    debug(`Détails de l'erreur: ${JSON.stringify(error)}`);
    console.error('💡 Vérifiez votre configuration .env:');
    console.error(`   - DB_HOST: ${process.env.DB_HOST || 'localhost'}`);
    console.error(`   - DB_USER: ${process.env.DB_USER || 'root'}`);
    console.error(`   - DB_NAME: ${process.env.DB_NAME || 'bubbletech_pointage'}`);
    return false;
  }
};

module.exports = { pool, testConnection };
