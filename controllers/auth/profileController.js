/**
 * profileController.js
 * Purpose: Handles retrieving and updating user profile settings.
 */

const User = require('../../models/User');
const fs = require('fs');
const path = require('path');

/**
 * @desc    Get user profile data
 * @route   GET /api/auth/me
 */
const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId).select('-vaultKey');
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        res.status(200).json({ 
            success: true, 
            user: {
                username: user.username,
                email: user.email,
                hasAppPassword: !!user.appPassword,
                workspacePath: user.workspacePath || '' // Send the workspace path
            }
        });
    } catch (error) {
        console.error('[PROFILE ERROR]:', error);
        res.status(500).json({ success: false, message: 'Failed to load profile.' });
    }
};

/**
 * @desc    Update user profile (username, appPassword, workspacePath)
 * @route   PUT /api/auth/profile
 */
const updateProfile = async (req, res) => {
    try {
        const { username, appPassword, workspacePath } = req.body;
        const userId = req.session.userId;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        // Update Username
        if (username && username.trim().length >= 3) {
            user.username = username.trim();
        }

        // Update App Password
        if (appPassword !== undefined) {
            user.appPassword = appPassword.trim() === '' ? null : appPassword.trim();
        }

        // Update Workspace Path
        if (workspacePath !== undefined) {
            const rawPath = workspacePath.trim();

            if (rawPath === '') {
                user.workspacePath = null;
                user.currentDirectory = '';
                req.session.cwd = undefined;
            } else {
                const resolvedPath = path.resolve(rawPath);

                if (!path.isAbsolute(resolvedPath)) {
                    return res.status(400).json({
                        success: false,
                        message: 'Workspace path must be an absolute directory path.'
                    });
                }

                if (!fs.existsSync(resolvedPath) || !fs.statSync(resolvedPath).isDirectory()) {
                    return res.status(400).json({
                        success: false,
                        message: 'Workspace path does not exist or is not a folder.'
                    });
                }

                const normalizedPath = resolvedPath.replace(/\\/g, '/');
                user.workspacePath = normalizedPath;
                user.currentDirectory = normalizedPath;
                // Apply new workspace immediately for subsequent system actions.
                req.session.cwd = normalizedPath;
            }
        }

        await user.save();

        res.status(200).json({ 
            success: true, 
            message: 'Profile updated successfully!',
            user: {
                username: user.username,
                email: user.email,
                hasAppPassword: !!user.appPassword,
                workspacePath: user.workspacePath || ''
            }
        });

    } catch (error) {
        console.error('[PROFILE UPDATE ERROR]:', error);
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: 'Username is already taken.' });
        }
        res.status(500).json({ success: false, message: 'Server error updating profile.' });
    }
};

module.exports = { getProfile, updateProfile };