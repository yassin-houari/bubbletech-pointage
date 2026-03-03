const express = require('express');
const router = express.Router();
const departementController = require('../controllers/departementController');
const { verifyToken, isAdmin, isAdminOrManager, requireFullAccess } = require('../middleware/auth');

router.use(verifyToken);
router.use(requireFullAccess);

router.get('/', isAdminOrManager, departementController.getAllDepartements);
router.post('/', isAdmin, departementController.createDepartement);

module.exports = router;
