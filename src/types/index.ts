import { Request, Response } from 'express';
import { User, OtpCode, OtpPurpose, UserRole, Prisma, DrinkFlavour, DrinkType } from '@prisma/client';

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  code?: string;
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
  consumptionId?: string;
  voucherNumber?: string;
  drinkType?: string;
  drinkSlot?: string;
  consumedAt?: Date;
  canDispense: boolean;
}

// Payment related types
export interface VoucherPurchaseRequest {
  totalDrinks: number;
  totalPrice: number;
  expiryDays?: number;
}

export interface OrderResponse {
  order: {
    id: string;
    orderNumber: string;
    totalAmount: number;
    totalDrinks: number;
    status: string;
    paymentStatus: string;
    createdAt: Date;
  };
  transaction: {
    id: string;
    status: string;
    amount: number;
  };
}

export interface VoucherResponse {
  voucher: {
    id: string;
    voucherNumber: string;
    totalDrinks: number;
    consumedDrinks: number;
    pricePerDrink: number;
    totalPrice: number;
    status: string;
    purchaseDate: Date;
    expiryDate: Date | null;
  };
  order: {
    id: string;
    orderNumber: string;
    status: string;
    paymentStatus: string;
  };
}

// Re-export Prisma types for convenience
export { User, OtpCode, OtpPurpose, UserRole, Prisma }; 