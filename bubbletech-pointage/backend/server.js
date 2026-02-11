const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { testConnection } = require('./config/database');
const { logAction } = require('./middleware/logger');

// Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const pointageRoutes = require('./routes/pointages');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware de sécurité
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Limite de taux pour prévenir les abus
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limite chaque IP à 100 requêtes par fenêtre
  message: 'Trop de requêtes depuis cette IP, veuillez réessayer plus tard.'
});
app.use('/api/', limiter);

// Limite stricte pour les tentatives de connexion
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 tentatives max
  message: 'Trop de tentatives de connexion, veuillez réessayer dans 15 minutes.'
});

// Parsing JSON et URL-encoded
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware de logging
app.use(logAction);

// Routes API
app.use('/api/auth', authRoutes);
app.post('/api/auth/login', loginLimiter); // Ajouter limite pour login
app.post('/api/auth/login-code', loginLimiter);
app.use('/api/users', userRoutes);
app.use('/api/pointages', pointageRoutes);

// Route de test
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'API BubbleTech Pointage est opérationnelle',
    timestamp: new Date().toISOString()
  });
});

// Gestion des routes non trouvées
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route non trouvée' 
  });
});

// Gestion globale des erreurs
app.use((err, req, res, next) => {
  console.error('Erreur serveur:', err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Erreur interne du serveur',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Démarrage du serveur
const startServer = async () => {
  try {
    // Tester la connexion à la base de données
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
      console.error('❌ Impossible de se connecter à la base de données');
      console.log('💡 Vérifiez votre fichier .env et que MySQL est démarré');
      process.exit(1);
    }

    app.listen(PORT, () => {
      console.log('\n🚀 ================================');
      console.log(`   Serveur démarré sur le port ${PORT}`);
      console.log(`   Environnement: ${process.env.NODE_ENV || 'development'}`);
      console.log(`   URL: http://localhost:${PORT}`);
      console.log('   ================================\n');
      console.log('📋 Routes disponibles:');
      console.log(`   - GET  /api/health`);
      console.log(`   - POST /api/auth/login`);
      console.log(`   - POST /api/auth/login-code`);
      console.log(`   - POST /api/auth/request-password-reset`);
      console.log(`   - GET  /api/auth/profile`);
      console.log(`   - POST /api/auth/change-password`);
      console.log(`   - GET  /api/users`);
      console.log(`   - POST /api/users`);
      console.log(`   - GET  /api/users/:id`);
      console.log(`   - PUT  /api/users/:id`);
      console.log(`   - DELETE /api/users/:id`);
      console.log(`   - POST /api/pointages/checkin`);
      console.log(`   - POST /api/pointages/checkout`);
      console.log(`   - POST /api/pointages/break/start`);
      console.log(`   - POST /api/pointages/break/end`);
      console.log(`   - GET  /api/pointages`);
      console.log(`   - GET  /api/pointages/stats`);
      console.log('\n✅ Serveur prêt à recevoir des requêtes\n');
    });

  } catch (error) {
    console.error('❌ Erreur lors du démarrage du serveur:', error);
    process.exit(1);
  }
};

// Gestion propre de l'arrêt
process.on('SIGTERM', () => {
  console.log('\n👋 Arrêt du serveur...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n👋 Arrêt du serveur...');
  process.exit(0);
});

startServer();

module.exports = app;
