/**
 * server.js
 * Purpose: The main entry point of the MASTER application.
 * This file initializes database connections, session management, 
 * and maps all API and view routes.
 */

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const connectMongo = require('connect-mongo');
const connectDB = require('./config/db');
const path = require('path');

// Import Routes
const authRoutes = require('./routes/auth/authRoutes');
const viewRoutes = require('./routes/views/viewRoutes');

const app = express();

// 1. Connect to Local MongoDB
connectDB();

// 2. Global Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3. Static Files
// We serve assets from public, but HTML pages are managed by viewRoutes for protection
app.use(express.static(path.join(__dirname, 'public')));

// 4. Session Configuration
// This is critical for the 'protect' middleware to work correctly
const MongoStore = connectMongo.default ? connectMongo.default : connectMongo;

app.use(session({
    secret: process.env.SESSION_SECRET || 'master_security_secret_2026',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/cyber_assistant',
        collectionName: 'sessions',
        ttl: 24 * 60 * 60 // 1 Day
    }),
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 1000 * 60 * 60 * 24, // 24 Hours
        sameSite: 'lax'
    }
}));

// 5. Use Routes
// API Routes
app.use('/api/auth', authRoutes);

// 6. View Routes
app.use('/', viewRoutes);

const PORT = process.env.PORT;

app.listen(PORT, () => {
    console.log(`[SERVER] MASTER OS initialized on http://localhost:${PORT}`);
    console.log(`[SYSTEM] Protective shielding active via viewRoutes`);
});