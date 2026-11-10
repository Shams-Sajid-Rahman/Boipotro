import pg from 'pg';
import { env } from '../config/env.js';

// Return NUMERIC columns (prices) as JS numbers instead of strings.
pg.types.setTypeParser(1700, (value) => (value === null ? null : Number(value)));
// BIGINT ids and COUNT(*) as numbers (our ids stay far below 2^53).
pg.types.setTypeParser(20, (value) => (value === null ? null : Number(value)));

export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err);
});

/** Run a parameterized query. Always pass values via `params`; never interpolate. */
export const query = (text, params = []) => pool.query(text, params);

/** Run `fn(client)` inside a transaction; rolls back on error. */
export async function withTransaction(fn) {
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
