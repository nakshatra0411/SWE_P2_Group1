const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const auditLogger = require('../middleware/auditLogger');
const { authLimiter } = require('../middleware/rateLimiter');
const avatarUpload = require('../config/multerAvatarConfig');

router.post('/login', authLimiter, auditLogger('LOGIN'), authController.login);
router.post('/logout', authenticate, auditLogger('LOGOUT'), authController.logout);
router.get('/me', authenticate, authController.getMe);
router.patch('/me/avatar', authenticate, avatarUpload.single('avatar'), authController.updateAvatar);

router.post('/forgot-password', authLimiter, auditLogger('FORGOT_PASSWORD'), authController.forgotPassword);
router.post('/reset-password', authLimiter, auditLogger('RESET_PASSWORD'), authController.resetPassword);
router.put('/change-password', authLimiter, authenticate, auditLogger('CHANGE_PASSWORD'), authController.changePassword);

module.exports = router;
