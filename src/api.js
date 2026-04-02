const API_BASE = (import.meta.env.VITE_API_BASE || '').trim();
const REQUEST_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS || 12000);

function normalizeBase(base) {
  return base.replace(/\/+$/, '');
}

function withBase(path) {
  const safePath = path.startsWith('/') ? path : `/${path}`;
  if (!API_BASE) return safePath;
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
    return 'Backend phan hoi qua cham. Vui long thu lai.';
  }
  return 'Khong ket noi duoc backend. Hay chay npm run dev de khoi dong ca frontend va backend.';
}

export async function apiRequest(path, options = {}, token) {
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
  me: (token) => apiRequest('/api/auth/me', {}, token),
  health: () => apiRequest('/api/health'),
  publicConfig: () => apiRequest('/api/public-config'),
};

export const userDataApi = {
  get: (token) => apiRequest('/api/user-data', {}, token),
  save: (token, payload) => apiRequest('/api/user-data', { method: 'PUT', body: JSON.stringify(payload) }, token),
};
