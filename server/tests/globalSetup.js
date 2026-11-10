import { execFileSync } from 'node:child_process';
import dotenv from 'dotenv';
import pg from 'pg';

/** Wipes the TEST database, then runs every migration and the seed. */
export default async function globalSetup() {
  dotenv.config();
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error('Set TEST_DATABASE_URL in server/.env to run tests (use a separate, throwaway database).');
  if (url === process.env.DATABASE_URL) throw new Error('TEST_DATABASE_URL must differ from DATABASE_URL: tests wipe the database.');

  const client = new pg.Client({ connectionString: url });
  await client.connect();
  await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await client.end();

  const env = { ...process.env, DATABASE_URL: url, NODE_ENV: 'test' };
  execFileSync(process.execPath, ['src/db/migrate.js'], { env, stdio: 'ignore' });
  execFileSync(process.execPath, ['src/db/seeds/seed.js'], { env, stdio: 'ignore' });
}
