/**
 * server.js
 * Path: /server.js
 * Purpose: The main entry point of the MASTER application.
 * Updated: Moved session middleware before static files to ensure cookie stability.
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
const chatRoutes = require('./routes/chat/chatRoutes');

const app = express();

// 1. Connect to Local MongoDB
connectDB();

// 2. Global Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3. Session Configuration (IMPORTANT: Must come before static files)
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

// 4. Static Files (Moved after session to ensure cookie visibility)
app.use(express.static(path.join(__dirname, 'public')));

// 5. Use Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/', viewRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`[SERVER] MASTER OS initialized on http://localhost:${PORT}`);
    console.log(`[SYSTEM] Protective shielding active via viewRoutes`);
});