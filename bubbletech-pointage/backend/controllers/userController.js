const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');
const brevoService = require('../services/brevoService');
const { generateRandomPassword } = require('./authController');

// Générer un code secret unique à 4 chiffres
const generateUniqueCode = async () => {
  let code;
  let isUnique = false;

  while (!isUnique) {
    code = Math.floor(1000 + Math.random() * 9000).toString();
    const [existing] = await pool.query('SELECT id FROM users WHERE code_secret = ?', [code]);
    isUnique = existing.length === 0;
  }

  return code;
};

// Créer un utilisateur (personnel ou stagiaire)
const createUser = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const {
      nom,
      prenom,
      email,
      role,
      // Données personnel
      poste_id,
      date_embauche,
      salaire,
      // Données stagiaire
      date_debut,
      date_fin,
      encadrant_id
    } = req.body;

    // Validation
    if (!nom || !prenom || !email || !role) {
      await connection.rollback();
      return res.status(400).json({ 
        success: false, 
        message: 'Données manquantes' 
      });
    }

    if (!['personnel', 'stagiaire', 'manager'].includes(role)) {
      await connection.rollback();
      return res.status(400).json({ 
        success: false, 
        message: 'Rôle invalide' 
      });
    }

    // Vérifier si l'email existe déjà
    const [existingUsers] = await connection.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      await connection.rollback();
      return res.status(409).json({ 
        success: false, 
        message: 'Cet email est déjà utilisé' 
      });
    }

    // Générer mot de passe et code secret
    const temporaryPassword = generateRandomPassword();
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);
    const codeSecret = await generateUniqueCode();

    // Créer l'utilisateur
    const [userResult] = await connection.query(
      `INSERT INTO users (nom, prenom, email, password, role, code_secret, doit_changer_mdp, actif) 
       VALUES (?, ?, ?, ?, ?, ?, true, true)`,
      [nom, prenom, email, hashedPassword, role, codeSecret]
    );

    const userId = userResult.insertId;

    // Créer les données spécifiques selon le rôle
    if (role === 'personnel') {
      if (!poste_id || !date_embauche) {
        await connection.rollback();
        return res.status(400).json({ 
          success: false, 
          message: 'Poste et date d\'embauche requis pour un personnel' 
        });
      }

      await connection.query(
        'INSERT INTO personnel (user_id, poste_id, date_embauche, salaire) VALUES (?, ?, ?, ?)',
        [userId, poste_id, date_embauche, salaire || null]
      );
    } else if (role === 'stagiaire') {
      if (!date_debut || !date_fin) {
        await connection.rollback();
        return res.status(400).json({ 
          success: false, 
          message: 'Dates de début et fin requises pour un stagiaire' 
        });
      }

      await connection.query(
        'INSERT INTO stagiaires (user_id, date_debut, date_fin, encadrant_id) VALUES (?, ?, ?, ?)',
        [userId, date_debut, date_fin, encadrant_id || null]
      );
    } else if (role === 'manager') {
      await connection.query(
        'INSERT INTO managers (user_id, date_nomination) VALUES (?, CURDATE())',
        [userId]
      );
    }

    await connection.commit();

    // Envoyer l'email de bienvenue
    const newUser = {
      id: userId,
      nom,
      prenom,
      email,
      code_secret: codeSecret
    };
    
    await brevoService.sendWelcomeEmail(newUser, temporaryPassword);

    res.status(201).json({
      success: true,
      message: 'Utilisateur créé avec succès',
      userId,
      temporaryPassword, // En production, ne pas retourner ceci
      codeSecret
    });

  } catch (error) {
    await connection.rollback();
    console.error('Erreur lors de la création de l\'utilisateur:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur lors de la création' 
    });
  } finally {
    connection.release();
  }
};

// Obtenir tous les utilisateurs (avec filtres)
const getAllUsers = async (req, res) => {
  try {
    const { role, actif, search } = req.query;
    
    let query = `
      SELECT u.*, 
             p.poste_id, po.nom as poste_nom, d.nom as departement_nom,
             p.date_embauche, p.salaire,
             s.date_debut, s.date_fin,
             m.date_nomination
      FROM users u
      LEFT JOIN personnel p ON u.id = p.user_id
      LEFT JOIN postes po ON p.poste_id = po.id
      LEFT JOIN departements d ON po.departement_id = d.id
      LEFT JOIN stagiaires s ON u.id = s.user_id
      LEFT JOIN managers m ON u.id = m.user_id
      WHERE 1=1
    `;
    
    const params = [];

    if (role) {
      query += ' AND u.role = ?';
      params.push(role);
    }

    if (actif !== undefined) {
      query += ' AND u.actif = ?';
      params.push(actif === 'true' ? 1 : 0);
    }

    if (search) {
      query += ' AND (u.nom LIKE ? OR u.prenom LIKE ? OR u.email LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    query += ' ORDER BY u.nom, u.prenom';

    const [users] = await pool.query(query, params);

    // Supprimer les mots de passe
    const usersWithoutPassword = users.map(({ password, ...user }) => user);

    res.json({
      success: true,
      count: usersWithoutPassword.length,
      users: usersWithoutPassword
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
};

// Obtenir un utilisateur par ID
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const [users] = await pool.query(
      `SELECT u.*, 
              p.poste_id, po.nom as poste_nom, d.nom as departement_nom,
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
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Utilisateur non trouvé' 
      });
    }

    const { password, ...userWithoutPassword } = users[0];

    res.json({
      success: true,
      user: userWithoutPassword
    });

  } catch (error) {
    console.error('Erreur lors de la récupération de l\'utilisateur:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
};

// Mettre à jour un utilisateur
const updateUser = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const {
      nom,
      prenom,
      email,
      actif,
      // Données personnel
      poste_id,
      date_embauche,
      salaire,
      // Données stagiaire
      date_debut,
      date_fin,
      encadrant_id
    } = req.body;

    // Vérifier que l'utilisateur existe
    const [users] = await connection.query('SELECT * FROM users WHERE id = ?', [id]);
    
    if (users.length === 0) {
      await connection.rollback();
      return res.status(404).json({ 
        success: false, 
        message: 'Utilisateur non trouvé' 
      });
    }

    const user = users[0];

    // Mettre à jour les données de base
    const updateFields = [];
    const updateValues = [];

    if (nom) {
      updateFields.push('nom = ?');
      updateValues.push(nom);
    }
    if (prenom) {
      updateFields.push('prenom = ?');
      updateValues.push(prenom);
    }
    if (email) {
      updateFields.push('email = ?');
      updateValues.push(email);
    }
    if (actif !== undefined) {
      updateFields.push('actif = ?');
      updateValues.push(actif);
    }

    if (updateFields.length > 0) {
      updateValues.push(id);
      await connection.query(
        `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );
    }

    // Mettre à jour les données spécifiques
    if (user.role === 'personnel' && (poste_id || date_embauche || salaire !== undefined)) {
      const personnelFields = [];
      const personnelValues = [];

      if (poste_id) {
        personnelFields.push('poste_id = ?');
        personnelValues.push(poste_id);
      }
      if (date_embauche) {
        personnelFields.push('date_embauche = ?');
        personnelValues.push(date_embauche);
      }
      if (salaire !== undefined) {
        personnelFields.push('salaire = ?');
        personnelValues.push(salaire);
      }

      if (personnelFields.length > 0) {
        personnelValues.push(id);
        await connection.query(
          `UPDATE personnel SET ${personnelFields.join(', ')} WHERE user_id = ?`,
          personnelValues
        );
      }
    }

    if (user.role === 'stagiaire' && (date_debut || date_fin || encadrant_id !== undefined)) {
      const stagiaireFields = [];
      const stagiaireValues = [];

      if (date_debut) {
        stagiaireFields.push('date_debut = ?');
        stagiaireValues.push(date_debut);
      }
      if (date_fin) {
        stagiaireFields.push('date_fin = ?');
        stagiaireValues.push(date_fin);
      }
      if (encadrant_id !== undefined) {
        stagiaireFields.push('encadrant_id = ?');
        stagiaireValues.push(encadrant_id);
      }

      if (stagiaireFields.length > 0) {
        stagiaireValues.push(id);
        await connection.query(
          `UPDATE stagiaires SET ${stagiaireFields.join(', ')} WHERE user_id = ?`,
          stagiaireValues
        );
      }
    }

    await connection.commit();

    res.json({
      success: true,
      message: 'Utilisateur mis à jour avec succès'
    });

  } catch (error) {
    await connection.rollback();
    console.error('Erreur lors de la mise à jour:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur lors de la mise à jour' 
    });
  } finally {
    connection.release();
  }
};

// Supprimer un utilisateur
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier que l'utilisateur existe
    const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
    
    if (users.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Utilisateur non trouvé' 
      });
    }

    // Supprimer l'utilisateur (cascade supprimera les données liées)
    await pool.query('DELETE FROM users WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Utilisateur supprimé avec succès'
    });

  } catch (error) {
    console.error('Erreur lors de la suppression:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur lors de la suppression' 
    });
  }
};

module.exports = {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser
};
