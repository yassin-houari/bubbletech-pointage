const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const emailService = require('../services/emailService');

// Générer un token JWT
const generateToken = (user, options = {}) => {
  const { pointageOnly = false } = options;
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      role: user.role,
      nom: user.nom,
      prenom: user.prenom,
      pointage_only: pointageOnly
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '24h' }
  );
};

// Générer un mot de passe aléatoire
const generateRandomPassword = () => {
  const length = 12;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
};

// Login avec email et mot de passe
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email et mot de passe requis' 
      });
    }

    // Rechercher l'utilisateur
    const [users] = await pool.query(
      'SELECT * FROM users WHERE email = ? AND actif = true',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'Email ou mot de passe incorrect' 
      });
    }

    const user = users[0];

    // Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false, 
        message: 'Email ou mot de passe incorrect' 
      });
    }

    // Générer le token
    const token = generateToken(user);

    // Retourner les informations utilisateur (sans le mot de passe)
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      message: 'Connexion réussie',
      token,
      user: userWithoutPassword
    });

  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur lors de la connexion' 
    });
  }
};

// Verification du code secret (pour pointage) - utilisateur connecte uniquement
const loginWithCode = async (req, res) => {
  try {
    const { code_secret } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Non authentifie'
      });
    }

    if (!code_secret || code_secret.length !== 4) {
      return res.status(400).json({ 
        success: false, 
        message: 'Code secret invalide (4 chiffres requis)' 
      });
    }

    // Verifier que le code correspond a l'utilisateur connecte
    const [users] = await pool.query(
      'SELECT * FROM users WHERE id = ? AND code_secret = ? AND actif = true',
      [userId, code_secret]
    );

    if (users.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'Code secret incorrect' 
      });
    }

    const user = users[0];
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      message: 'Code secret verifie',
      user: userWithoutPassword
    });

  } catch (error) {
    console.error('Erreur lors de la verification du code secret:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur lors de la verification' 
    });
  }
};

// Login direct pour pointage (avant connexion classique)
const loginWithCodeDirect = async (req, res) => {
  try {
    const { code_secret } = req.body;

    if (!code_secret || !/^\d{4}$/.test(code_secret)) {
      return res.status(400).json({
        success: false,
        message: 'Code secret invalide (4 chiffres requis)'
      });
    }

    const [users] = await pool.query(
      'SELECT * FROM users WHERE code_secret = ? AND actif = true LIMIT 1',
      [code_secret]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Code secret incorrect'
      });
    }

    const user = users[0];
    const token = generateToken(user, { pointageOnly: true });
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      message: 'Connexion pointage réussie',
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Erreur lors de la connexion directe au pointage:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la connexion pointage'
    });
  }
};

// Créer la table des tokens de réinitialisation si elle n'existe pas
const ensureResetTokensTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      code VARCHAR(6) NOT NULL,
      expires_at DATETIME NOT NULL,
      used TINYINT(1) DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user_id (user_id),
      INDEX idx_code (code)
    )
  `);
};

// Générer un code OTP à 6 chiffres
const generateOTPCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Étape 1 : Envoyer un code OTP par email
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email requis' });
    }

    await ensureResetTokensTable();

    const [users] = await pool.query(
      'SELECT id, nom, prenom, email FROM users WHERE email = ? AND actif = true',
      [email]
    );

    // Par sécurité : toujours retourner succès même si email inconnu
    if (users.length === 0) {
      return res.json({
        success: true,
        message: 'Si cet email est enregistré, vous recevrez un code dans quelques instants'
      });
    }

    const user = users[0];
    const code = generateOTPCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Invalider les anciens codes de cet utilisateur
    await pool.query(
      'UPDATE password_reset_tokens SET used = 1 WHERE user_id = ? AND used = 0',
      [user.id]
    );

    // Insérer le nouveau code
    await pool.query(
      'INSERT INTO password_reset_tokens (user_id, code, expires_at) VALUES (?, ?, ?)',
      [user.id, code, expiresAt]
    );

    // Envoyer l'email avec le code
    await emailService.sendPasswordResetCode(user, code);

    console.log(`📧 Code OTP envoyé à ${email} (expire dans 15 min)`);

    res.json({
      success: true,
      message: 'Un code de vérification a été envoyé à votre adresse email'
    });

  } catch (error) {
    console.error('Erreur forgotPassword:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// Étape 2 : Vérifier le code OTP et changer le mot de passe
const resetPasswordWithCode = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email, code et nouveau mot de passe requis'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Le mot de passe doit contenir au moins 8 caractères'
      });
    }

    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({
        success: false,
        message: 'Le code doit contenir exactement 6 chiffres'
      });
    }

    await ensureResetTokensTable();

    // Trouver l'utilisateur
    const [users] = await pool.query(
      'SELECT id, nom, prenom, email FROM users WHERE email = ? AND actif = true',
      [email]
    );

    if (users.length === 0) {
      return res.status(400).json({ success: false, message: 'Email invalide' });
    }

    const user = users[0];

    // Vérifier le code OTP
    const [tokens] = await pool.query(
      `SELECT * FROM password_reset_tokens
       WHERE user_id = ? AND code = ? AND used = 0 AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [user.id, code]
    );

    if (tokens.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Code invalide ou expiré. Veuillez recommencer.'
      });
    }

    // Invalider le token utilisé
    await pool.query(
      'UPDATE password_reset_tokens SET used = 1 WHERE id = ?',
      [tokens[0].id]
    );

    // Hasher et sauvegarder le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query(
      'UPDATE users SET password = ?, doit_changer_mdp = false WHERE id = ?',
      [hashedPassword, user.id]
    );

    console.log(`✅ Mot de passe réinitialisé pour ${email}`);

    res.json({
      success: true,
      message: 'Mot de passe modifié avec succès. Vous pouvez maintenant vous connecter.'
    });

  } catch (error) {
    console.error('Erreur resetPasswordWithCode:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// Demande de réinitialisation de mot de passe (ancienne méthode - conservée pour compatibilité)
const requestPasswordReset = async (req, res) => {
  // Rediriger vers la nouvelle méthode OTP
  return forgotPassword(req, res);
};

// Changer le mot de passe
const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Ancien et nouveau mot de passe requis' 
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ 
        success: false, 
        message: 'Le nouveau mot de passe doit contenir au moins 8 caractères' 
      });
    }

    // Récupérer l'utilisateur
    const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
    
    if (users.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Utilisateur non trouvé' 
      });
    }

    const user = users[0];

    // Vérifier l'ancien mot de passe
    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false, 
        message: 'Ancien mot de passe incorrect' 
      });
    }

    // Hasher et sauvegarder le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query(
      'UPDATE users SET password = ?, doit_changer_mdp = false WHERE id = ?',
      [hashedPassword, userId]
    );

    res.json({
      success: true,
      message: 'Mot de passe modifié avec succès'
    });

  } catch (error) {
    console.error('Erreur lors du changement de mot de passe:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur lors du changement de mot de passe' 
    });
  }
};

// Changer le code secret (PIN)
const changeSecretCode = async (req, res) => {
  try {
    const { oldCode, newCode } = req.body;
    const userId = req.user.id;

    if (!oldCode || !newCode) {
      return res.status(400).json({
        success: false,
        message: 'Ancien et nouveau code secret requis'
      });
    }

    if (!/^\d{4}$/.test(oldCode) || !/^\d{4}$/.test(newCode)) {
      return res.status(400).json({
        success: false,
        message: 'Le code secret doit contenir exactement 4 chiffres'
      });
    }

    if (oldCode === newCode) {
      return res.status(400).json({
        success: false,
        message: 'Le nouveau code secret doit être différent de l\'ancien'
      });
    }

    const [users] = await pool.query('SELECT id, code_secret FROM users WHERE id = ? AND actif = true', [userId]);
    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    if (users[0].code_secret !== oldCode) {
      return res.status(401).json({
        success: false,
        message: 'Ancien code secret incorrect'
      });
    }

    const [existingCode] = await pool.query('SELECT id FROM users WHERE code_secret = ? AND id != ?', [newCode, userId]);
    if (existingCode.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Ce code secret est déjà utilisé'
      });
    }

    await pool.query('UPDATE users SET code_secret = ? WHERE id = ?', [newCode, userId]);

    res.json({
      success: true,
      message: 'Code secret modifié avec succès'
    });
  } catch (error) {
    console.error('Erreur lors du changement du code secret:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors du changement du code secret'
    });
  }
};

// Obtenir le profil de l'utilisateur connecté
const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const [users] = await pool.query(
      `SELECT u.*, 
              p.poste_id, po.nom as poste_nom, po.departement_id, d.nom as departement_nom,
              p.date_embauche, p.salaire,
              s.date_debut, s.date_fin, s.encadrant_id,
              m.date_nomination
       FROM users u
       LEFT JOIN personnel p ON u.id = p.user_id
       LEFT JOIN postes po ON p.poste_id = po.id
       LEFT JOIN departements d ON po.departement_id = d.id
       LEFT JOIN stagiaires s ON u.id = s.user_id
       LEFT JOIN managers m ON u.id = m.user_id
       WHERE u.id = ?`,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Utilisateur non trouvé' 
      });
    }

    const user = users[0];
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      user: userWithoutPassword
    });

  } catch (error) {
    console.error('Erreur lors de la récupération du profil:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
};

module.exports = {
  login,
  loginWithCode,
  loginWithCodeDirect,
  requestPasswordReset,
  forgotPassword,
  resetPasswordWithCode,
  changePassword,
  changeSecretCode,
  getProfile,
  generateRandomPassword
};
