const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Required for Render.com
    }
});

// Test connection
pool.on('connect', () => {
    console.log('✓ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
    console.error('Unexpected database error:', err);
    process.exit(-1);
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool
};
