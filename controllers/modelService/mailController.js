/**
 * mailController.js
 * Purpose: Handles the dispatch of emails drafted by the AI.
 * Uses nodemailer and the user's stored Google App Password.
 */

const nodemailer = require('nodemailer');
const User = require('../../models/User'); // Import the User model to get the App Password

const sendEmail = async (req, res) => {
    try {
        const { recipient, subject, content } = req.body;
        const userId = req.session.userId;

        // 1. Validate incoming data
        if (!recipient || !subject || !content) {
            return res.status(400).json({ 
                success: false, 
                message: "Missing required email fields (recipient, subject, content)." 
            });
        }

        // 2. Fetch the user from the database to get their credentials
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        // 3. Check if the user has an App Password configured
        if (!user.appPassword) {
            return res.status(403).json({ 
                success: false, 
                message: "No App Password configured. Please update your profile settings with a Google App Password to enable the Mail Agent." 
            });
        }

        // 4. Configure the Nodemailer Transporter
        // Note: This assumes Gmail. If using another provider, host/port settings change.
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: user.email,
                pass: user.appPassword 
            }
        });

        // 5. Construct the Email Options
        const mailOptions = {
            from: `"${user.username} via MASTER" <${user.email}>`,
            to: recipient,
            subject: subject,
            html: content // Content is pre-formatted HTML from the AI
        };

        // 6. Send the Email
        await transporter.sendMail(mailOptions);

        // 7. Success Response
        return res.status(200).json({ 
            success: true, 
            message: "Email dispatched successfully." 
        });

    } catch (error) {
        console.error('[MAIL AGENT ERROR]:', error);
        return res.status(500).json({ 
            success: false, 
            message: "Failed to dispatch email. Please verify your App Password." 
        });
    }
};

module.exports = { sendEmail };