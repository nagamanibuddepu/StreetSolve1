const express = require('express');
const router = express.Router();
const { register, loginEmail, requestOTP, verifyOTP, loginGovId, googleCallback, getMe, updateProfile, logout, forgotPassword } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { body } = require('express-validator');
const validate = require('../middleware/validate');

router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name required'),
  body('email').optional().isEmail().withMessage('Invalid email'),
  body('phone').optional().matches(/^[6-9]\d{9}$/).withMessage('Invalid phone'),
  body('password').optional().isLength({ min: 8 }).withMessage('Password min 8 chars'),
], validate, register);
router.post('/login', [body('email').isEmail(), body('password').notEmpty()], validate, loginEmail);
router.post('/otp/request', requestOTP);
router.post('/otp/verify', verifyOTP);
router.post('/govid', loginGovId);
router.post('/google', googleCallback);
router.post('/forgot-password', forgotPassword);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.post('/logout', protect, logout);
module.exports = router;
