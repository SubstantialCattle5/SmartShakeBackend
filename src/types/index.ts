import { Request, Response } from 'express';

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// User types
export interface CreateUserRequest {
  phone: string;
  email?: string;
  name?: string;
  password?: string;
}

export interface UserResponse {
  id: number;
  phone: string;
  email: string | null;
  name: string | null;
  isVerified: boolean;
  createdAt: Date;
}

// OTP types
export interface SendOtpRequest {
  phone: string;
  purpose?: 'LOGIN' | 'REGISTRATION' | 'PASSWORD_RESET';
}

export interface VerifyOtpRequest {
  phone: string;
  code: string;
  purpose?: 'LOGIN' | 'REGISTRATION' | 'PASSWORD_RESET';
}

export interface OtpResponse {
  message: string;
  expiresAt: Date;
}

export interface LoginResponse {
  user: UserResponse;
  token?: string; // For future JWT implementation
  message: string;
}

// Extended Request/Response types
export interface TypedRequest<T = any> extends Request {
  body: T;
}

export interface TypedResponse<T = any> extends Response {
  json: (body: ApiResponse<T>) => this;
}

// Health check response
export interface HealthCheckResponse {
  status: string;
  timestamp: string;
  service: string;
  database?: string;
} 