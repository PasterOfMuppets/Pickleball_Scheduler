/**
 * TypeScript type definitions for the application
 */

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: 'player' | 'admin';
  status: 'active' | 'vacation' | 'inactive';
  vacation_until: string | null;
  created_at: string;
  updated_at: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  phone?: string;
  sms_opt_in: boolean;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

export interface ApiError {
  detail: string;
}
