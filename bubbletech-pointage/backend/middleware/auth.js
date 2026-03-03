const jwt = require('jsonwebtoken');

// Middleware de vérification du token JWT
const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Accès refusé. Token non fourni.' 
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ 
      success: false, 
      message: 'Token invalide ou expiré.' 
    });
  }
};

// Middleware de vérification du rôle
const checkRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Non authentifié.' 
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Accès refusé. Permissions insuffisantes.' 
      });
    }

    next();
  };
};

// Middleware pour admin uniquement
const isAdmin = checkRole('admin');

// Middleware pour admin ou manager
const isAdminOrManager = checkRole('admin', 'manager');

// Middleware pour bloquer les tokens de pointage rapide hors interface pointage
const requireFullAccess = (req, res, next) => {
  if (req.user?.pointage_only) {
    return res.status(403).json({
      success: false,
      message: 'Accès limité au pointage rapide uniquement.'
    });
  }
  next();
};

module.exports = {
  verifyToken,
  checkRole,
  isAdmin,
  isAdminOrManager,
  requireFullAccess
};
