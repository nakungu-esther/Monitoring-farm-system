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

/** Readable axios failure text (Nest often sends `{ message: 'Internal server error' }`; URL hint helps find which route broke). */
export function apiErrorMessage(err) {
  let url = '';
  try {
    const raw = err.config?.url ?? '';
    const qs = err.config?.params ? String(new URLSearchParams(err.config.params)) : '';
    if (typeof raw === 'string' && raw.length > 0) {
      url =
        raw.includes('://') ? raw.replace(/^https?:\/\/[^/]+/i, '') : raw;
      if (qs) url += (url.includes('?') ? '&' : '?') + qs;
      url = `[${url}] `;
    }
  } catch {
    /* ignore */
  }
  const d = err.response?.data;
  let body = err.message || 'Request failed';
  if (d) {
    if (Array.isArray(d.message)) body = d.message.join(' ');
    else if (typeof d.message === 'string') body = d.message;
    else body = d.error || body;
  }
  const status = err.response?.status;
  const st = typeof status === 'number' ? ` (${status})` : '';
  return `${url}${body}${st}`;
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
