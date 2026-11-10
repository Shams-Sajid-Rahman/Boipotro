import { verifyAccessToken } from '../utils/tokens.js';
import { ApiError } from '../utils/ApiError.js';
import { query } from '../db/pool.js';

function readBearer(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

/**
 * Verify the JWT, then load the current role / ban flag from the DB so that
 * bans and role changes apply immediately instead of when the token expires.
 */
async function resolveUser(token) {
  const payload = verifyAccessToken(token);
  const { rows } = await query('SELECT id, role, is_banned FROM users WHERE id = $1', [Number(payload.sub)]);
  const user = rows[0];
  if (!user) throw ApiError.unauthorized('Account no longer exists');
  if (user.is_banned) throw ApiError.forbidden('This account has been suspended');
  return { id: user.id, role: user.role };
}

/** 401 unless a valid access token is present. Sets req.user = { id, role }. */
export async function requireAuth(req, _res, next) {
  const token = readBearer(req);
  if (!token) return next(ApiError.unauthorized('Authentication required'));
  try {
    req.user = await resolveUser(token);
    next();
  } catch (err) {
    next(err instanceof ApiError ? err : ApiError.unauthorized('Invalid or expired access token'));
  }
}

/** Sets req.user when a valid token is sent; otherwise continues anonymously. */
export async function optionalAuth(req, _res, next) {
  const token = readBearer(req);
  if (token) {
    try {
      req.user = await resolveUser(token);
    } catch {
      // Invalid/expired token on a public route: treat as anonymous.
    }
  }
  next();
}

/** Use after requireAuth. Usage: requireRole('admin') */
export const requireRole = (...roles) => (req, _res, next) => {
  if (!req.user) return next(ApiError.unauthorized('Authentication required'));
  if (!roles.includes(req.user.role)) return next(ApiError.forbidden('You do not have permission to do this'));
  next();
};

export const isOwnerOrAdmin = (user, ownerId) => Boolean(user) && (user.role === 'admin' || user.id === ownerId);
