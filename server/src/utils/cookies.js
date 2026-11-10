import { env, isProd } from '../config/env.js';

export const REFRESH_COOKIE = 'bp_refresh';

const baseOptions = () => ({
  httpOnly: true,
  secure: isProd,
  sameSite: 'lax',
  // Only sent to auth endpoints, never to the rest of the API.
  path: '/api/auth',
});

export const setRefreshCookie = (res, token) =>
  res.cookie(REFRESH_COOKIE, token, {
    ...baseOptions(),
    maxAge: env.JWT_REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
  });

export const clearRefreshCookie = (res) => res.clearCookie(REFRESH_COOKIE, baseOptions());

/** Minimal cookie reader (avoids an extra dependency for a single cookie). */
export function readCookie(req, name) {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq > -1 && part.slice(0, eq).trim() === name) {
      return decodeURIComponent(part.slice(eq + 1).trim());
    }
  }
  return null;
}
