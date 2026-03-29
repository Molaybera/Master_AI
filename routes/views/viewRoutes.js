/**
 * viewRoutes.js
 * Path: routes/views/viewRoutes.js
 * Purpose: Handles the serving of HTML files for the frontend.
 * Fix: Adjusted relative path to reach the root middleware folder.
 */

const express = require('express');
const path = require('path');
const router = express.Router();

// Go up TWO levels (../../) to get out of 'routes/views/' and reach the root 'middleware/'
const { protect, redirectIfAuthenticated } = require('../../middleware/authMiddleware');

/**
 * @route   GET /
 * @desc    Serve the Landing Page (Public)
 */
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/index.html'));
});

/**
 * @route   GET /login
 * @desc    Serve the Login Page
 * Redirects to index if already logged in.
 */
router.get('/login', redirectIfAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/login.html'));
});

/**
 * @route   GET /register
 * @desc    Serve the Register Page
 * Redirects to index if already logged in.
 */
router.get('/register', redirectIfAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/register.html'));
});

/**
 * @route   GET /chat
 * @desc    Serve the Chat Dashboard (Protected)
 */
router.get('/chat', protect, (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/chat.html'));
});

module.exports = router;