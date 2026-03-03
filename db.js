// ====================================
// ClimbTracker — Database Connection
// ====================================

import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Neon requires SSL
    }
});

// Test connection
pool.on('error', (err) => {
    console.error('❌ Erro no pool do banco:', err);
});

/**
 * Execute a query
 */
export function query(text, params) {
    return pool.query(text, params);
}

/**
 * Get a client from the pool (for transactions)
 */
export function getClient() {
    return pool.connect();
}

/**
 * Initialize database — run schema.sql
 */
export async function initDB() {
    try {
        const schemaPath = join(__dirname, 'schema.sql');
        const schema = readFileSync(schemaPath, 'utf-8');
        await pool.query(schema);
        console.log('📦 Schema do banco aplicado com sucesso');
    } catch (err) {
        console.error('❌ Erro ao aplicar schema:', err.message);
        throw err;
    }
}

export default pool;
