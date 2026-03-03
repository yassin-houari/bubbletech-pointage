jest.mock('../config/database', () => ({
  pool: {
    query: jest.fn()
  }
}));

jest.mock('../services/brevoService', () => ({
  sendPointageReminderEmail: jest.fn(),
  sendAdminDailyAlertEmail: jest.fn()
}));

const { pool } = require('../config/database');
const brevoService = require('../services/brevoService');
const notificationController = require('../controllers/notificationController');

const createRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('notificationController Brevo daily reminders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('sends reminders and admin alert (admin email: yassinhoua123@gmail.com)', async () => {
    const req = { body: { date: '2026-03-03' } };
    const res = createRes();

    const missingUsers = [
      {
        id: 10,
        nom: 'Dupont',
        prenom: 'Amine',
        email: 'amine.dupont@bubbletech.be',
        role: 'personnel'
      }
    ];

    const admins = [
      {
        id: 1,
        nom: 'Houa',
        prenom: 'Yassin',
        email: 'yassinhoua123@gmail.com'
      }
    ];

    pool.query
      .mockResolvedValueOnce([missingUsers])
      .mockResolvedValueOnce([admins])
      .mockResolvedValueOnce([{ insertId: 100 }])
      .mockResolvedValueOnce([{ insertId: 101 }]);

    brevoService.sendPointageReminderEmail.mockResolvedValue({ success: true });
    brevoService.sendAdminDailyAlertEmail.mockResolvedValue({ success: true });

    await notificationController.sendDailyPointageReminders(req, res);

    expect(brevoService.sendPointageReminderEmail).toHaveBeenCalledTimes(1);
    expect(brevoService.sendPointageReminderEmail).toHaveBeenCalledWith(
      expect.objectContaining({ id: 10, email: 'amine.dupont@bubbletech.be' }),
      expect.any(String)
    );

    expect(brevoService.sendAdminDailyAlertEmail).toHaveBeenCalledTimes(1);
    expect(brevoService.sendAdminDailyAlertEmail).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, email: 'yassinhoua123@gmail.com' }),
      expect.objectContaining({
        missingCount: 1,
        sampleUsers: expect.arrayContaining([
          expect.objectContaining({ id: 10 })
        ])
      })
    );

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        summary: expect.objectContaining({
          date: '2026-03-03',
          missingUsers: 1,
          reminderEmailSent: 1,
          adminAlertSent: 1
        })
      })
    );
  });
});
