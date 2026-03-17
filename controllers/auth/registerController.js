/**
 * registerController.js
 * Purpose: Handles standard user registration.
 * This file extracts user details, hashes the password, and creates the account.
 * Verification via OTP will be handled during the login process.
 */

const User = require('../../models/User');
const bcrypt = require('bcryptjs');

const register = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // 1. Comprehensive validation check
        if (!username || !email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: "Please provide username, email, and password." 
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

        // 3. Hash password before saving
        // Salt rounds set to 12 for high security
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 4. Create new user instance
        // Account is created but will require OTP verification at login
        const newUser = new User({
            username,
            email,
            password: hashedPassword
        });

        // 5. Save to MongoDB
        await newUser.save();

        res.status(201).json({ 
            success: true, 
            message: "Registration successful! Redirecting to login for verification." 
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