const { pool } = require('../config/database');
const brevoService = require('../services/brevoService');

const toDateLabel = (yyyyMmDd) => {
  try {
    return new Date(yyyyMmDd).toLocaleDateString('fr-BE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return yyyyMmDd;
  }
};

const sendDailyPointageReminders = async (req, res) => {
  try {
    const date = req.body?.date || new Date().toISOString().split('T')[0];
    const dateLabel = toDateLabel(date);

    const [missingUsers] = await pool.query(
      `SELECT u.id, u.nom, u.prenom, u.email, u.role
       FROM users u
       LEFT JOIN (
         SELECT DISTINCT user_id
         FROM pointages
         WHERE date_pointage = ?
       ) p ON p.user_id = u.id
       WHERE u.actif = true
         AND u.role IN ('manager', 'personnel', 'stagiaire')
         AND p.user_id IS NULL`,
      [date]
    );

    const [admins] = await pool.query(
      `SELECT id, nom, prenom, email
       FROM users
       WHERE actif = true AND role = 'admin'`
    );

    let reminderEmailSent = 0;
    let reminderEmailFailed = 0;

    for (const user of missingUsers) {
      const result = await brevoService.sendPointageReminderEmail(user, dateLabel);
      if (result.success) reminderEmailSent += 1;
      else reminderEmailFailed += 1;

      await pool.query(
        `INSERT INTO notifications (user_id, titre, message, type)
         VALUES (?, ?, ?, 'warning')`,
        [
          user.id,
          'Rappel de pointage',
          `Aucun pointage détecté pour la journée du ${dateLabel}.`
        ]
      );
    }

    let adminAlertSent = 0;
    let adminAlertFailed = 0;

    for (const admin of admins) {
      const result = await brevoService.sendAdminDailyAlertEmail(admin, {
        dateLabel,
        missingCount: missingUsers.length,
        sampleUsers: missingUsers.slice(0, 10)
      });

      if (result.success) adminAlertSent += 1;
      else adminAlertFailed += 1;

      await pool.query(
        `INSERT INTO notifications (user_id, titre, message, type)
         VALUES (?, ?, ?, 'info')`,
        [
          admin.id,
          'Alerte administrative pointage',
          `${missingUsers.length} utilisateur(s) sans pointage le ${dateLabel}.`
        ]
      );
    }

    return res.json({
      success: true,
      message: 'Traitement des notifications terminé',
      summary: {
        date,
        missingUsers: missingUsers.length,
        reminderEmailSent,
        reminderEmailFailed,
        adminAlertSent,
        adminAlertFailed
      }
    });
  } catch (error) {
    console.error('Erreur lors de l\'envoi des notifications quotidiennes:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de l\'envoi des notifications'
    });
  }
};

module.exports = {
  sendDailyPointageReminders
};
