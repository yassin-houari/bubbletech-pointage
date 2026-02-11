const { pool } = require('../config/database');

// Check-in (arrivée)
const checkIn = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const { user_id } = req.body;
    const userId = user_id || req.user.id;
    const today = new Date().toISOString().split('T')[0];

    // Vérifier si un pointage existe déjà aujourd'hui
    const [existingPointages] = await connection.query(
      'SELECT * FROM pointages WHERE user_id = ? AND date_pointage = ?',
      [userId, today]
    );

    if (existingPointages.length > 0) {
      await connection.rollback();
      return res.status(400).json({ 
        success: false, 
        message: 'Vous avez déjà pointé aujourd\'hui' 
      });
    }

    // Créer le pointage
    const heureCheckin = new Date().toTimeString().split(' ')[0];
    const [result] = await connection.query(
      `INSERT INTO pointages (user_id, date_pointage, heure_checkin, statut) 
       VALUES (?, ?, ?, 'en_cours')`,
      [userId, today, heureCheckin]
    );

    await connection.commit();

    res.json({
      success: true,
      message: 'Check-in enregistré avec succès',
      pointage: {
        id: result.insertId,
        user_id: userId,
        date_pointage: today,
        heure_checkin: heureCheckin,
        statut: 'en_cours'
      }
    });

  } catch (error) {
    await connection.rollback();
    console.error('Erreur lors du check-in:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur lors du check-in' 
    });
  } finally {
    connection.release();
  }
};

// Check-out (départ)
const checkOut = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const { user_id } = req.body;
    const userId = user_id || req.user.id;
    const today = new Date().toISOString().split('T')[0];

    // Récupérer le pointage du jour
    const [pointages] = await connection.query(
      'SELECT * FROM pointages WHERE user_id = ? AND date_pointage = ? AND statut = "en_cours"',
      [userId, today]
    );

    if (pointages.length === 0) {
      await connection.rollback();
      return res.status(400).json({ 
        success: false, 
        message: 'Aucun check-in trouvé pour aujourd\'hui' 
      });
    }

    const pointage = pointages[0];
    const heureCheckout = new Date().toTimeString().split(' ')[0];

    // Calculer la durée totale de travail (en minutes)
    const checkinTime = new Date(`${today} ${pointage.heure_checkin}`);
    const checkoutTime = new Date(`${today} ${heureCheckout}`);
    let dureeTravailMinutes = Math.floor((checkoutTime - checkinTime) / 60000);

    // Soustraire les pauses
    const [pauses] = await connection.query(
      'SELECT SUM(duree_minutes) as total_pauses FROM pauses WHERE pointage_id = ?',
      [pointage.id]
    );

    if (pauses[0].total_pauses) {
      dureeTravailMinutes -= pauses[0].total_pauses;
    }

    // Mettre à jour le pointage
    await connection.query(
      `UPDATE pointages 
       SET heure_checkout = ?, statut = 'termine', duree_travail_minutes = ?
       WHERE id = ?`,
      [heureCheckout, dureeTravailMinutes, pointage.id]
    );

    await connection.commit();

    res.json({
      success: true,
      message: 'Check-out enregistré avec succès',
      pointage: {
        id: pointage.id,
        heure_checkout: heureCheckout,
        duree_travail_minutes: dureeTravailMinutes,
        statut: 'termine'
      }
    });

  } catch (error) {
    await connection.rollback();
    console.error('Erreur lors du check-out:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur lors du check-out' 
    });
  } finally {
    connection.release();
  }
};

// Début de pause
const startBreak = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];

    // Récupérer le pointage du jour
    const [pointages] = await connection.query(
      'SELECT * FROM pointages WHERE user_id = ? AND date_pointage = ? AND statut = "en_cours"',
      [userId, today]
    );

    if (pointages.length === 0) {
      await connection.rollback();
      return res.status(400).json({ 
        success: false, 
        message: 'Aucun check-in actif trouvé' 
      });
    }

    const pointage = pointages[0];

    // Vérifier s'il n'y a pas déjà une pause en cours
    const [pausesEnCours] = await connection.query(
      'SELECT * FROM pauses WHERE pointage_id = ? AND heure_fin IS NULL',
      [pointage.id]
    );

    if (pausesEnCours.length > 0) {
      await connection.rollback();
      return res.status(400).json({ 
        success: false, 
        message: 'Une pause est déjà en cours' 
      });
    }

    // Créer la pause
    const heureDebut = new Date().toTimeString().split(' ')[0];
    const [result] = await connection.query(
      'INSERT INTO pauses (pointage_id, heure_debut) VALUES (?, ?)',
      [pointage.id, heureDebut]
    );

    await connection.commit();

    res.json({
      success: true,
      message: 'Pause commencée',
      pause: {
        id: result.insertId,
        pointage_id: pointage.id,
        heure_debut: heureDebut
      }
    });

  } catch (error) {
    await connection.rollback();
    console.error('Erreur lors du début de pause:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  } finally {
    connection.release();
  }
};

// Fin de pause
const endBreak = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];

    // Récupérer le pointage du jour
    const [pointages] = await connection.query(
      'SELECT * FROM pointages WHERE user_id = ? AND date_pointage = ? AND statut = "en_cours"',
      [userId, today]
    );

    if (pointages.length === 0) {
      await connection.rollback();
      return res.status(400).json({ 
        success: false, 
        message: 'Aucun pointage actif trouvé' 
      });
    }

    const pointage = pointages[0];

    // Récupérer la pause en cours
    const [pauses] = await connection.query(
      'SELECT * FROM pauses WHERE pointage_id = ? AND heure_fin IS NULL ORDER BY id DESC LIMIT 1',
      [pointage.id]
    );

    if (pauses.length === 0) {
      await connection.rollback();
      return res.status(400).json({ 
        success: false, 
        message: 'Aucune pause en cours' 
      });
    }

    const pause = pauses[0];
    const heureFin = new Date().toTimeString().split(' ')[0];

    // Calculer la durée de la pause
    const debutTime = new Date(`${today} ${pause.heure_debut}`);
    const finTime = new Date(`${today} ${heureFin}`);
    const dureeMinutes = Math.floor((finTime - debutTime) / 60000);

    // Mettre à jour la pause
    await connection.query(
      'UPDATE pauses SET heure_fin = ?, duree_minutes = ? WHERE id = ?',
      [heureFin, dureeMinutes, pause.id]
    );

    await connection.commit();

    res.json({
      success: true,
      message: 'Pause terminée',
      pause: {
        id: pause.id,
        heure_fin: heureFin,
        duree_minutes: dureeMinutes
      }
    });

  } catch (error) {
    await connection.rollback();
    console.error('Erreur lors de la fin de pause:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  } finally {
    connection.release();
  }
};

// Obtenir les pointages (avec filtres)
const getPointages = async (req, res) => {
  try {
    const { user_id, date_debut, date_fin, statut } = req.query;
    const requesterId = req.user.id;
    const requesterRole = req.user.role;

    let query = `
      SELECT p.*, u.nom, u.prenom, u.email, u.role
      FROM pointages p
      JOIN users u ON p.user_id = u.id
      WHERE 1=1
    `;
    
    const params = [];

    // Filtrer selon les droits
    if (requesterRole === 'personnel' || requesterRole === 'stagiaire') {
      // Les utilisateurs ne voient que leurs propres pointages
      query += ' AND p.user_id = ?';
      params.push(requesterId);
    } else if (requesterRole === 'manager') {
      // Les managers voient les pointages de leur équipe
      query += ` AND p.user_id IN (
        SELECT membre_id FROM equipes WHERE manager_id = ?
        UNION
        SELECT ?
      )`;
      params.push(requesterId, requesterId);
    }
    // Les admins voient tout

    if (user_id) {
      query += ' AND p.user_id = ?';
      params.push(user_id);
    }

    if (date_debut) {
      query += ' AND p.date_pointage >= ?';
      params.push(date_debut);
    }

    if (date_fin) {
      query += ' AND p.date_pointage <= ?';
      params.push(date_fin);
    }

    if (statut) {
      query += ' AND p.statut = ?';
      params.push(statut);
    }

    query += ' ORDER BY p.date_pointage DESC, p.heure_checkin DESC';

    const [pointages] = await pool.query(query, params);

    // Récupérer les pauses pour chaque pointage
    for (let pointage of pointages) {
      const [pauses] = await pool.query(
        'SELECT * FROM pauses WHERE pointage_id = ? ORDER BY heure_debut',
        [pointage.id]
      );
      pointage.pauses = pauses;
    }

    res.json({
      success: true,
      count: pointages.length,
      pointages
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des pointages:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
};

// Statistiques de pointage
const getPointageStats = async (req, res) => {
  try {
    const { user_id, date_debut, date_fin } = req.query;
    const requesterId = req.user.id;
    const requesterRole = req.user.role;

    // Construire la requête selon les droits
    let whereClause = '1=1';
    const params = [];

    if (requesterRole === 'personnel' || requesterRole === 'stagiaire') {
      whereClause += ' AND user_id = ?';
      params.push(requesterId);
    } else if (requesterRole === 'manager') {
      whereClause += ` AND user_id IN (
        SELECT membre_id FROM equipes WHERE manager_id = ?
        UNION
        SELECT ?
      )`;
      params.push(requesterId, requesterId);
    }

    if (user_id) {
      whereClause += ' AND user_id = ?';
      params.push(user_id);
    }

    if (date_debut) {
      whereClause += ' AND date_pointage >= ?';
      params.push(date_debut);
    }

    if (date_fin) {
      whereClause += ' AND date_pointage <= ?';
      params.push(date_fin);
    }

    // Statistiques globales
    const [stats] = await pool.query(
      `SELECT 
        COUNT(*) as total_pointages,
        COUNT(CASE WHEN statut = 'termine' THEN 1 END) as pointages_termines,
        COUNT(CASE WHEN statut = 'en_cours' THEN 1 END) as pointages_en_cours,
        COUNT(CASE WHEN statut = 'incomplet' THEN 1 END) as pointages_incomplets,
        AVG(duree_travail_minutes) as duree_moyenne_minutes,
        SUM(duree_travail_minutes) as duree_totale_minutes
       FROM pointages
       WHERE ${whereClause}`,
      params
    );

    res.json({
      success: true,
      stats: stats[0]
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
};

module.exports = {
  checkIn,
  checkOut,
  startBreak,
  endBreak,
  getPointages,
  getPointageStats
};
