/**
 * logoutController.js
 * Purpose: Handles the user logout process.
 * It destroys the current session and clears the session cookie 
 * from the user's browser, ensuring they must re-authenticate to gain access.
 */

const logout = (req, res) => {
    // 1. Destroy the session in the store (MongoDB)
    req.session.destroy((err) => {
        if (err) {
            console.error(`[LOGOUT ERROR]: ${err.message}`);
            return res.status(500).json({ 
                success: false, 
                message: "Could not log out. Please try again." 
            });
        }

        // 2. Clear the cookie on the client side
        res.clearCookie('connect.sid'); // 'connect.sid' is the default name for express-session cookies

        res.status(200).json({ 
            success: true, 
            message: "Logged out successfully." 
        });
    });
};

module.exports = logout;