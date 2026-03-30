/**
 * authRoutes.js
 * Purpose: Routes all authentication-related API calls to their respective controllers.
 */

const express = require('express');
const router = express.Router();

// Importing middleware
const { protect } = require('../../middleware/authMiddleware');
const getProfile = require('../../controllers/auth/profileController');

// Importing granular controllers
const register = require('../../controllers/auth/registerController');
const login = require('../../controllers/auth/loginController');
const logout = require('../../controllers/auth/logoutController');


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
 * @route   POST /api/auth/logout
 * @desc    Destroy session and logout user
 */
router.post('/logout', logout);


/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile (Frontend session check)
 */
router.get('/me', protect, getProfile);

module.exports = router;