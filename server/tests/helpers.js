import request from 'supertest';
import { createApp } from '../src/app.js';
import { pool } from '../src/db/pool.js';

export const app = createApp();
export const api = () => request(app);
export const PASSWORD = 'Password123!';

// Seed accounts (see src/db/seeds/data/users.js).
export const USERS = {
  admin: 'admin@boipotro.test',
  ayesha: 'ayesha.rahman@northsouth.edu', // seller of "Introduction to Algorithms"
  tanvir: 'tanvir.hasan@northsouth.edu',
  nusrat: 'nusrat.jahan@bracu.ac.bd',
  mehedi: 'mehedi.hasan@cu.ac.bd',
};

/** Logs in and returns { token, user, cookie }. */
export async function login(email, password = PASSWORD) {
  const res = await api().post('/api/auth/login').send({ email, password });
  if (res.status !== 200) throw new Error(`login failed for ${email}: ${res.status} ${JSON.stringify(res.body)}`);
  return { token: res.body.accessToken, user: res.body.user, cookie: res.headers['set-cookie'] };
}

export const bearer = (token) => ({ Authorization: `Bearer ${token}` });

// Smallest valid PNG (1x1 pixel).
export const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

export async function categoryId(slug = 'cse') {
  const { rows } = await pool.query('SELECT id FROM categories WHERE slug = $1', [slug]);
  return rows[0].id;
}

/** Creates a listing as `token` and returns it. */
export async function createListing(token, overrides = {}) {
  const fields = {
    title: 'Test Driven Development',
    author: 'Kent Beck',
    condition: 'used',
    price: '500',
    categoryId: String(await categoryId()),
    ...overrides,
  };
  let req = api().post('/api/listings').set(bearer(token));
  for (const [k, v] of Object.entries(fields)) req = req.field(k, v);
  const res = await req.attach('images', PNG, { filename: 'cover.png', contentType: 'image/png' });
  if (res.status !== 201) throw new Error(`createListing failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.listing;
}

export const closePool = () => pool.end();
