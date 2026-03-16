/**
 * Chat.js
 * Purpose: Defines the Mongoose Schema for chat messages.
 * This model stores the conversation history between a user and the AI.
 * It ensures data isolation by linking every message to a specific User ID.
 */

const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true // Optimized for querying messages for a specific user
    },
    role: {
        type: String,
        enum: ['user', 'assistant'],
        required: true
    },
    content: {
        type: String,
        required: true
    },
    metadata: {
        // Optional field for storing model info or cybersecurity tags
        modelUsed: { type: String, default: 'qwen2.5-coder' },
        isSecurityAudit: { type: Boolean, default: false }
    }
}, {
    // Automatically manage 'createdAt' and 'updatedAt'
    timestamps: true
});

// Compound index to quickly fetch history for a user in chronological order
chatSchema.index({ userId: 1, createdAt: 1 });

module.exports = mongoose.model('Chat', chatSchema);