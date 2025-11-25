const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function runSchema() {
    try {
        const sqlPath = path.join(__dirname, 'fix_rbac_schema.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Running schema update...');
        await pool.query(sql);
        console.log('Schema update completed successfully.');
    } catch (err) {
        console.error('Error running schema update:', err);
    } finally {
        await pool.end();
    }
}

runSchema();
