const { pool } = require('../config/database');
const debug = require('debug')('bubbletech:*');

// Middleware pour enregistrer les actions dans les logs
const logAction = async (req, res, next) => {
  const startTime = Date.now();
  
  // Logger les détails de la requête
  console.log(`📥 [${req.method}] ${req.originalUrl}`);
  debug(`Headers: ${JSON.stringify(req.headers)}`);
  debug(`Body: ${JSON.stringify(sanitizeBody(req.body))}`);
  
  // Sauvegarder la fonction originale res.json
  const originalJson = res.json;

  // Remplacer res.json pour capturer la réponse
  res.json = function(data) {
    const duration = Date.now() - startTime;
    console.log(`📤 [${res.statusCode}] ${req.originalUrl} (${duration}ms)`);
    
    // Logger la réponse en développement
    if (process.env.NODE_ENV === 'development') {
      debug(`Response: ${JSON.stringify(data)}`);
    }
    
    // Enregistrer les actions réussies dans la base de données
    if (data.success && req.user) {
      const action = `${req.method} ${req.originalUrl}`;
      const details = JSON.stringify({
        params: req.params,
        query: req.query,
        body: sanitizeBody(req.body),
        response: data.message
      });
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.headers['user-agent'];

      // Log asynchrone sans bloquer la réponse
      logToDatabase(req.user.id, action, details, ipAddress, userAgent)
        .catch(err => console.error('❌ Erreur lors du logging:', err));
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
  const sensitiveFields = ['password', 'newPassword', 'oldPassword', 'code_secret', 'token', 'refreshToken'];
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
    console.error('❌ Erreur lors de l\'enregistrement du log:', error);
  }
};

module.exports = { logAction };

