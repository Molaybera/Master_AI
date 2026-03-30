/**
 * chatRoutes.js
 * Purpose: Routes all AI-related communication to the chat controller.
 */

const express = require('express');
const router = express.Router();
const { handleChat } = require('../../controllers/modelService/chatController');
const { sendEmail } = require('../../controllers/modelService/mailController'); // We will create this next
const { protect } = require('../../middleware/authMiddleware');

/**
 * @route   POST /api/chat
 * @desc    Process user message through the Master OS (Ollama)
 * @access  Protected (Requires active session)
 */
router.post('/', protect, handleChat);

/**
 * @route   POST /api/chat/send-mail
 * @desc    Dispatch an email using the user's saved Google App Password
 * @access  Protected (Requires active session)
 */
router.post('/send-mail', protect, sendEmail);

module.exports = router;