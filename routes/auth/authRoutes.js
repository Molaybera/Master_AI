/**
 * authRoutes.js
 * Purpose: Routes all authentication-related API calls to their respective controllers.
 * Updated: Added the /me (profile) route protected by authMiddleware to verify sessions.
 */

const express = require('express');
const router = express.Router();

// Importing middleware
const { protect } = require('../../middleware/authMiddleware');

// Importing granular controllers
const register = require('../../controllers/auth/registerController');
const login = require('../../controllers/auth/loginController');
const verifyOtp = require('../../controllers/auth/verifyOtpController');
const logout = require('../../controllers/auth/logoutController');
const getProfile = require('../../controllers/auth/profileController');

/**
 * @route   POST /api/auth/register
 * @desc    Handle new user registration
 */
router.post('/register', register);

/**
 * @route   POST /api/auth/login
 * @desc    Initial login step (verify password and send OTP)
 */
router.post('/login', login);

/**
 * @route   POST /api/auth/verify-otp
 * @desc    Second login step (verify OTP and create session)
 */
router.post('/verify-otp', verifyOtp);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile (Requires Session)
 */
router.get('/me', protect, getProfile);

/**
 * @route   POST /api/auth/logout
 * @desc    Destroy session and logout user
 */
router.post('/logout', logout);

module.exports = router;