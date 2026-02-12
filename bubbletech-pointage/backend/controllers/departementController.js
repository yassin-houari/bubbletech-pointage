const { pool } = require('../config/database');

const getAllDepartements = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, nom, description FROM departements ORDER BY nom'
    );
    res.json({ success: true, departements: rows });
  } catch (error) {
    console.error('Erreur lors de la recuperation des departements:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

const createDepartement = async (req, res) => {
  try {
    const { nom, description } = req.body;
    if (!nom) {
      return res.status(400).json({ success: false, message: 'Nom requis' });
    }

    const [existing] = await pool.query(
      'SELECT id, nom, description FROM departements WHERE nom = ?',
      [nom]
    );
    if (existing.length > 0) {
      return res.json({ success: true, departement: existing[0], created: false });
    }

    const [result] = await pool.query(
      'INSERT INTO departements (nom, description) VALUES (?, ?)',
      [nom, description || null]
    );
    res.status(201).json({
      success: true,
      departement: { id: result.insertId, nom, description: description || null },
      created: true
    });
  } catch (error) {
    console.error('Erreur lors de la creation du departement:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

module.exports = {
  getAllDepartements,
  createDepartement
};
