import { api, login, bearer, closePool, USERS, PASSWORD } from './helpers.js';
import { pool } from '../src/db/pool.js';

afterAll(closePool);

const cookieValue = (setCookie) => setCookie?.find((c) => c.startsWith('bp_refresh='))?.split(';')[0];

async function nsuId() {
  const { rows } = await pool.query("SELECT id FROM universities WHERE email_domain = 'northsouth.edu'");
  return rows[0].id;
}

describe('POST /api/auth/register', () => {
  test('verifies a user whose email matches the university domain', async () => {
    const res = await api().post('/api/auth/register').send({
      name: 'Karim Uddin', email: 'karim.uddin@northsouth.edu', password: 'secret123', universityId: await nsuId(), department: 'CSE',
    });
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ email: 'karim.uddin@northsouth.edu', isVerified: true, role: 'student' });
    expect(res.body.user.password_hash).toBeUndefined();
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(cookieValue(res.headers['set-cookie'])).toBeTruthy();
  });

  test('creates an unverified account when the domain does not match', async () => {
    const res = await api().post('/api/auth/register').send({
      name: 'Rina Das', email: 'rina@gmail.com', password: 'secret123', universityId: await nsuId(),
    });
    expect(res.status).toBe(201);
    expect(res.body.user.isVerified).toBe(false);
  });

  test('rejects duplicate emails (case-insensitive) with 409', async () => {
    const res = await api().post('/api/auth/register').send({ name: 'Dup', email: 'AYESHA.RAHMAN@northsouth.edu', password: 'secret123' });
    expect(res.status).toBe(409);
  });

  test('returns field errors for invalid input', async () => {
    const res = await api().post('/api/auth/register').send({ name: 'A', email: 'nope', password: 'short' });
    expect(res.status).toBe(400);
    const fields = res.body.error.details.map((d) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['name', 'email', 'password']));
  });
});

describe('login / refresh / logout', () => {
  test('wrong password is 401 with a generic message', async () => {
    const res = await api().post('/api/auth/login').send({ email: USERS.tanvir, password: 'wrong-password1' });
    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Invalid email or password');
  });

  test('login sets an httpOnly refresh cookie and stores only its hash', async () => {
    const res = await api().post('/api/auth/login').send({ email: USERS.tanvir, password: PASSWORD });
    expect(res.status).toBe(200);
    const raw = res.headers['set-cookie'].find((c) => c.startsWith('bp_refresh='));
    expect(raw).toMatch(/HttpOnly/i);
    expect(raw).toMatch(/Path=\/api\/auth/);
    const token = cookieValue(res.headers['set-cookie']).split('=')[1];
    const { rowCount } = await pool.query('SELECT 1 FROM refresh_tokens WHERE token_hash = $1', [token]);
    expect(rowCount).toBe(0);
  });

  test('refresh rotates the token; the old one stops working', async () => {
    const { cookie } = await login(USERS.tanvir);
    const first = await api().post('/api/auth/refresh').set('Cookie', cookie);
    expect(first.status).toBe(200);
    expect(first.body.user.email).toBe(USERS.tanvir);
    const newCookie = cookieValue(first.headers['set-cookie']);
    expect(newCookie).not.toBe(cookieValue(cookie));

    const replay = await api().post('/api/auth/refresh').set('Cookie', cookie);
    expect(replay.status).toBe(401);

    const second = await api().post('/api/auth/refresh').set('Cookie', newCookie);
    expect(second.status).toBe(200);
  });

  test('logout revokes the refresh token', async () => {
    const { cookie } = await login(USERS.tanvir);
    expect((await api().post('/api/auth/logout').set('Cookie', cookie)).status).toBe(204);
    expect((await api().post('/api/auth/refresh').set('Cookie', cookie)).status).toBe(401);
  });

  test('GET /me needs a valid access token', async () => {
    expect((await api().get('/api/auth/me')).status).toBe(401);
    expect((await api().get('/api/auth/me').set(bearer('garbage'))).status).toBe(401);
    const { token } = await login(USERS.tanvir);
    const res = await api().get('/api/auth/me').set(bearer(token));
    expect(res.status).toBe(200);
    expect(res.body.user.university.name).toBe('North South University');
  });
});
