jest.mock('../config/database', () => ({
  pool: {
    query: jest.fn()
  }
}));

jest.mock('bcryptjs', () => ({
  compare: jest.fn()
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn()
}));

const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authController = require('../controllers/authController');

const createRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('authController token scope', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('login (email/password) emits full-access token (pointage_only=false)', async () => {
    const req = { body: { email: 'admin@test.com', password: 'secret' } };
    const res = createRes();

    pool.query.mockResolvedValueOnce([[{
      id: 1,
      email: 'admin@test.com',
      role: 'admin',
      nom: 'Admin',
      prenom: 'Super',
      password: 'hashed',
      actif: true
    }]]);
    bcrypt.compare.mockResolvedValueOnce(true);
    jwt.sign.mockReturnValueOnce('full-token');

    await authController.login(req, res);

    expect(jwt.sign).toHaveBeenCalledTimes(1);
    const payload = jwt.sign.mock.calls[0][0];
    expect(payload.pointage_only).toBe(false);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        token: 'full-token'
      })
    );
  });

  test('pointage direct emits limited token (pointage_only=true)', async () => {
    const req = { body: { code_secret: '1234' } };
    const res = createRes();

    pool.query.mockResolvedValueOnce([[{
      id: 2,
      email: 'user@test.com',
      role: 'personnel',
      nom: 'User',
      prenom: 'Test',
      password: 'hashed',
      actif: true,
      code_secret: '1234'
    }]]);
    jwt.sign.mockReturnValueOnce('pointage-token');

    await authController.loginWithCodeDirect(req, res);

    expect(jwt.sign).toHaveBeenCalledTimes(1);
    const payload = jwt.sign.mock.calls[0][0];
    expect(payload.pointage_only).toBe(true);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        token: 'pointage-token'
      })
    );
  });
});
