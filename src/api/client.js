import axios from 'axios';
import { API_BASE } from '../config';
import { AUTH_TOKEN_KEY } from './authKeys';

function readTokenFromStorage() {
  try {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(AUTH_TOKEN_KEY) : null;
  } catch {
    return null;
  }
}

if (import.meta.env.PROD && !API_BASE && import.meta.env.VITE_USE_API === 'true') {
  // Without VITE_API_URL, /api/* is same-origin → static host 404/405 ("Cannot POST /api/...").
  console.error(
    '[AgriTrack] This bundle has no VITE_API_URL. Deployed sites: set VITE_API_URL to your Nest API origin and redeploy. Local: use `npm run dev` or `npm run preview` (vite.config proxies /api when VITE_API_URL is empty), or set VITE_API_URL=http://127.0.0.1:PORT before build.',
  );
}

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
});

const initialToken = readTokenFromStorage();
if (initialToken) {
  api.defaults.headers.common.Authorization = `Bearer ${initialToken}`;
}

/** Attach Bearer on every request (avoids stale/missing Authorization on some axios code paths). */
api.interceptors.request.use((config) => {
  const t = readTokenFromStorage();
  if (t) {
    config.headers.Authorization = `Bearer ${t}`;
  }
  return config;
});

function isUnauthenticatedAuthRequest(url) {
  if (!url) return false;
  const s = String(url);
  return (
    s.includes('/api/auth/login') ||
    s.includes('/api/auth/register') ||
    s.includes('/api/auth/forgot-password') ||
    s.includes('/api/auth/reset-password')
  );
}

let redirectingOn401 = false;

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status !== 401) {
      return Promise.reject(err);
    }
    if (isUnauthenticatedAuthRequest(err.config?.url)) {
      return Promise.reject(err);
    }
    try {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      delete api.defaults.headers.common.Authorization;
    } catch {
      /* ignore */
    }
    const p = typeof window !== 'undefined' ? window.location?.pathname : '';
    if (p && !p.startsWith('/auth') && !redirectingOn401) {
      redirectingOn401 = true;
      window.location.replace('/auth?session=expired');
    }
    return Promise.reject(err);
  },
);
