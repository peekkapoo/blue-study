const API_BASE = import.meta.env.VITE_API_BASE || '';

function withBase(path) {
  return `${API_BASE}${path}`;
}

export async function apiRequest(path, options = {}, token) {
  let res;
  try {
    res = await fetch(withBase(path), {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });
  } catch {
    throw new Error('Khong ket noi duoc backend. Hay chay npm run dev de khoi dong ca frontend va backend.');
  }

  const data = await res.json().catch(() => ({}));

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
