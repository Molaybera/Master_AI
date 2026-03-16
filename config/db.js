/**
 * db.js
 * Purpose: This file manages the connection to a local MongoDB instance.
 * It uses the Mongoose library and connects to a local URI (standard for MongoDB Compass).
 * By keeping this separate, we can easily toggle between local and cloud environments.
 */

const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        // Updated to use local MongoDB URI for offline development with Compass
        const localURI = process.env.MONGO_URI;
        
        const conn = await mongoose.connect(localURI);
        
        console.log(`[DATABASE] Local MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`[DATABASE] Local Connection Error: ${error.message}`);
        // Exit process with failure if the local database is not running
        process.exit(1);
    }
};

module.exports = connectDB;