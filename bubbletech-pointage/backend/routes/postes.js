const express = require('express');
const router = express.Router();
const posteController = require('../controllers/posteController');
const { verifyToken, isAdmin, isAdminOrManager } = require('../middleware/auth');

router.use(verifyToken);

router.get('/', isAdminOrManager, posteController.getAllPostes);
router.post('/', isAdmin, posteController.createPoste);

module.exports = router;
