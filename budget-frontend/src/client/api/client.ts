// src/api/client.ts
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8100/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (api.onUnauthorized) {
        api.onUnauthorized();
      }
    }
    return Promise.reject(error);
  }
);

api.onUnauthorized = () => {};

export default api;