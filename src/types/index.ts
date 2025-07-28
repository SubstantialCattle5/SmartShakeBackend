import { Request, Response } from 'express';
import { User, OtpCode, OtpPurpose, UserRole, Prisma } from '@prisma/client';

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
  token: string; // Access token
  refreshToken?: string; // Refresh token for future implementation
  expiresIn: string; // Token expiry information
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

// Profile update types
export interface UpdateProfileRequest {
  name?: string;
  phone?: string;
}



// Drink statistics types
export interface DrinkStats {
  totalSubscriptions: number;
  activeSubscriptions: number;
  totalDrinksConsumed: number;
  totalDrinksRemaining: number;
  recentConsumptions: Array<{
    productName: string;
    flavor: string;
    consumedAt: Date;
    quantity: number;
  }>;
  activeSubscriptionDetails: Array<{
    id: number;
    packageName: string;
    totalDrinks: number;
    consumedDrinks: number;
    remainingDrinks: number;
    expiryDate: Date;
    status: string;
  }>;
}

// Re-export Prisma types for convenience
export { User, OtpCode, OtpPurpose, UserRole, Prisma }; 