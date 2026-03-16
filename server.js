/**
 * server.js
 * Purpose: The main entry point of the application. 
 * It initializes the Express server, applies global middleware, 
 * and bootstraps the different architectural layers.
 */

require('dotenv').config();
const express = require('express');
const app = express();

// Global Middleware for parsing JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Placeholder for Database Connection (to be added in a separate file)
// Placeholder for Routes (to be added in separate files)

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`[SERVER] Running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});