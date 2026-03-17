/**
 * authMiddleware.js
 * Purpose: A "Gatekeeper" function that protects private routes.
 * It checks if a valid user session exists. If not, it denies access.
 * This ensures that only authenticated users can interact with the AI model.
 */

const protect = (req, res, next) => {
    // 1. Check if the session contains a userId
    // This was set in verifyOtpController.js upon successful login
    if (req.session && req.session.userId) {
        // User is authenticated, proceed to the next function (the controller)
        return next();
    }

    // 2. If no session exists, return a 401 Unauthorized error
    res.status(401).json({ 
        success: false, 
        message: "Not authorized. Please login to access this resource." 
    });
};

module.exports = { protect };