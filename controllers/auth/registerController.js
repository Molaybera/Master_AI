/**
 * registerController.js
 * Purpose: Handles Vault-Key registration.
 * Extracts user details, hashes the generated Vault Key, and creates the account.
 */

const User = require('../../models/User');
const bcrypt = require('bcryptjs');

const register = async (req, res) => {
    try {
        // The frontend currently sends the generated key under the 'password' field
        const { username, email, password } = req.body;

        // 1. Comprehensive validation check
        if (!username || !email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: "Please provide username, email, and your generated Vault Key." 
            });
        }

        // 2. Check if username or email already exists
        const existingUser = await User.findOne({ 
            $or: [{ username }, { email }] 
        });

        if (existingUser) {
            const conflict = existingUser.username === username ? "Username" : "Email";
            return res.status(400).json({ 
                success: false, 
                message: `${conflict} already registered.` 
            });
        }

        // 3. Hash the Vault Key before saving for maximum local security
        const salt = await bcrypt.genSalt(12);
        const hashedKey = await bcrypt.hash(password, salt);

        // 4. Create new user instance using the new schema
        const newUser = new User({
            username,
            email,
            vaultKey: hashedKey
        });

        // 5. Save to MongoDB
        await newUser.save();

        res.status(201).json({ 
            success: true, 
            message: "Identity created securely! Redirecting to login." 
        });

    } catch (error) {
        console.error(`[REGISTRATION ERROR]: ${error.message}`);
        res.status(500).json({ 
            success: false, 
            message: "Server error during registration." 
        });
    }
};

module.exports = register;