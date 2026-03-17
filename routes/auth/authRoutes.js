/**
 * authRoutes.js
 * Purpose: Routes all authentication-related API calls to their respective controllers.
 * It maps URLs like /register and /login to the specific logic files we created.
 */

const express = require('express');
const router = express.Router();

// Importing granular controllers
const register = require('../../controllers/auth/registerController');
const login = require('../../controllers/auth/loginController');
const verifyOtp = require('../../controllers/auth/verifyOtpController');
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
 * @route   POST /api/auth/verify-otp
 * @desc    Second login step (verify OTP and create session)
 */
router.post('/verify-otp', verifyOtp);

/**
 * @route   POST /api/auth/logout
 * @desc    Destroy session and logout user
 */
router.post('/logout', logout);






module.exports = router;