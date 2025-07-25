import { Request, Response } from 'express';
import { User, OtpCode, OtpPurpose, Prisma } from '@prisma/client';

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Use Prisma types instead of custom types
export type UserResponse = Omit<User, 'password' | 'updatedAt'>;
export type CreateUserRequest = Prisma.UserCreateInput;

// OTP types
export interface SendOtpRequest {
  phone: string;
  purpose?: OtpPurpose;
}

export interface VerifyOtpRequest {
  phone: string;
  code: string;
  purpose?: OtpPurpose;
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

// Re-export Prisma types for convenience
export { User, OtpCode, OtpPurpose, Prisma }; 