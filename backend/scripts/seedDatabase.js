const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const seed = async () => {
  let connection;

  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD ?? '',
      port: process.env.DB_PORT || 3306,
      database: process.env.DB_NAME || 'bubbletech_pointage',
    });

    console.log('🌱 Démarrage du seeding...\n');

    // ── Nettoyage dans l'ordre inverse des FK ──────────────────────────────
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const t of ['logs','notifications','pointages','stagiaires','personnel','postes','managers','users','departements']) {
      await connection.query(`TRUNCATE TABLE ${t}`);
    }
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('🧹 Tables vidées');

    const hash = (pwd) => bcrypt.hashSync(pwd, 10);

    // ── 1. Départements ────────────────────────────────────────────────────
    const [deptResult] = await connection.query(`
      INSERT INTO departements (nom, description) VALUES
        ('Informatique',         'Développement logiciel et infrastructure IT'),
        ('Ressources Humaines',  'Gestion du personnel et recrutement'),
        ('Finance',              'Comptabilité, budget et trésorerie'),
        ('Commercial',           'Ventes, relation client et marketing')
    `);
    const deptBase = deptResult.insertId; // id du 1er département inséré
    const deptIT  = deptBase;
    const deptRH  = deptBase + 1;
    const deptFIN = deptBase + 2;
    const deptCOM = deptBase + 3;
    console.log('✅ Départements créés');

    // ── 2. Postes ──────────────────────────────────────────────────────────
    await connection.query(`
      INSERT INTO postes (nom, departement_id, description) VALUES
        ('Développeur Full-Stack', ${deptIT},  'Dev React / Node.js'),
        ('DevOps',                 ${deptIT},  'CI/CD, Docker, cloud'),
        ('Chargé RH',              ${deptRH},  'Recrutement et administration'),
        ('Comptable',              ${deptFIN}, 'Tenue des comptes'),
        ('Commercial Junior',      ${deptCOM}, 'Prospection et suivi client'),
        ('Commercial Senior',      ${deptCOM}, 'Grands comptes')
    `);
    console.log('✅ Postes créés');

    // Récupérer les IDs des postes
    const [postes] = await connection.query('SELECT id, nom FROM postes ORDER BY id');
    const posteMap = {};
    postes.forEach(p => { posteMap[p.nom] = p.id; });

    // ── 3. Utilisateurs ────────────────────────────────────────────────────
    // Mot de passe commun pour tous les tests : Test1234!
    const pwd = hash('Test1234!');

    const [uRes] = await connection.query(`
      INSERT INTO users (nom, prenom, email, password, role, departement_id, code_secret, actif) VALUES
        ('Admin',    'Super',   'admin@bubbletech.be',    '${pwd}', 'admin',     NULL,       '0000', 1),
        ('Houari',   'Yassine', 'yassine@bubbletech.be',  '${pwd}', 'manager',   ${deptIT},  '1111', 1),
        ('Dupont',   'Marie',   'marie@bubbletech.be',    '${pwd}', 'manager',   ${deptRH},  '2222', 1),
        ('Martin',   'Lucas',   'lucas@bubbletech.be',    '${pwd}', 'personnel', ${deptIT},  '3333', 1),
        ('Bernard',  'Emma',    'emma@bubbletech.be',     '${pwd}', 'personnel', ${deptIT},  '4444', 1),
        ('Leroy',    'Tom',     'tom@bubbletech.be',      '${pwd}', 'personnel', ${deptRH},  '5555', 1),
        ('Moreau',   'Claire',  'claire@bubbletech.be',   '${pwd}', 'personnel', ${deptFIN}, '6666', 1),
        ('Simon',    'Paul',    'paul@bubbletech.be',     '${pwd}', 'personnel', ${deptCOM}, '7777', 1),
        ('Petit',    'Léa',     'lea@bubbletech.be',      '${pwd}', 'stagiaire', ${deptIT},  '8888', 1),
        ('Durand',   'Noah',    'noah@bubbletech.be',     '${pwd}', 'stagiaire', ${deptCOM}, '9999', 1)
    `);
    const uBase = uRes.insertId;
    const [idAdmin, idYassine, idMarie, idLucas, idEmma, idTom, idClaire, idPaul, idLea, idNoah]
      = Array.from({ length: 10 }, (_, i) => uBase + i);
    console.log('✅ Utilisateurs créés');

    // ── 4. Managers ────────────────────────────────────────────────────────
    await connection.query(`
      INSERT INTO managers (user_id, date_nomination) VALUES
        (${idYassine}, '2023-01-15'),
        (${idMarie},   '2022-06-01')
    `);

    // Lier les managers à leurs départements
    await connection.query(`UPDATE departements SET manager_id = ${idYassine} WHERE id = ${deptIT}`);
    await connection.query(`UPDATE departements SET manager_id = ${idMarie}   WHERE id = ${deptRH}`);
    console.log('✅ Managers assignés');

    // ── 5. Personnel ───────────────────────────────────────────────────────
    await connection.query(`
      INSERT INTO personnel (user_id, poste_id, date_embauche, salaire) VALUES
        (${idLucas},  ${posteMap['Développeur Full-Stack']}, '2022-03-01', 3200.00),
        (${idEmma},   ${posteMap['DevOps']},                 '2021-09-15', 3500.00),
        (${idTom},    ${posteMap['Chargé RH']},              '2023-02-01', 2800.00),
        (${idClaire}, ${posteMap['Comptable']},              '2020-11-01', 3000.00),
        (${idPaul},   ${posteMap['Commercial Junior']},      '2024-01-10', 2600.00)
    `);
    console.log('✅ Personnel créé');

    // ── 6. Stagiaires ──────────────────────────────────────────────────────
    await connection.query(`
      INSERT INTO stagiaires (user_id, date_debut, date_fin, encadrant_id) VALUES
        (${idLea},  '2025-02-01', '2025-07-31', ${idYassine}),
        (${idNoah}, '2025-03-01', '2025-08-31', ${idPaul})
    `);
    console.log('✅ Stagiaires créés');

    // ── 7. Pointages (30 derniers jours, jours ouvrés) ─────────────────────
    const workers = [idYassine, idMarie, idLucas, idEmma, idTom, idClaire, idPaul, idLea, idNoah];
    const pointageRows = [];

    for (let d = 29; d >= 1; d--) {
      const date = new Date();
      date.setDate(date.getDate() - d);
      const dow = date.getDay(); // 0=dim, 6=sam
      if (dow === 0 || dow === 6) continue;

      const dateStr = date.toISOString().slice(0, 10);

      for (const uid of workers) {
        // 10% de chance d'absence
        if (Math.random() < 0.10) continue;

        const checkinH = 7 + Math.floor(Math.random() * 2);        // 7h ou 8h
        const checkinM = Math.floor(Math.random() * 60);
        const duree    = 420 + Math.floor(Math.random() * 90);     // 7h à 8h30
        const checkin  = `${dateStr} ${String(checkinH).padStart(2,'0')}:${String(checkinM).padStart(2,'0')}:00`;

        // Hier → pointage "incomplet" pour 5% des cas
        let checkout = null, statut = 'incomplet', dureeMin = null;
        if (d > 1 || Math.random() > 0.05) {
          const totalMin = checkinH * 60 + checkinM + duree;
          const coH = Math.floor(totalMin / 60);
          const coM = totalMin % 60;
          checkout = `${dateStr} ${String(coH).padStart(2,'0')}:${String(coM).padStart(2,'0')}:00`;
          statut   = 'termine';
          dureeMin = duree;
        }

        pointageRows.push(`(${uid}, '${dateStr}', '${checkin}', ${checkout ? `'${checkout}'` : 'NULL'}, '${statut}', ${dureeMin ?? 'NULL'})`);
      }
    }

    // Aujourd'hui : checkin seulement (en_cours)
    const today = new Date().toISOString().slice(0, 10);
    for (const uid of [idYassine, idLucas, idEmma]) {
      pointageRows.push(`(${uid}, '${today}', '${today} 08:00:00', NULL, 'en_cours', NULL)`);
    }

    if (pointageRows.length) {
      await connection.query(
        `INSERT INTO pointages (user_id, date_pointage, checkin_at, checkout_at, statut, duree_travail_minutes) VALUES ${pointageRows.join(',')}`
      );
    }
    console.log(`✅ ${pointageRows.length} pointages créés`);

    // ── 8. Notifications ───────────────────────────────────────────────────
    await connection.query(`
      INSERT INTO notifications (user_id, titre, message, type, lu) VALUES
        (${idYassine}, 'Bienvenue',            'Votre compte manager est activé.',          'success', 1),
        (${idLucas},   'Rappel pointage',       'N''oubliez pas de pointer votre sortie.',   'warning', 0),
        (${idEmma},    'Congé approuvé',        'Votre demande de congé a été acceptée.',     'success', 0),
        (${idAdmin},   'Nouvel utilisateur',    'Noah Durand vient de rejoindre l''équipe.', 'info',    0),
        (${idLea},     'Fin de stage proche',   'Votre stage se termine dans 30 jours.',     'warning', 0)
    `);
    console.log('✅ Notifications créées');

    // ── 9. Logs ────────────────────────────────────────────────────────────
    await connection.query(`
      INSERT INTO logs (user_id, action, details, ip_address) VALUES
        (${idAdmin},   'CREATE_USER',  'Création de l''utilisateur Lucas Martin',  '127.0.0.1'),
        (${idYassine}, 'LOGIN',        'Connexion réussie',                         '127.0.0.1'),
        (${idLucas},   'CHECKIN',      'Pointage entrée enregistré',                '127.0.0.1'),
        (${idEmma},    'CHECKOUT',     'Pointage sortie enregistré',                '127.0.0.1'),
        (${idAdmin},   'UPDATE_USER',  'Mise à jour du rôle de Marie Dupont',       '127.0.0.1')
    `);
    console.log('✅ Logs créés');

    console.log('\n🎉 Seeding terminé avec succès !\n');
    console.log('📋 Comptes de test (mot de passe : Test1234!) :');
    console.log('   admin@bubbletech.be     → admin     (code: 0000)');
    console.log('   yassine@bubbletech.be   → manager   (code: 1111)');
    console.log('   marie@bubbletech.be     → manager   (code: 2222)');
    console.log('   lucas@bubbletech.be     → personnel (code: 3333)');
    console.log('   emma@bubbletech.be      → personnel (code: 4444)');
    console.log('   lea@bubbletech.be       → stagiaire (code: 8888)');
    console.log('   noah@bubbletech.be      → stagiaire (code: 9999)');

  } catch (err) {
    console.error('❌ Erreur seeding:', err.message);
    throw err;
  } finally {
    if (connection) await connection.end();
  }
};

seed()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
