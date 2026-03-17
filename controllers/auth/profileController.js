/**
 * profileController.js
 * Purpose: Handles fetching the currently logged-in user's data.
 * This relies on the session middleware to provide the userId.
 */

const User = require('../../models/User');

const getProfile = async (req, res) => {
    try {
        // 1. Get the User ID from the session (set during verify-otp)
        const userId = req.session.userId;

        // 2. Fetch user data from DB (excluding password)
        const user = await User.findById(userId).select('-password');

        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: "User not found." 
            });
        }

        // 3. Return user details
        res.status(200).json({
            success: true,
            user
        });
    } catch (error) {
        console.error(`[PROFILE ERROR]: ${error.message}`);
        res.status(500).json({ 
            success: false, 
            message: "Server error fetching profile." 
        });
    }
};

module.exports = getProfile;