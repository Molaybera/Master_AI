/**
 * systemRoutes.js
 * Purpose: Routes AI system agent commands (file/folder management) to the controller.
 */

const express = require('express');
const router = express.Router();

const { protect } = require('../../middleware/authMiddleware');
const { executeSystemCommand, getCwd, resetCwd } = require('../../controllers/modelService/systemController');


router.post('/execute', protect, executeSystemCommand);
router.get('/cwd', protect, getCwd);
router.post('/reset-cwd', protect, resetCwd);

module.exports = router;