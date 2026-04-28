import { api } from './client';
import { AUTH_TOKEN_KEY } from './authKeys';

export { AUTH_TOKEN_KEY };

export function getStoredToken() {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

/** Attach or remove Bearer token on the shared axios instance. */
export function setStoredToken(token) {
  try {
    if (token) {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
      api.defaults.headers.common.Authorization = `Bearer ${token}`;
    } else {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      delete api.defaults.headers.common.Authorization;
    }
  } catch {
    /* ignore */
  }
}

export function apiErrorMessage(err) {
  const d = err.response?.data;
  if (!d) return err.message || 'Request failed';
  if (Array.isArray(d.message)) return d.message.join(' ');
  if (typeof d.message === 'string') return d.message;
  return d.error || 'Request failed';
}

export async function apiLogin(email, password) {
  const { data } = await api.post('/api/auth/login', { email, password });
  return data;
}

export async function apiRegister(body) {
  const { data } = await api.post('/api/auth/register', body);
  return data;
}

export async function fetchMe() {
  const { data } = await api.get('/api/auth/me');
  return data;
}

export async function apiUpdateProfile(patch) {
  const { data } = await api.patch('/api/auth/me', patch);
  return data;
}

export async function apiForgotPassword(email) {
  const { data } = await api.post('/api/auth/forgot-password', { email });
  return data;
}

export async function apiResetPassword(token, password) {
  const { data } = await api.post('/api/auth/reset-password', { token, password });
  return data;
}
