/**
 * verifyOtpController.js
 * Purpose: Handles OTP verification using Email.
 * This file verifies the 6-digit code sent to the user's email.
 * If successful, it establishes the user session.
 */

const User = require('../../models/User');

const verifyOtp = async (req, res) => {
    try {
        const { email, otpCode } = req.body;

        // 1. Validate Input
        if (!email || !otpCode) {
            return res.status(400).json({ 
                success: false, 
                message: "Email and OTP code are required." 
            });
        }

        // 2. Find User by Email
        const user = await User.findOne({ email });
        
        // 3. Check if user exists and has an active OTP
        if (!user || !user.otp || !user.otp.code) {
            return res.status(400).json({ 
                success: false, 
                message: "No active OTP found. Please try logging in again." 
            });
        }

        // 4. Check if OTP is expired
        if (new Date() > user.otp.expiresAt) {
            // Clear expired OTP
            user.otp = undefined;
            await user.save();
            return res.status(400).json({ 
                success: false, 
                message: "OTP has expired. Please login again to get a new code." 
            });
        }

        // 5. Verify the Code
        if (user.otp.code !== otpCode) {
            return res.status(400).json({ 
                success: false, 
                message: "Invalid verification code." 
            });
        }

        // 6. Success Logic
        // Clear the OTP from DB once used
        user.otp = undefined;
        user.isVerified = true; 
        await user.save();

        // 7. Establish the Session (Logged In state)
        req.session.userId = user._id;
        req.session.username = user.username;

        res.status(200).json({ 
            success: true, 
            message: "Authentication successful! Session established.",
            user: {
                username: user.username,
                email: user.email
            }
        });

    } catch (error) {
        console.error(`[OTP VERIFICATION ERROR]: ${error.message}`);
        res.status(500).json({ 
            success: false, 
            message: "Server error during verification." 
        });
    }
};

module.exports = verifyOtp;