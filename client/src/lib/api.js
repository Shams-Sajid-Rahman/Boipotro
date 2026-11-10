import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || '/api';

// The access token lives only in memory (never localStorage) to limit XSS exposure.
// The refresh token is an httpOnly cookie the browser sends to /api/auth/* automatically.
let accessToken = null;
let onSessionExpired = () => {};

export const getAccessToken = () => accessToken;
export const setAccessToken = (token) => {
  accessToken = token;
};
export const setSessionExpiredHandler = (fn) => {
  onSessionExpired = fn;
};

export const api = axios.create({ baseURL, withCredentials: true });

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

// One refresh at a time: concurrent 401s (or React StrictMode double effects)
// share the same request, so the rotated refresh token is never used twice.
let refreshPromise = null;
export function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${baseURL}/auth/refresh`, null, { withCredentials: true })
      .then(({ data }) => {
        accessToken = data.accessToken;
        return data;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

const NO_RETRY = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const shouldRefresh =
      error.response?.status === 401 && original && !original._retry && !NO_RETRY.includes(original.url);
    if (!shouldRefresh) throw error;

    original._retry = true;
    try {
      await refreshSession();
    } catch {
      accessToken = null;
      onSessionExpired();
      throw error;
    }
    return api(original);
  },
);

/** Human-readable message from an Axios error. */
export const getErrorMessage = (err) =>
  err?.response?.data?.error?.message || err?.message || 'Something went wrong';

/** { field: message } from a 400 validation error, for inline form errors. */
export function getFieldErrors(err) {
  const details = err?.response?.data?.error?.details || [];
  return Object.fromEntries(details.map((d) => [d.field, d.message]));
}
