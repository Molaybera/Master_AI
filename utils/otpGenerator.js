/**
 * otpGenerator.js
 * Purpose: A utility function to generate a secure 6-digit OTP 
 * and define its expiration period. This centralizes the logic 
 * for code generation across the application.
 */

const generateOTP = () => {
    // Generates a random 6-digit number as a string
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Sets expiration to 1 minutes from the current time
    const expiresAt = new Date(Date.now() + 1 * 60 * 1000);

    return { code, expiresAt };
};

module.exports = generateOTP;