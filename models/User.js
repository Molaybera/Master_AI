/**
 * User.js
 * Purpose: Defines the Mongoose Schema and Model for users.
 * This file acts as the blueprint for the 'users' collection in MongoDB,
 * ensuring that every user document follows a consistent structure.
 */

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Username is required'],
        unique: true,
        trim: true,
        minlength: [3, 'Username must be at least 3 characters long']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [8, 'Password must be at least 8 characters long']
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    // Automatically manage 'createdAt' and 'updatedAt' fields
    timestamps: true
});

// Export the model so it can be used in our controllers
module.exports = mongoose.model('User', userSchema);