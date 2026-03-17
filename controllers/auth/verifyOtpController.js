/**
 * verifyOtpController.js
 * Purpose: Handles the second stage of authentication.
 * It compares the user-provided OTP with the one stored in the database.
 * If valid and not expired, it creates a session and clears the OTP.
 */

const User = require('../../models/User');

const verifyOtp = async (req, res) => {
    try {
        const { username, otpCode } = req.body;

        // 1. Validate Input
        if (!username || !otpCode) {
            return res.status(400).json({ 
                success: false, 
                message: "Username and OTP code are required." 
            });
        }

        // 2. Find User
        const user = await User.findOne({ username });
        if (!user || !user.otp) {
            return res.status(400).json({ 
                success: false, 
                message: "No active OTP found for this user." 
            });
        }

        // 3. Check if OTP is expired
        if (new Date() > user.otp.expiresAt) {
            user.otp = undefined; // Clear expired OTP
            await user.save();
            return res.status(400).json({ 
                success: false, 
                message: "OTP has expired. Please login again." 
            });
        }

        // 4. Verify OTP Code
        if (user.otp.code !== otpCode) {
            return res.status(400).json({ 
                success: false, 
                message: "Invalid OTP code." 
            });
        }

        // 5. Authentication Successful - Clear OTP and update verification status
        user.otp = undefined;
        user.isVerified = true;
        await user.save();

        // 6. Establish Session
        // Note: req.session will be available after we configure express-session in server.js
        req.session.userId = user._id;
        req.session.username = user.username;

        res.status(200).json({ 
            success: true, 
            message: "Authentication successful. Welcome back!",
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });

    } catch (error) {
        console.error(`[OTP VERIFICATION ERROR]: ${error.message}`);
        res.status(500).json({ 
            success: false, 
            message: "Server error during OTP verification." 
        });
    }
};

module.exports = verifyOtp;