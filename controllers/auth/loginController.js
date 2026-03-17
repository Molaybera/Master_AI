/**
 * loginController.js
 * Purpose: Handles initial authentication and dispatches a high-tech HTML email.
 * Updated: Integrated the "MASTER OS" themed HTML email template.
 */

const User = require('../../models/User');
const bcrypt = require('bcryptjs');
const sendEmail = require('../../utils/sendEmail');
const generateOTP = require('../../utils/otpGenerator');

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Provide credentials." });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ success: false, message: "Invalid credentials." });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Invalid credentials." });
        }

        const { code, expiresAt } = generateOTP();
        user.otp = { code, expiresAt };
        await user.save();

        // --- MASTER OS CYBER THEME TEMPLATE ---
        const emailHtml = `
        <div style="background-color: #020617; color: #e2e8f0; font-family: 'Courier New', Courier, monospace; padding: 40px; border: 1px solid #0ea5e9; max-width: 600px; margin: auto;">
            <div style="text-align: center; border-bottom: 1px solid #1e293b; padding-bottom: 20px; margin-bottom: 30px;">
                <h1 style="color: #0ea5e9; letter-spacing: 5px; margin: 0; font-size: 24px;">MASTER // OS</h1>
                <p style="font-size: 10px; color: #64748b; text-transform: uppercase; margin-top: 5px;">Secure Identity Verification Protocol</p>
            </div>
            
            <div style="background: rgba(14, 165, 233, 0.05); padding: 20px; border-left: 4px solid #0ea5e9;">
                <p style="font-size: 14px; margin-bottom: 10px;">> INCOMING MFA CHALLENGE DETECTED</p>
                <p style="font-size: 12px; color: #94a3b8; line-height: 1.6;">
                    A login attempt was initiated for your station. Enter the following cipher to establish a secure uplink.
                </p>
                
                <div style="text-align: center; margin: 40px 0;">
                    <span style="font-size: 42px; font-weight: bold; color: #10b981; letter-spacing: 12px; border: 1px dashed #10b981; padding: 15px;">
                        ${code}
                    </span>
                </div>

                <p style="font-size: 11px; color: #ef4444; text-align: center; text-transform: uppercase; letter-spacing: 1px;">
                    Warning: This code will expire in 60 seconds.
                </p>
            </div>

            <div style="margin-top: 40px; font-size: 10px; color: #475569; text-align: center; border-top: 1px solid #1e293b; padding-top: 20px;">
                <p>LATENCY: 14ms // NODE: MASTER_SRV_LOCAL</p>
                <p style="margin-top: 10px;">If you did not initiate this request, terminate your connection immediately.</p>
            </div>
        </div>
        `;

        try {
            await sendEmail({
                email: user.email,
                subject: 'CRITICAL: MASTER OS MFA CHALLENGE',
                message: `Your MASTER verification code is: ${code}`, // Fallback
                html: emailHtml // The Cyber Lab template
            });

            res.status(200).json({ 
                success: true, 
                message: "MFA challenge dispatched to your station." 
            });
        } catch (mailError) {
            user.otp = undefined;
            await user.save();
            return res.status(500).json({ success: false, message: "Relay failure." });
        }

    } catch (error) {
        console.error(`[LOGIN ERROR]: ${error.message}`);
        res.status(500).json({ success: false, message: "Server crash during auth." });
    }
};

module.exports = login;