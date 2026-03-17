/**
 * sendEmail.js
 * Purpose: A utility function to send emails using Nodemailer.
 * It is configured to use Gmail's SMTP server with an App Password.
 * This will be used to send OTP codes to users during the login phase.
 */

const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    // 1. Create a transporter using Google's SMTP settings
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            // These should be defined in your .env file
            user: process.env.EMAIL_USER, 
            pass: process.env.EMAIL_APP_PASSWORD 
        }
    });

    // 2. Define the email options
    const mailOptions = {
        from: `"Cyber Assistant" <${process.env.EMAIL_USER}>`,
        to: options.email,
        subject: options.subject,
        text: options.message,
        // You can also add html: options.html if you want a styled email later
    };

    // 3. Actually send the email
    try {
        await transporter.sendMail(mailOptions);
        console.log(`[EMAIL] Sent successfully to ${options.email}`);
    } catch (error) {
        console.error(`[EMAIL ERROR]: ${error.message}`);
        throw new Error('Email could not be sent');
    }
};

module.exports = sendEmail;