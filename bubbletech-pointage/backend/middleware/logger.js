const { pool } = require('../config/database');

// Middleware pour enregistrer les actions dans les logs
const logAction = async (req, res, next) => {
  // Sauvegarder la fonction originale res.json
  const originalJson = res.json;

  // Remplacer res.json pour capturer la réponse
  res.json = function(data) {
    // Seulement logger les actions réussies
    if (data.success && req.user) {
      const action = `${req.method} ${req.originalUrl}`;
      const details = JSON.stringify({
        params: req.params,
        query: req.query,
        body: sanitizeBody(req.body)
      });
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.headers['user-agent'];

      // Log asynchrone sans bloquer la réponse
      logToDatabase(req.user.id, action, details, ipAddress, userAgent)
        .catch(err => console.error('Erreur lors du logging:', err));
    }

    // Appeler la fonction originale
    return originalJson.call(this, data);
  };

  next();
};

// Fonction pour nettoyer les données sensibles avant logging
const sanitizeBody = (body) => {
  if (!body) return {};
  
  const sanitized = { ...body };
  
  // Supprimer les mots de passe et informations sensibles
  const sensitiveFields = ['password', 'newPassword', 'oldPassword', 'code_secret'];
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '***';
    }
  });
  
  return sanitized;
};

// Fonction pour enregistrer dans la base de données
const logToDatabase = async (userId, action, details, ipAddress, userAgent) => {
  try {
    await pool.query(
      `INSERT INTO logs (user_id, action, details, ip_address, user_agent) 
       VALUES (?, ?, ?, ?, ?)`,
      [userId, action, details, ipAddress, userAgent]
    );
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement du log:', error);
  }
};

module.exports = { logAction };
