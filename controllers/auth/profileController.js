/**
 * profileController.js
 * Purpose: Returns the currently logged-in user's data to the frontend.
 */

const User = require('../../models/User');

const getProfile = async (req, res) => {
    try {
        // Ensure userId exists in session
        if (!req.session.userId) {
            return res.status(401).json({ success: false, message: "No active session." });
        }

        // Find user by ID and exclude sensitive data
        const user = await User.findById(req.session.userId).select('-password -otp');
        
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        res.status(200).json({
            success: true,
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        console.error(`[PROFILE ERROR]: ${error.message}`);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};

module.exports = getProfile;