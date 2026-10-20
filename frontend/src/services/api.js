import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

// Extended timeout for AI endpoints (OpenAI can take 30-60 seconds)
export const AI_TIMEOUT = 60000;

const SESSION_KEYS = ['access_token', 'refresh_token', 'user'];

export const clearSession = () => SESSION_KEYS.forEach((key) => localStorage.removeItem(key));

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// The backend rotates refresh tokens and blacklists the old one, so a refresh token works
// once. When several requests fail with 401 at the same time they all wait for the same
// refresh instead of each spending the token.
let refreshInFlight = null;

const refreshAccessToken = () => {
  if (!refreshInFlight) {
    const refresh = localStorage.getItem('refresh_token');
    const request = refresh
      ? axios.post(`${API_BASE_URL}/auth/token/refresh/`, { refresh })
      : Promise.reject(new Error('No refresh token'));

    refreshInFlight = request
      .then(({ data }) => {
        localStorage.setItem('access_token', data.access);
        if (data.refresh) {
          localStorage.setItem('refresh_token', data.refresh);
        }
        return data.access;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
};

// A 401 from these means wrong credentials or link, not an expired session
const isAuthRequest = (url = '') => /\/auth\/(login|logout|token\/refresh|password-reset)/.test(url);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && original && !original._retry && !isAuthRequest(original.url)) {
      original._retry = true;
      try {
        const access = await refreshAccessToken();
        original.headers.Authorization = `Bearer ${access}`;
        return api(original);
      } catch (refreshError) {
        clearSession();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

/** GET a list endpoint and return all rows (up to the backend's maximum page size of 1000). */
export const getAll = async (url, params = {}) => {
  const { data } = await api.get(url, { params: { page_size: 1000, ...params } });
  return Array.isArray(data) ? data : data.results || [];
};

export default api;
