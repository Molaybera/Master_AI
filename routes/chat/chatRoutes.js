/**
 * chatRoutes.js
 * Purpose: Routes all AI-related communication to the chat controller.
 */

const express = require('express');
const router = express.Router();
const { handleChat } = require('../../controllers/modelService/chatController');
const { protect } = require('../../middleware/authMiddleware');

/**
 * @route   POST /api/chat
 * @desc    Process user message through the Master OS (Ollama)
 * @access  Protected (Requires active session)
 */
router.post('/', protect, handleChat);

module.exports = router;