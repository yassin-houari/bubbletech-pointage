const { pool } = require('../config/database');

const getAllPostes = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, nom, departement_id FROM postes ORDER BY nom'
    );
    res.json({ success: true, postes: rows });
  } catch (error) {
    console.error('Erreur lors de la recuperation des postes:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

const createPoste = async (req, res) => {
  try {
    const { nom, departement_id } = req.body;
    if (!nom || !departement_id) {
      return res.status(400).json({ success: false, message: 'Nom et departement requis' });
    }

    const [existing] = await pool.query(
      'SELECT id, nom, departement_id FROM postes WHERE nom = ? AND departement_id = ?',
      [nom, departement_id]
    );
    if (existing.length > 0) {
      return res.json({ success: true, poste: existing[0], created: false });
    }

    const [result] = await pool.query(
      'INSERT INTO postes (nom, departement_id) VALUES (?, ?)',
      [nom, departement_id]
    );
    res.status(201).json({
      success: true,
      poste: { id: result.insertId, nom, departement_id },
      created: true
    });
  } catch (error) {
    console.error('Erreur lors de la creation du poste:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

module.exports = {
  getAllPostes,
  createPoste
};
