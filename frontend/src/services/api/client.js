import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';
export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Response interceptor for unified error formatting
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.message || error.message || 'C2 Network Error';
    console.error(`[C2 API ERROR] ${error.config?.url}:`, message);
    return Promise.reject(new Error(message));
  }
);

// Helper for simulating async mock delays
export const mockDelay = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms));
