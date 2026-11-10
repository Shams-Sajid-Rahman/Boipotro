import bcrypt from 'bcrypt';
import { query, withTransaction } from '../db/pool.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { signAccessToken, createRefreshToken, hashRefreshToken } from '../utils/tokens.js';
import { findUserById } from './user.service.js';

const BCRYPT_ROUNDS = 12;
// A rotated token re-used within this window is treated as a benign race
// (e.g. two tabs refreshing at once). Later re-use looks like token theft.
const ROTATION_GRACE_SECONDS = 30;
// Compared against when the email doesn't exist, so response time doesn't reveal it.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', BCRYPT_ROUNDS);

/** True if email is at the university's domain or a subdomain (e.g. g.bracu.ac.bd). */
export function emailMatchesDomain(email, domain) {
  if (!domain) return false;
  const emailDomain = email.split('@')[1]?.toLowerCase() || '';
  const d = domain.toLowerCase();
  return emailDomain === d || emailDomain.endsWith(`.${d}`);
}

async function issueSession(userId, db = { query }) {
  const user = await findUserById(userId, db);
  const refreshToken = createRefreshToken();
  await db.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, now() + make_interval(days => $3))`,
    [userId, hashRefreshToken(refreshToken), env.JWT_REFRESH_EXPIRES_DAYS],
  );
  return { user, accessToken: signAccessToken(user), refreshToken };
}

async function findUniversity(id) {
  const { rows } = await query('SELECT id, email_domain FROM universities WHERE id = $1', [id]);
  if (!rows[0]) throw ApiError.badRequest('Validation failed', [{ field: 'universityId', message: 'Unknown university' }]);
  return rows[0];
}

export async function register({ name, email, password, universityId, department, phone }) {
  const university = universityId ? await findUniversity(universityId) : null;
  const isVerified = university ? emailMatchesDomain(email, university.email_domain) : false;
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  try {
    const { rows } = await query(
      `INSERT INTO users (name, email, password_hash, phone, university_id, department, is_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [name, email, passwordHash, phone ?? null, university?.id ?? null, department ?? null, isVerified],
    );
    return issueSession(rows[0].id);
  } catch (err) {
    if (err.code === '23505') throw ApiError.conflict('An account with this email already exists');
    throw err;
  }
}

export async function login({ email, password }) {
  const { rows } = await query('SELECT id, password_hash, is_banned FROM users WHERE email = $1', [email]);
  const user = rows[0];
  const ok = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH);
  if (!user || !ok) throw ApiError.unauthorized('Invalid email or password');
  if (user.is_banned) throw ApiError.forbidden('This account has been suspended');

  // Housekeeping: drop this user's expired tokens.
  await query('DELETE FROM refresh_tokens WHERE user_id = $1 AND expires_at < now()', [user.id]);
  return issueSession(user.id);
}

/** Validates the refresh token, revokes it and issues a new one (rotation). */
export async function refresh(rawToken) {
  if (!rawToken) throw ApiError.unauthorized('No refresh token');
  const tokenHash = hashRefreshToken(rawToken);

  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `SELECT t.id, t.user_id, t.revoked, t.expires_at < now() AS expired,
              t.revoked_at < now() - make_interval(secs => $2) AS reused_late, u.is_banned
       FROM refresh_tokens t JOIN users u ON u.id = t.user_id
       WHERE t.token_hash = $1 FOR UPDATE OF t`,
      [tokenHash, ROTATION_GRACE_SECONDS],
    );
    const token = rows[0];
    if (!token) throw ApiError.unauthorized('Invalid refresh token');

    if (token.revoked) {
      if (token.reused_late) {
        // Old token replayed: assume theft and sign the user out everywhere.
        await client.query(
          'UPDATE refresh_tokens SET revoked = true, revoked_at = now() WHERE user_id = $1 AND revoked = false',
          [token.user_id],
        );
      }
      throw ApiError.unauthorized('Refresh token has been revoked');
    }
    if (token.expired) throw ApiError.unauthorized('Refresh token has expired');
    if (token.is_banned) throw ApiError.forbidden('This account has been suspended');

    await client.query('UPDATE refresh_tokens SET revoked = true, revoked_at = now() WHERE id = $1', [token.id]);
    return issueSession(token.user_id, client);
  });
}

export async function logout(rawToken) {
  if (!rawToken) return;
  await query(
    'UPDATE refresh_tokens SET revoked = true, revoked_at = now() WHERE token_hash = $1 AND revoked = false',
    [hashRefreshToken(rawToken)],
  );
}
