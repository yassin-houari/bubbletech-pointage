const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { verifyToken, isAdmin } = require('../middleware/auth');

router.use(verifyToken);

// Déclenchement manuel des rappels/alertes quotidiens (admin uniquement)
router.post('/daily-reminders', isAdmin, notificationController.sendDailyPointageReminders);

module.exports = router;
