/**
 * loginController.js
 * Purpose: Handles the initial stage of user authentication.
 * Updated to use the external otpGenerator utility for better modularity.
 */

const User = require('../../models/User');
const bcrypt = require('bcryptjs');
const sendEmail = require('../../utils/sendEmail');
const generateOTP = require('../../utils/otpGenerator');

const login = async (req, res) => {
    try {
        const { username, password } = req.body;

        // 1. Validate Input
        if (!username || !password) {
            return res.status(400).json({ 
                success: false, 
                message: "Please provide both username and password." 
            });
        }

        // 2. Find User
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: "Invalid credentials." 
            });
        }

        // 3. Verify Password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ 
                success: false, 
                message: "Invalid credentials." 
            });
        }

        // 4. Generate OTP using the utility function
        const { code, expiresAt } = generateOTP();

        // 5. Save OTP to User Document
        user.otp = {
            code,
            expiresAt
        };
        await user.save();

        // 6. Send OTP via Email
        try {
            await sendEmail({
                email: user.email,
                subject: 'Your Cyber Assistant Login Code',
                message: `Your verification code is: ${code}. It expires in 10 minutes.`
            });

            res.status(200).json({ 
                success: true, 
                message: "OTP sent to your registered email. Please verify to continue." 
            });
        } catch (mailError) {
            user.otp = undefined;
            await user.save();
            return res.status(500).json({ 
                success: false, 
                message: "Failed to send OTP email. Please try again later." 
            });
        }

    } catch (error) {
        console.error(`[LOGIN ERROR]: ${error.message}`);
        res.status(500).json({ 
            success: false, 
            message: "Server error during login." 
        });
    }
};

module.exports = login;