import * as authService from '../services/auth.service.js';
import { findUserById } from '../services/user.service.js';
import { ApiError } from '../utils/ApiError.js';
import { REFRESH_COOKIE, readCookie, setRefreshCookie, clearRefreshCookie } from '../utils/cookies.js';

const sendSession = (res, { user, accessToken, refreshToken }, status = 200) => {
  setRefreshCookie(res, refreshToken);
  res.status(status).json({ user, accessToken });
};

export async function register(req, res) {
  sendSession(res, await authService.register(req.validated.body), 201);
}

export async function login(req, res) {
  sendSession(res, await authService.login(req.validated.body));
}

export async function refresh(req, res) {
  try {
    sendSession(res, await authService.refresh(readCookie(req, REFRESH_COOKIE)));
  } catch (err) {
    clearRefreshCookie(res);
    throw err;
  }
}

export async function logout(req, res) {
  await authService.logout(readCookie(req, REFRESH_COOKIE));
  clearRefreshCookie(res);
  res.status(204).end();
}

export async function me(req, res) {
  const user = await findUserById(req.user.id);
  if (!user) throw ApiError.unauthorized('Account no longer exists');
  res.json({ user });
}
