/**
 * sendEmail.js
 * Purpose: A utility function to send emails using Nodemailer.
 * Updated: Supports HTML templates for the "MASTER OS" project aesthetic.
 */

const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    // 1. Create a transporter using Google's SMTP settings
    // Ensure EMAIL_USER and EMAIL_APP_PASSWORD are set in your .env file
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER, 
            pass: process.env.EMAIL_APP_PASSWORD 
        }
    });

    // 2. Define the email options
    const mailOptions = {
        // Sets the sender name to "MASTER OS"
        from: `"MASTER OS" <${process.env.EMAIL_USER}>`,
        to: options.email,
        subject: options.subject,
        text: options.message, // Fallback plain text
        html: options.html    // THIS LINE is what enables your Cyber Lab design
    };

    // 3. Dispatch the email
    try {
        await transporter.sendMail(mailOptions);
        console.log(`[SYSTEM] Cyber-MFA relay successful to ${options.email}`);
    } catch (error) {
        console.error(`[EMAIL ERROR]: ${error.message}`);
        throw new Error('Email relay failed. Please verify your .env credentials and Gmail App Password.');
    }
};

module.exports = sendEmail;