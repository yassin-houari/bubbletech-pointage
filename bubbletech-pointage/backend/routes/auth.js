const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');

// Routes publiques
router.post('/login', authController.login);
router.post('/request-password-reset', authController.requestPasswordReset);

// Routes protégées
router.get('/profile', verifyToken, authController.getProfile);
router.post('/change-password', verifyToken, authController.changePassword);
router.post('/login-code', verifyToken, authController.loginWithCode);

module.exports = router;
