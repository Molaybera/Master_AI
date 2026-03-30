/**
 * loginController.js
 * Purpose: Handles true offline authentication using the Vault Key.
 * Bypasses all OTP/Email logic to establish an immediate, secure session.
 */

const User = require('../../models/User');
const bcrypt = require('bcryptjs');

const login = async (req, res) => {
    try {
        // The frontend sends the vault key under the 'password' field
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Provide Identity and Vault Key." });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ success: false, message: "Invalid credentials." });
        }

        // Compare the provided Vault Key with the hashed vaultKey in DB
        const isMatch = await bcrypt.compare(password, user.vaultKey);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Invalid credentials." });
        }

        // Establish the Session instantly (No OTP needed)
        req.session.userId = user._id.toString();
        req.session.username = user.username;

        console.log(`[AUTH] Offline Session established for user: ${user.username}`);

        // Explicitly save the session to prevent race conditions
        req.session.save((err) => {
            if (err) {
                console.error("[SESSION SAVE ERROR]:", err);
                return res.status(500).json({ success: false, message: "Session sync failure." });
            }
            
            res.status(200).json({ 
                success: true, 
                message: "Uplink granted. Vault Key verified." 
            });
        });

    } catch (error) {
        console.error(`[LOGIN ERROR]: ${error.message}`);
        res.status(500).json({ success: false, message: "Server crash during auth." });
    }
};

module.exports = login;