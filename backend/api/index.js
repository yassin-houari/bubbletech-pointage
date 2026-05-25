// Test minimal pour diagnostiquer le crash Vercel
try {
  const app = require('../server');
  module.exports = app;
} catch (err) {
  // Si le serveur crash au chargement, on retourne l'erreur dans la réponse
  module.exports = (req, res) => {
    res.status(500).json({
      error: 'SERVER_LOAD_FAILED',
      message: err.message,
      stack: err.stack
    });
  };
}
