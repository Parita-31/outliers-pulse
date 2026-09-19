const { Pool } = require('pg');
const env = require('./env');

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 15,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  // eslint-disable-next-line no-console
  console.error('[db] Unexpected error on idle client', err);
});

/**
 * Run a single query.
 * @param {string} text
 * @param {any[]} params
 */
async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  if (!env.IS_PROD) {
    const duration = Date.now() - start;
    // eslint-disable-next-line no-console
    console.log('[db] query', { text: text.split('\n')[0].slice(0, 80), duration, rows: res.rowCount });
  }
  return res;
}

/**
 * Run a set of queries inside a transaction.
 * @param {(client: import('pg').PoolClient) => Promise<any>} fn
 */
async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function healthCheck() {
  const res = await pool.query('SELECT 1 AS ok');
  return res.rows[0].ok === 1;
}

module.exports = { pool, query, withTransaction, healthCheck };
