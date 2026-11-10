import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

const make = (windowMs, limit, message) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: { message } },
    // Tests hammer the same endpoints from one IP.
    skip: () => env.NODE_ENV === 'test',
  });

const FIFTEEN_MIN = 15 * 60 * 1000;

export const apiLimiter = make(FIFTEEN_MIN, 1000, 'Too many requests, please slow down.');
// Login + register: 10 attempts per 15 minutes per IP.
export const authLimiter = make(FIFTEEN_MIN, 10, 'Too many attempts. Please try again in 15 minutes.');
// Creating listings, offers, reports, chats, contact messages.
export const writeLimiter = make(FIFTEEN_MIN, 60, 'You are doing that too often. Please wait a few minutes.');
