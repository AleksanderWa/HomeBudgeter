// src/api/client.ts
import axios from 'axios';
import type { RareExpensesResponse } from './types'; // Import the new type

const api = axios.create({
  baseURL: 'http://localhost:8000/api',
  withCredentials: true,
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

// New function to fetch rare expenses summary
export const getRareExpensesSummary = async (): Promise<RareExpensesResponse> => {
  const response = await api.get<RareExpensesResponse>('/plans/rare-expenses-summary');
  return response.data;
};

export default api;