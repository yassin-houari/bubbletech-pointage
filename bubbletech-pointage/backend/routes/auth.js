const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');

// Routes publiques
router.post('/login', authController.login);
router.post('/login-code', authController.loginWithCode);
router.post('/request-password-reset', authController.requestPasswordReset);

// Routes protégées
router.get('/profile', verifyToken, authController.getProfile);
router.post('/change-password', verifyToken, authController.changePassword);

module.exports = router;
