const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken, isAdmin, isAdminOrManager } = require('../middleware/auth');

// Toutes les routes nécessitent authentification
router.use(verifyToken);

// Routes admin uniquement
router.post('/', isAdmin, userController.createUser);
router.delete('/:id', isAdmin, userController.deleteUser);

// Routes admin et manager
router.get('/', isAdminOrManager, userController.getAllUsers);
router.get('/:id', isAdminOrManager, userController.getUserById);
router.put('/:id', isAdminOrManager, userController.updateUser);

module.exports = router;
