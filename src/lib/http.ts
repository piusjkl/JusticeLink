import axios from 'axios';
import type { AxiosRequestHeaders } from 'axios';

// Use relative '/api' by default so Vite dev server can proxy requests during development.
// If VITE_API_URL is set (e.g., in production), it will override this.
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    if (!config.headers) {
      config.headers = {} as AxiosRequestHeaders;
    }
    (config.headers as AxiosRequestHeaders).Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      // auto-logout hook point if desired
    }
    return Promise.reject(err);
  }
);

export default api;
