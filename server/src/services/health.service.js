import { query } from '../db/pool.js';

/** Returns database reachability without throwing, so /health always answers. */
export async function checkDatabase() {
  try {
    const { rows } = await query('SELECT now() AS db_time');
    return { status: 'connected', time: rows[0].db_time };
  } catch (err) {
    return { status: 'unavailable', error: err.message };
  }
}
