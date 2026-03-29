/**
 * authMiddleware.js
 * Purpose: A "Gatekeeper" function that protects private routes.

 */

/**
 * protect
 * Use this for routes that REQUIRE a session (e.g., /chat)
 */
const protect = (req, res, next) => {
    if (req.session && req.session.userId) {
        return next();
    }

    // If it's an API request, return JSON
    if (req.path.startsWith('/api')) {
        return res.status(401).json({ 
            success: false, 
            message: "Not authorized. Please login." 
        });
    }

    // If it's a page request, redirect to login
    res.redirect('/login');
};

/**
 * redirectIfAuthenticated
 * Use this for routes that should NOT be seen by logged-in users (e.g., /login, /register)
 */
const redirectIfAuthenticated = (req, res, next) => {
    if (req.session && req.session.userId) {
        // User is already logged in, send them to the dashboard
        return res.redirect('/chat');
    }
    // No session? Proceed to login/register page
    next();
};

module.exports = { protect, redirectIfAuthenticated };