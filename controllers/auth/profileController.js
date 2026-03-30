/**
 * profileController.js
 * Purpose: Handles retrieving and updating user profile settings.
 */

const User = require('../../models/User');

/**
 * @desc    Get user profile data
 * @route   GET /api/auth/profile
 */
const getProfile = async (req, res) => {
    try {
        // Find user by ID stored in session, exclude the vaultKey for security
        const user = await User.findById(req.session.userId).select('-vaultKey');
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        res.status(200).json({ 
            success: true, 
            user: {
                username: user.username,
                email: user.email,
                hasAppPassword: !!user.appPassword // Just send a boolean so the frontend knows if one is set
            }
        });
    } catch (error) {
        console.error('[PROFILE ERROR]:', error);
        res.status(500).json({ success: false, message: 'Failed to load profile.' });
    }
};

/**
 * @desc    Update user profile (username, appPassword)
 * @route   PUT /api/auth/profile
 */
const updateProfile = async (req, res) => {
    try {
        const { username, appPassword } = req.body;
        const userId = req.session.userId;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        // Update fields if provided
        if (username && username.trim().length >= 3) {
            user.username = username.trim();
        }

        // Allow appPassword to be updated. (If they send an empty string, we can clear it)
        if (appPassword !== undefined) {
            user.appPassword = appPassword.trim() === '' ? null : appPassword.trim();
        }

        await user.save();

        res.status(200).json({ 
            success: true, 
            message: 'Profile updated successfully!',
            user: {
                username: user.username,
                email: user.email,
                hasAppPassword: !!user.appPassword
            }
        });

    } catch (error) {
        console.error('[PROFILE UPDATE ERROR]:', error);
        // Handle MongoDB duplicate key error (e.g., username already taken)
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: 'Username is already taken.' });
        }
        res.status(500).json({ success: false, message: 'Server error updating profile.' });
    }
};

module.exports = { getProfile, updateProfile };