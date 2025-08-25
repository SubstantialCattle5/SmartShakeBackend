import { Request, Response } from 'express';
import { User, OtpCode, OtpPurpose, UserRole, Prisma, DrinkFlavour, DrinkType } from '@prisma/client';

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

// Voucher and consumption statistics types
export interface DrinkStats {
  totalSubscriptions: number; // Legacy: total vouchers for backward compatibility
  activeSubscriptions: number; // Legacy: active vouchers for backward compatibility
  totalDrinksConsumed: number;
  totalDrinksRemaining: number;
  recentConsumptions: Array<{
    productName: string; // Maps to drinkType
    flavor: string; // Maps to drinkSlot
    consumedAt: Date;
    quantity: number;
    machineLocation?: string; // New field for machine location
    machineId?: string; // New field for machine ID
  }>;
  activeSubscriptionDetails: Array<{ // Legacy: voucher details for backward compatibility
    id: number;
    packageName: string; // Maps to voucherNumber for backward compatibility
    totalDrinks: number;
    consumedDrinks: number;
    remainingDrinks: number;
    expiryDate: Date | null;
    status: string;
    // New voucher-specific fields
    voucherNumber?: string;
    pricePerDrink?: number;
    totalPrice?: number;
    isActivated?: boolean;
    purchaseDate?: Date;
    firstUsedAt?: Date | null;
  }>;
}

// Machine QR types
export interface GenerateMachineQRRequest {
  machineId: string;
  drinkType: DrinkType;
  drinkFlavour: DrinkFlavour;
  price: number;
}

export interface GenerateMachineQRResponse {
  qrCode: string;
  sessionId: string;
  machineId: string;
  drinkDetails: {
    type: DrinkType;
    flavour: DrinkFlavour;
    price: number;
  };
  expiresAt: Date;
}

export interface QRScanRequest {
  qrCode: string;
  voucherId: string;
}

export interface PaymentStatusResponse {
  paymentCompleted: boolean;
  sessionId: string;
  consumptionId?: number;
  voucherNumber?: string;
  drinkType?: string;
  drinkSlot?: string;
  consumedAt?: Date;
  canDispense: boolean;
}

// Re-export Prisma types for convenience
export { User, OtpCode, OtpPurpose, UserRole, Prisma }; 