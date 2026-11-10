import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const signAccessToken = (user) =>
  jwt.sign({ sub: String(user.id), role: user.role }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES,
  });

/** Throws if the token is invalid or expired. */
export const verifyAccessToken = (token) => jwt.verify(token, env.JWT_ACCESS_SECRET);

/** Opaque random refresh token; only its HMAC is stored in the database. */
export const createRefreshToken = () => crypto.randomBytes(48).toString('base64url');

export const hashRefreshToken = (token) =>
  crypto.createHmac('sha256', env.JWT_REFRESH_SECRET).update(token).digest('hex');
