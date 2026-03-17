/**
 * viewRoutes.js
 * Path: routes/views/viewRoutes.js
 * Purpose: Handles the serving of HTML files for the frontend.
 * This file allows us to apply protection to specific pages,
 * such as the chat dashboard, ensuring only logged-in users can enter.
 */

const express = require('express');
const path = require('path');
const router = express.Router();
const { protect } = require('../../middleware/authMiddleware');

/**
 * @route   GET /
 * @desc    Serve the Landing Page (Public)
 */
router.get('/', (req, res) => {
    // Adjusted path for routes/views/ subfolder
    res.sendFile(path.join(__dirname, '../../public/index.html'));
});

/**
 * @route   GET /login
 * @desc    Serve the Login Page (Public)
 */
router.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/login.html'));
});

/**
 * @route   GET /register
 * @desc    Serve the Register Page (Public)
 */
router.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/register.html'));
});

/**
 * @route   GET /chat
 * @desc    Serve the Chat Dashboard (Protected)
 * Only accessible if the session is valid and verified.
 */
router.get('/chat', protect, (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/chat.html'));
});

module.exports = router;