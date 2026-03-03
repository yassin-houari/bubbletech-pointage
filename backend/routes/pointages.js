const express = require('express');
const router = express.Router();
const pointageController = require('../controllers/pointageController');
const { verifyToken } = require('../middleware/auth');

// Toutes les routes nécessitent authentification
router.use(verifyToken);

// Routes de pointage (accessibles à tous les utilisateurs authentifiés)
router.post('/checkin', pointageController.checkIn);
router.post('/checkout', pointageController.checkOut);

// Consultation des pointages (filtré selon les droits)
router.get('/', pointageController.getPointages);
router.get('/stats', pointageController.getPointageStats);

module.exports = router;
