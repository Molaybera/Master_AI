/**
 * verifyOtpController.js
 * Purpose: Handles OTP verification and explicitly saves the session to prevent loops.
 * Updated: Ensured userId is stringified and added system logs for debugging.
 */

const User = require('../../models/User');

const verifyOtp = async (req, res) => {
    try {
        const { email, otpCode } = req.body;

        if (!email || !otpCode) {
            return res.status(400).json({ success: false, message: "Missing data." });
        }

        const user = await User.findOne({ email });
        
        if (!user || !user.otp || user.otp.code !== otpCode) {
            return res.status(400).json({ success: false, message: "Invalid or missing OTP." });
        }

        if (new Date() > user.otp.expiresAt) {
            user.otp = undefined;
            await user.save();
            return res.status(400).json({ success: false, message: "OTP expired." });
        }

        // Success: Clear OTP and verify user
        user.otp = undefined;
        user.isVerified = true; 
        await user.save();

        // Establish the Session
        // Stringifying the ID ensures compatibility with all session stores
        req.session.userId = user._id.toString();
        req.session.username = user.username;

        console.log(`[AUTH] Session established for user: ${user.username} (${req.session.userId})`);

        /**
         * CRITICAL FIX: Explicitly save the session to the Database 
         * before sending the response. This prevents the "Redirect Loop" 
         * where the next request arrives before the session is saved.
         */
        req.session.save((err) => {
            if (err) {
                console.error("[SESSION SAVE ERROR]:", err);
                return res.status(500).json({ success: false, message: "Session sync failure." });
            }
            
            console.log(`[AUTH] Session saved to store. Dispatching success response.`);
            
            res.status(200).json({ 
                success: true, 
                message: "Uplink granted.",
                user: { username: user.username }
            });
        });

    } catch (error) {
        console.error(`[OTP ERROR]: ${error.message}`);
        res.status(500).json({ success: false, message: "Server error during MFA verification." });
    }
};

module.exports = verifyOtp;