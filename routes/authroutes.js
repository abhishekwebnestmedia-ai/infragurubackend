const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authmiddleware');
const Image = require('../middleware/image');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authMiddleware, authController.logout);
router.post('/forgot-password', authController.forgotPassword);
router.get('/profile', authMiddleware, authController.getProfile);
router.post('/reset-password', authController.resetPassword);
router.get('/alluser', authMiddleware,authController.getAllUsers);
router.get('/loggedinUser', authMiddleware, authController.getLoggedInUsers);
router.get('/activeuser', authMiddleware, authController.getUsersLoginStatusSimple);
router.put('/change-role/:userId', authMiddleware, authController.changeUserRole);
router .get("/teams",authMiddleware, authController.getTeams);
router.put('/agent', authMiddleware, authController.updateAgentStatus);


router.put(
  '/update',
  authMiddleware,
   Image.single('profileImage'),    
  authController.updateUser
);

router.put('/permissions', authMiddleware, authController.updateUserPermissions);




module.exports = router;
