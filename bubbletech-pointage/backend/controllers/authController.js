const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const brevoService = require('../services/brevoService');

// Générer un token JWT
const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      role: user.role,
      nom: user.nom,
      prenom: user.prenom
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

// Login avec code secret (pour pointage)
const loginWithCode = async (req, res) => {
  try {
    const { code_secret } = req.body;

    if (!code_secret || code_secret.length !== 4) {
      return res.status(400).json({ 
        success: false, 
        message: 'Code secret invalide (4 chiffres requis)' 
      });
    }

    // Rechercher l'utilisateur par code
    const [users] = await pool.query(
      'SELECT * FROM users WHERE code_secret = ? AND actif = true',
      [code_secret]
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
      message: 'Authentification réussie',
      user: userWithoutPassword
    });

  } catch (error) {
    console.error('Erreur lors de l\'authentification par code:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur lors de l\'authentification' 
    });
  }
};

// Demande de réinitialisation de mot de passe
const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email requis' 
      });
    }

    // Rechercher l'utilisateur
    const [users] = await pool.query(
      'SELECT * FROM users WHERE email = ? AND actif = true',
      [email]
    );

    if (users.length === 0) {
      // Par sécurité, on retourne toujours un message de succès
      return res.json({
        success: true,
        message: 'Si cet email existe, un nouveau mot de passe a été envoyé'
      });
    }

    const user = users[0];

    // Générer un nouveau mot de passe
    const newPassword = generateRandomPassword();
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Mettre à jour le mot de passe et forcer le changement
    await pool.query(
      'UPDATE users SET password = ?, doit_changer_mdp = true WHERE id = ?',
      [hashedPassword, user.id]
    );

    // Envoyer l'email via Brevo
    await brevoService.sendPasswordResetEmail(user, newPassword);

    res.json({
      success: true,
      message: 'Un nouveau mot de passe a été envoyé par email'
    });

  } catch (error) {
    console.error('Erreur lors de la réinitialisation:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur lors de la réinitialisation' 
    });
  }
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
  requestPasswordReset,
  changePassword,
  getProfile,
  generateRandomPassword
};
