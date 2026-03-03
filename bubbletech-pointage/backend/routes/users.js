const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken, isAdmin, isAdminOrManager, checkRole, requireFullAccess } = require('../middleware/auth');

// Toutes les routes nécessitent authentification
router.use(verifyToken);
router.use(requireFullAccess);

// Routes admin uniquement
router.post('/', isAdmin, userController.createUser);
router.delete('/:id', isAdmin, userController.deleteUser);

// Routes admin et manager
router.get('/', isAdminOrManager, userController.getAllUsers);

// Routes manager: gestion de l'equipe
router.get('/manager/team-members', checkRole('manager'), userController.getManagerTeamMembers);
router.get('/manager/assignable-users', checkRole('manager'), userController.getAssignableUsersForManager);
router.post('/manager/team-members', checkRole('manager'), userController.addTeamMember);
router.delete('/manager/team-members/:memberId', checkRole('manager'), userController.removeTeamMember);

router.get('/:id', isAdminOrManager, userController.getUserById);
router.put('/:id', isAdminOrManager, userController.updateUser);

module.exports = router;
