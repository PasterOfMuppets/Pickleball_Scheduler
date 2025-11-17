/**
 * API client utility for making HTTP requests to the backend
 */
import axios, { AxiosError, AxiosInstance } from 'axios';
import type { AuthResponse, LoginCredentials, RegisterData, User } from '../types';

// API base URL - use environment variable or default to localhost
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Create axios instance with default configuration
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token to requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API methods
export const api = {
  // Authentication
  auth: {
    register: async (data: RegisterData): Promise<User> => {
      const response = await apiClient.post<User>('/api/auth/register', data);
      return response.data;
    },

    login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
      const response = await apiClient.post<AuthResponse>('/api/auth/login', credentials);
      return response.data;
    },

    getCurrentUser: async (): Promise<User> => {
      const response = await apiClient.get<User>('/api/auth/me');
      return response.data;
    },
  },

  // User management
  users: {
    getProfile: async (): Promise<User> => {
      const response = await apiClient.get<User>('/api/users/me');
      return response.data;
    },

    updateProfile: async (data: Partial<Pick<User, 'name' | 'email' | 'phone'>>): Promise<User> => {
      const response = await apiClient.put<User>('/api/users/me', data);
      return response.data;
    },

    setVacation: async (vacation_until: string | null): Promise<User> => {
      const response = await apiClient.patch<User>('/api/users/me/vacation', {
        vacation_until,
      });
      return response.data;
    },

    endVacation: async (): Promise<User> => {
      const response = await apiClient.delete<User>('/api/users/me/vacation');
      return response.data;
    },
  },
};

export default apiClient;
