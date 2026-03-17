/**
 * server.js
 * Purpose: The main entry point of the application. 
 * This update integrates the authentication routes into the Express 
 * application, enabling registration, login, OTP, and logout functionality.
 */

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const connectDB = require('./config/db');

// Import Routes
const authRoutes = require('./routes/auth/authRoutes');

const app = express();

// 1. Connect to Local MongoDB
connectDB();

// 2. Global Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3. Session Configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'cyber_sec_secret_key_123',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/cyber_assistant',
        collectionName: 'sessions'
    }),
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 1000 * 60 * 60 * 24, // 24 Hours
        sameSite: 'lax'
    }
}));

// 4. Use Routes
// All authentication endpoints will now be prefixed with /api/auth
app.use('/api/auth', authRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`[SERVER] Running on http://localhost:${PORT}`);
    console.log(`[AUTH] Routes initialized at /api/auth`);
});