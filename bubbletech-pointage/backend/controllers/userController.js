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

const getOrCreateDepartement = async (connection, nom) => {
  const [existing] = await connection.query(
    'SELECT id FROM departements WHERE nom = ?',
    [nom]
  );
  if (existing.length > 0) {
    return existing[0].id;
  }

  const [result] = await connection.query(
    'INSERT INTO departements (nom) VALUES (?)',
    [nom]
  );
  return result.insertId;
};

const getOrCreatePoste = async (connection, posteNom, departementNom = 'General') => {
  const departementId = await getOrCreateDepartement(connection, departementNom);
  const [existing] = await connection.query(
    'SELECT id FROM postes WHERE nom = ? AND departement_id = ?',
    [posteNom, departementId]
  );
  if (existing.length > 0) {
    return existing[0].id;
  }

  const [result] = await connection.query(
    'INSERT INTO postes (nom, departement_id) VALUES (?, ?)',
    [posteNom, departementId]
  );
  return result.insertId;
};

const getManagerDepartementIds = async (connection, managerId) => {
  const [rows] = await connection.query(
    'SELECT id FROM departements WHERE manager_id = ?',
    [managerId]
  );
  let ids = rows.map((row) => Number(row.id));

  if (ids.length === 0) {
    const [managerRows] = await connection.query(
      'SELECT departement_id FROM users WHERE id = ? LIMIT 1',
      [managerId]
    );

    const fallbackDepartementId = managerRows?.[0]?.departement_id;
    if (fallbackDepartementId) {
      await connection.query(
        'UPDATE departements SET manager_id = ? WHERE id = ? AND (manager_id IS NULL OR manager_id = ?)',
        [managerId, fallbackDepartementId, managerId]
      );

      const [retryRows] = await connection.query(
        'SELECT id FROM departements WHERE manager_id = ?',
        [managerId]
      );
      ids = retryRows.map((row) => Number(row.id));
    }
  }

  return ids;
};

const isUserManagedByManager = async (connection, managerId, userId) => {
  const [rows] = await connection.query(
    `SELECT 1
     FROM users u
     WHERE u.id = ?
       AND u.departement_id IN (SELECT id FROM departements WHERE manager_id = ?)
     LIMIT 1`,
    [userId, managerId]
  );
  return rows.length > 0;
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
      password,
      doit_changer_mdp,
      code_secret,
      // Données personnel
      poste_id,
      poste_nom,
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

    // Mot de passe : si fourni, hasher, sinon générer un mot de passe temporaire
    let temporaryPassword = null;
    let hashedPassword;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    } else {
      temporaryPassword = generateRandomPassword();
      hashedPassword = await bcrypt.hash(temporaryPassword, 10);
    }

    // Code secret : si fourni, valider et vérifier l'unicité
    let codeSecret;
    if (code_secret) {
      if (!/^\d{4}$/.test(code_secret)) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: 'Code secret invalide (4 chiffres requis)'
        });
      }
      const [existingCode] = await connection.query(
        'SELECT id FROM users WHERE code_secret = ?',
        [code_secret]
      );
      if (existingCode.length > 0) {
        await connection.rollback();
        return res.status(409).json({
          success: false,
          message: 'Ce code secret est deja utilise'
        });
      }
      codeSecret = code_secret;
    } else {
      codeSecret = await generateUniqueCode();
    }

    // doit_changer_mdp : si fourni, respecter ; sinon forcer si mot de passe généré
    const forceChange = typeof doit_changer_mdp !== 'undefined' ? !!doit_changer_mdp : (temporaryPassword !== null);

    let resolvedDepartementId = null;
    if (role === 'personnel') {
      let resolvedPosteId = poste_id;
      if (!resolvedPosteId && poste_nom) {
        resolvedPosteId = await getOrCreatePoste(connection, poste_nom);
      }

      if (!resolvedPosteId || !date_embauche) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: 'Poste et date d\'embauche requis pour un personnel'
        });
      }

      const [posteRows] = await connection.query(
        'SELECT departement_id FROM postes WHERE id = ?',
        [resolvedPosteId]
      );
      if (posteRows.length > 0) {
        resolvedDepartementId = posteRows[0].departement_id;
      }
    }

    // Créer l'utilisateur
    const [userResult] = await connection.query(
      `INSERT INTO users (nom, prenom, email, password, role, departement_id, code_secret, doit_changer_mdp, actif)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [nom, prenom, email, hashedPassword, role, resolvedDepartementId, codeSecret, forceChange, true]
    );

    const userId = userResult.insertId;

    // Créer les données spécifiques selon le rôle
    if (role === 'personnel') {
      let resolvedPosteId = poste_id;
      if (!resolvedPosteId && poste_nom) {
        resolvedPosteId = await getOrCreatePoste(connection, poste_nom);
      }

      if (!resolvedPosteId || !date_embauche) {
        await connection.rollback();
        return res.status(400).json({ 
          success: false, 
          message: 'Poste et date d\'embauche requis pour un personnel' 
        });
      }

      await connection.query(
        'INSERT INTO personnel (user_id, poste_id, date_embauche, salaire) VALUES (?, ?, ?, ?)',
        [userId, resolvedPosteId, date_embauche, salaire || null]
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

    const responsePayload = {
      success: true,
      message: 'Utilisateur créé avec succès',
      userId,
      codeSecret
    };
    if (temporaryPassword) {
      responsePayload.temporaryPassword = temporaryPassword; // in production avoid returning
    }

    res.status(201).json(responsePayload);

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
    
    // Base query: join role-specific tables to provide useful metadata
    let query = `
            SELECT u.*,
              p.poste_id, po.nom as poste_nom, d.nom as departement_nom,
             p.date_embauche, p.salaire,
             s.date_debut, s.date_fin,
             m.date_nomination
      FROM users u
      LEFT JOIN personnel p ON u.id = p.user_id
      LEFT JOIN postes po ON p.poste_id = po.id
      LEFT JOIN departements d ON u.departement_id = d.id
      LEFT JOIN stagiaires s ON u.id = s.user_id
      LEFT JOIN managers m ON u.id = m.user_id
      WHERE 1=1
    `;
    
    const params = [];

    // Apply role filter if provided
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

    // If the requester is a manager, restrict the listing to their team + themselves
    if (req.user && req.user.role === 'manager') {
      query += ' AND (u.id = ? OR u.departement_id IN (SELECT id FROM departements WHERE manager_id = ?))';
      params.push(req.user.id, req.user.id);
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

    if (req.user?.role === 'manager' && Number(id) !== Number(req.user.id)) {
      const managed = await isUserManagedByManager(pool, req.user.id, id);
      if (!managed) {
        return res.status(403).json({
          success: false,
          message: 'Accès refusé à cet utilisateur'
        });
      }
    }

    const [users] = await pool.query(
            `SELECT u.*, 
        p.poste_id, po.nom as poste_nom, d.nom as departement_nom,
              p.date_embauche, p.salaire,
              s.date_debut, s.date_fin, s.encadrant_id,
              m.date_nomination
       FROM users u
       LEFT JOIN personnel p ON u.id = p.user_id
       LEFT JOIN postes po ON p.poste_id = po.id
      LEFT JOIN departements d ON u.departement_id = d.id
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

    if (req.user?.role === 'manager' && Number(id) !== Number(req.user.id)) {
      const managed = await isUserManagedByManager(connection, req.user.id, id);
      if (!managed) {
        await connection.rollback();
        return res.status(403).json({
          success: false,
          message: 'Accès refusé à cet utilisateur'
        });
      }
    }

    const {
      nom,
      prenom,
      email,
      actif,
      departement_id,
      password,
      doit_changer_mdp,
      code_secret,
      // Données personnel
      poste_id,
      poste_nom,
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

    if (
      req.user?.role === 'manager' &&
      typeof req.body.role !== 'undefined' &&
      req.body.role !== user.role
    ) {
      await connection.rollback();
      return res.status(403).json({
        success: false,
        message: 'Un manager ne peut pas modifier le rôle'
      });
    }

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
    if (typeof code_secret !== 'undefined' && code_secret !== null && code_secret !== '' && code_secret !== user.code_secret) {
      if (!/^\d{4}$/.test(code_secret)) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: 'Code secret invalide (4 chiffres requis)'
        });
      }
      const [existingCode] = await connection.query(
        'SELECT id FROM users WHERE code_secret = ? AND id != ?',
        [code_secret, id]
      );
      if (existingCode.length > 0) {
        await connection.rollback();
        return res.status(409).json({
          success: false,
          message: 'Ce code secret est deja utilise'
        });
      }
      updateFields.push('code_secret = ?');
      updateValues.push(code_secret);
    }
    if (typeof req.body.role !== 'undefined' && req.body.role !== user.role) {
      updateFields.push('role = ?');
      updateValues.push(req.body.role);
    }
    if (typeof password !== 'undefined' && password !== null && password !== '') {
      // hash the provided password
      const hashed = await bcrypt.hash(password, 10);
      updateFields.push('password = ?');
      updateValues.push(hashed);
      // If caller provided doit_changer_mdp, respect it; otherwise default to true when password changed
      if (typeof doit_changer_mdp !== 'undefined') {
        updateFields.push('doit_changer_mdp = ?');
        updateValues.push(!!doit_changer_mdp);
      } else {
        updateFields.push('doit_changer_mdp = ?');
        updateValues.push(true);
      }
    } else if (typeof doit_changer_mdp !== 'undefined') {
      updateFields.push('doit_changer_mdp = ?');
      updateValues.push(!!doit_changer_mdp);
    }
    if (actif !== undefined) {
      updateFields.push('actif = ?');
      updateValues.push(actif);
    }

    if (typeof departement_id !== 'undefined') {
      if (req.user?.role !== 'admin') {
        await connection.rollback();
        return res.status(403).json({
          success: false,
          message: 'Seul un admin peut modifier le département'
        });
      }

      if (departement_id === null || departement_id === '') {
        updateFields.push('departement_id = ?');
        updateValues.push(null);
      } else {
        const parsedDepartementId = Number(departement_id);
        if (!Number.isInteger(parsedDepartementId) || parsedDepartementId <= 0) {
          await connection.rollback();
          return res.status(400).json({
            success: false,
            message: 'departement_id invalide'
          });
        }

        const [departements] = await connection.query('SELECT id FROM departements WHERE id = ? LIMIT 1', [parsedDepartementId]);
        if (departements.length === 0) {
          await connection.rollback();
          return res.status(404).json({
            success: false,
            message: 'Département non trouvé'
          });
        }

        updateFields.push('departement_id = ?');
        updateValues.push(parsedDepartementId);
      }
    }

    if (updateFields.length > 0) {
      updateValues.push(id);
      await connection.query(
        `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );
    }

    // If the role has changed, handle role-specific records
    const newRole = typeof req.body.role !== 'undefined' ? req.body.role : user.role;
    if (newRole !== user.role) {
      // Remove previous role-specific records if necessary
      if (user.role === 'manager' && newRole !== 'manager') {
        await connection.query('DELETE FROM managers WHERE user_id = ?', [id]);
        await connection.query('UPDATE departements SET manager_id = NULL WHERE manager_id = ?', [id]);
      }
      if (user.role === 'personnel' && newRole !== 'personnel') {
        await connection.query('DELETE FROM personnel WHERE user_id = ?', [id]);
      }
      if (user.role === 'stagiaire' && newRole !== 'stagiaire') {
        await connection.query('DELETE FROM stagiaires WHERE user_id = ?', [id]);
      }

      // Create/update new role-specific records if provided
      if (newRole === 'manager') {
        await connection.query('INSERT INTO managers (user_id, date_nomination) VALUES (?, CURDATE()) ON DUPLICATE KEY UPDATE date_nomination = date_nomination', [id]);
      }
      if (newRole === 'personnel') {
        // require poste_id and date_embauche to create personnel entry; if not provided, create empty placeholder
        const p_poste = req.body.poste_id || null;
        const p_date = req.body.date_embauche || null;
        const p_salaire = typeof req.body.salaire !== 'undefined' ? req.body.salaire : null;
        if (p_poste && p_date) {
          await connection.query(
            `INSERT INTO personnel (user_id, poste_id, date_embauche, salaire) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE poste_id = VALUES(poste_id), date_embauche = VALUES(date_embauche), salaire = VALUES(salaire)`,
            [id, p_poste, p_date, p_salaire]
          );
        }
      }
      if (newRole === 'stagiaire') {
        const s_debut = req.body.date_debut || null;
        const s_fin = req.body.date_fin || null;
        const s_enc = typeof req.body.encadrant_id !== 'undefined' ? req.body.encadrant_id : null;
        if (s_debut && s_fin) {
          await connection.query(
            `INSERT INTO stagiaires (user_id, date_debut, date_fin, encadrant_id) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE date_debut = VALUES(date_debut), date_fin = VALUES(date_fin), encadrant_id = VALUES(encadrant_id)`,
            [id, s_debut, s_fin, s_enc]
          );
        }
      }
    }

    // Mettre à jour les données spécifiques
    if (user.role === 'personnel' && (poste_id || poste_nom || date_embauche || salaire !== undefined)) {
      const personnelFields = [];
      const personnelValues = [];

      if (poste_id) {
        personnelFields.push('poste_id = ?');
        personnelValues.push(poste_id);
      } else if (poste_nom) {
        const resolvedPosteId = await getOrCreatePoste(connection, poste_nom);
        personnelFields.push('poste_id = ?');
        personnelValues.push(resolvedPosteId);
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

        const [deptRows] = await connection.query(
          `SELECT po.departement_id
           FROM personnel p
           INNER JOIN postes po ON po.id = p.poste_id
           WHERE p.user_id = ?`,
          [id]
        );
        if (deptRows.length > 0 && typeof departement_id === 'undefined') {
          await connection.query('UPDATE users SET departement_id = ? WHERE id = ?', [deptRows[0].departement_id, id]);
        }
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

const getManagerTeamMembers = async (req, res) => {
  try {
    const managerId = req.user.id;
    const managedDepartementIds = await getManagerDepartementIds(pool, managerId);
    let managedDepartements = [];

    if (managedDepartementIds.length > 0) {
      const placeholders = managedDepartementIds.map(() => '?').join(', ');
      const [departements] = await pool.query(
        `SELECT id, nom
         FROM departements
         WHERE id IN (${placeholders})
         ORDER BY nom`,
        managedDepartementIds
      );
      managedDepartements = departements;
    }

    if (managedDepartementIds.length === 0) {
      return res.json({
        success: true,
        count: 0,
        managed_departements: [],
        members: []
      });
    }

    const placeholders = managedDepartementIds.map(() => '?').join(', ');
    const [members] = await pool.query(
      `SELECT u.id, u.nom, u.prenom, u.email, u.role, u.actif,
              u.departement_id, d.nom AS departement_nom,
              p.poste_id, po.nom AS poste_nom, p.date_embauche
       FROM users u
       LEFT JOIN personnel p ON p.user_id = u.id
       LEFT JOIN postes po ON po.id = p.poste_id
       LEFT JOIN departements d ON d.id = u.departement_id
       WHERE u.id != ?
         AND u.role IN ('personnel', 'stagiaire')
         AND u.departement_id IN (${placeholders})
       ORDER BY u.nom, u.prenom`,
      [managerId, ...managedDepartementIds]
    );

    res.json({
      success: true,
      count: members.length,
      managed_departements: managedDepartements,
      members
    });
  } catch (error) {
    console.error('Erreur récupération équipe manager:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

const getAssignableUsersForManager = async (req, res) => {
  try {
    const managerId = req.user.id;
    const departementIds = await getManagerDepartementIds(pool, managerId);

    if (departementIds.length === 0) {
      return res.json({ success: true, count: 0, users: [] });
    }

    const placeholders = departementIds.map(() => '?').join(', ');
    const [users] = await pool.query(
      `SELECT u.id, u.nom, u.prenom, u.email, u.role,
              u.departement_id, d.nom AS departement_nom,
              p.poste_id, po.nom AS poste_nom
       FROM users u
       LEFT JOIN personnel p ON p.user_id = u.id
       LEFT JOIN postes po ON po.id = p.poste_id
       LEFT JOIN departements d ON d.id = u.departement_id
       WHERE u.actif = 1
         AND u.id != ?
         AND u.role IN ('personnel', 'stagiaire')
         AND (u.departement_id IS NULL OR u.departement_id NOT IN (${placeholders}))
       ORDER BY u.nom, u.prenom`,
      [managerId, ...departementIds]
    );

    res.json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    console.error('Erreur récupération utilisateurs assignables:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

const addTeamMember = async (req, res) => {
  try {
    const managerId = req.user.id;
    const { membre_id } = req.body;

    if (!membre_id) {
      return res.status(400).json({ success: false, message: 'membre_id requis' });
    }

    const [managerDepartements] = await pool.query(
      'SELECT id FROM departements WHERE manager_id = ?',
      [managerId]
    );

    if (managerDepartements.length === 0) {
      return res.status(400).json({ success: false, message: 'Aucun département assigné au manager' });
    }

    if (managerDepartements.length > 1) {
      return res.status(400).json({ success: false, message: 'Manager lié à plusieurs départements: opération ambiguë' });
    }

    const managerDepartementId = managerDepartements[0].id;

    const [candidate] = await pool.query(
      `SELECT id, role, actif, departement_id
       FROM users
       WHERE id = ?`,
      [membre_id]
    );

    if (candidate.length === 0) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }

    if (!candidate[0].actif) {
      return res.status(400).json({ success: false, message: 'Utilisateur inactif' });
    }

    if (!['personnel', 'stagiaire'].includes(candidate[0].role)) {
      return res.status(400).json({ success: false, message: 'Rôle non éligible à une équipe manager' });
    }

    if (Number(candidate[0].departement_id) === Number(managerDepartementId)) {
      return res.status(409).json({ success: false, message: 'Ce membre est déjà dans votre équipe' });
    }

    await pool.query('UPDATE users SET departement_id = ? WHERE id = ?', [managerDepartementId, membre_id]);

    res.status(201).json({
      success: true,
      message: 'Membre ajouté à votre équipe'
    });
  } catch (error) {
    console.error('Erreur ajout membre équipe:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

const removeTeamMember = async (req, res) => {
  try {
    const managerId = req.user.id;
    const memberId = req.params.memberId;

    const departementIds = await getManagerDepartementIds(pool, managerId);
    if (departementIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Aucun département assigné au manager'
      });
    }

    const placeholders = departementIds.map(() => '?').join(', ');

    const [result] = await pool.query(
      `UPDATE users
       SET departement_id = NULL
       WHERE id = ?
         AND role IN ('personnel', 'stagiaire')
         AND departement_id IN (${placeholders})`,
      [memberId, ...departementIds]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Membre non trouvé dans votre équipe'
      });
    }

    res.json({
      success: true,
      message: 'Membre supprimé de votre équipe'
    });
  } catch (error) {
    console.error('Erreur suppression membre équipe:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

module.exports = {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getManagerTeamMembers,
  getAssignableUsersForManager,
  addTeamMember,
  removeTeamMember
};
