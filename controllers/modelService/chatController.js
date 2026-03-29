/**
 * chatController.js
 * Path: controllers/modelService/chatController.js
 */

const { generateResponse } = require('../../services/aiService');

const handleChat = async (req, res) => {
    try {
        const { message, history = [] } = req.body;

        if (!message || !message.trim()) {
            return res.status(400).json({ success: false, error: 'Message is required' });
        }

        // Build full message array:
        //   history = previous exchanges [{role:'user'|'assistant', content:'...'}]
        //   current message appended as the last user turn
        const fullHistory = [
            ...history.slice(-16),                          // keep last 8 exchanges (16 messages)
            { role: 'user', content: message.trim() }       // always last
        ];

        const reply = await generateResponse(fullHistory);

        return res.json({ success: true, reply });

    } catch (err) {
        console.error('[handleChat] error:', err.message);
        return res.status(500).json({
            success: false,
            error: err.message,
            reply: JSON.stringify({
                type: 'general',
                topic: 'Server Error',
                content: `<b>Error:</b> ${err.message}<br><br>Make sure Ollama is running and the Master model is loaded.`,
                code: '', items: [], risk_level: 'None', prevention: 'N/A'
            })
        });
    }
};

module.exports = { handleChat };