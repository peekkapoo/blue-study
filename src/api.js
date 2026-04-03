const RAW_API_BASE = String(import.meta.env.VITE_API_BASE || '').trim();
const API_BASE = RAW_API_BASE || (import.meta.env.DEV ? 'http://localhost:4000' : '');
const REQUEST_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS || 12000);
const API_BASE_SETUP_ERROR = 'VITE_API_BASE is not configured on Vercel. Set VITE_API_BASE=https://YOUR_BACKEND_URL and redeploy the frontend.';

export const IS_API_BASE_CONFIGURED = Boolean(API_BASE);

function normalizeBase(base) {
  return String(base).trim().replace(/\/+$/, '');
}

function withBase(path) {
  const safePath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizeBase(API_BASE)}${safePath}`;
}

async function fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

function getNetworkErrorMessage(error) {
  if (error?.name === 'AbortError') {
    return 'Backend response timed out. Please try again.';
  }
  return import.meta.env.PROD
    ? 'Unable to connect to backend. Check your backend deployment and VITE_API_BASE.'
    : 'Unable to connect to backend. Run npm run dev, or run frontend and backend in separate terminals.';
}

export async function apiRequest(path, options = {}, token) {
  if (!IS_API_BASE_CONFIGURED) {
    throw new Error(API_BASE_SETUP_ERROR);
  }

  const method = String(options.method || 'GET').toUpperCase();
  const url = withBase(path);
  const maxAttempts = method === 'GET' ? 2 : 1;

  let res;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      res = await fetchWithTimeout(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(options.headers || {}),
        },
      });
      break;
    } catch (error) {
      if (attempt >= maxAttempts) {
        throw new Error(getNetworkErrorMessage(error));
      }
    }
  }

  const contentType = res.headers.get('content-type') || '';
  let data = {};

  if (contentType.includes('application/json')) {
    data = await res.json().catch(() => ({}));
  } else {
    const text = await res.text().catch(() => '');
    data = text ? { message: text } : {};
  }

  if (!res.ok) {
    throw new Error(data.message || `Request failed (${res.status})`);
  }

  return data;
}

export const authApi = {
  register: (payload) => apiRequest('/api/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload) => apiRequest('/api/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  google: (credential) => apiRequest('/api/auth/google', { method: 'POST', body: JSON.stringify({ credential }) }),
  updateProfile: (token, payload) => apiRequest('/api/auth/profile', { method: 'PATCH', body: JSON.stringify(payload) }, token),
  me: (token) => apiRequest('/api/auth/me', {}, token),
  health: () => apiRequest('/api/health'),
  publicConfig: () => apiRequest('/api/public-config'),
};

export const userDataApi = {
  get: (token) => apiRequest('/api/user-data', {}, token),
  save: (token, payload) => apiRequest('/api/user-data', { method: 'PUT', body: JSON.stringify(payload) }, token),
};
