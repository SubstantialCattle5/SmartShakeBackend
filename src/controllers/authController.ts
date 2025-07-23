import { Request, Response } from 'express';
import { OtpService } from '../services/otpService';
import { UserService } from '../services/userService';
import { SendOtpRequest, VerifyOtpRequest, TypedRequest, ApiResponse, LoginResponse, OtpResponse } from '../types';

export class AuthController {
  // POST /api/auth/send-otp
  static async sendOtp(req: TypedRequest<SendOtpRequest>, res: Response): Promise<void> {
    try {
      const { phone, purpose = 'LOGIN' } = req.body;
      
      if (!phone) {
        const response: ApiResponse = {
          success: false,
          error: 'Phone number is required',
        };
        res.status(400).json(response);
        return;
      }

      // Rate limiting check
      const attempts = await OtpService.getOtpAttempts(phone, 60); // Last hour
      if (attempts >= 5) {
        const response: ApiResponse = {
          success: false,
          error: 'Too many OTP requests. Please try again later.',
        };
        res.status(429).json(response);
        return;
      }

      // For registration, check if user doesn't exist
      if (purpose === 'REGISTRATION') {
        const existingUser = await UserService.getUserByPhone(phone);
        if (existingUser) {
          const response: ApiResponse = {
            success: false,
            error: 'User with this phone number already exists',
          };
          res.status(400).json(response);
          return;
        }
      }

      // For login, check if user exists
      if (purpose === 'LOGIN') {
        const existingUser = await UserService.getUserByPhone(phone);
        if (!existingUser) {
          const response: ApiResponse = {
            success: false,
            error: 'User not found. Please register first.',
          };
          res.status(404).json(response);
          return;
        }
      }

      const { code, expiresAt } = await OtpService.sendOtp(phone, purpose);
      
      const response: ApiResponse<OtpResponse> = {
        success: true,
        data: {
          message: `OTP sent to ${phone}`,
          expiresAt,
        },
        message: 'OTP sent successfully',
      };
      
      res.status(200).json(response);
    } catch (error) {
      console.error('Error in sendOtp controller:', error);
      
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      };
      
      res.status(500).json(response);
    }
  }

  // POST /api/auth/verify-otp
  static async verifyOtp(req: TypedRequest<VerifyOtpRequest>, res: Response): Promise<void> {
    try {
      const { phone, code, purpose = 'LOGIN' } = req.body;
      
      if (!phone || !code) {
        const response: ApiResponse = {
          success: false,
          error: 'Phone number and OTP code are required',
        };
        res.status(400).json(response);
        return;
      }

      // Verify OTP
      const isValid = await OtpService.verifyOtp(phone, code, purpose);
      
      if (!isValid) {
        const response: ApiResponse = {
          success: false,
          error: 'Invalid or expired OTP code',
        };
        res.status(400).json(response);
        return;
      }

      let user;

      if (purpose === 'REGISTRATION') {
        // Create new user
        user = await UserService.createUserWithPhone(phone);
      } else {
        // Get existing user
        user = await UserService.getUserByPhone(phone);
        if (!user) {
          const response: ApiResponse = {
            success: false,
            error: 'User not found',
          };
          res.status(404).json(response);
          return;
        }
      }

      const response: ApiResponse<LoginResponse> = {
        success: true,
        data: {
          user,
          message: purpose === 'REGISTRATION' ? 'Registration successful' : 'Login successful',
          // TODO: Add JWT token here in future
        },
        message: 'OTP verified successfully',
      };
      
      res.status(200).json(response);
    } catch (error) {
      console.error('Error in verifyOtp controller:', error);
      
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      };
      
      res.status(500).json(response);
    }
  }

  // POST /api/auth/register
  static async registerWithPhone(req: TypedRequest<{ phone: string; name?: string }>, res: Response): Promise<void> {
    try {
      const { phone, name } = req.body;
      
      if (!phone) {
        const response: ApiResponse = {
          success: false,
          error: 'Phone number is required',
        };
        res.status(400).json(response);
        return;
      }

      // Check if user already exists
      const existingUser = await UserService.getUserByPhone(phone);
      if (existingUser) {
        const response: ApiResponse = {
          success: false,
          error: 'User with this phone number already exists',
        };
        res.status(400).json(response);
        return;
      }

      // Send OTP for registration
      const { expiresAt } = await OtpService.sendOtp(phone, 'REGISTRATION');
      
      const response: ApiResponse<OtpResponse> = {
        success: true,
        data: {
          message: `OTP sent to ${phone} for registration`,
          expiresAt,
        },
        message: 'Registration OTP sent. Please verify to complete registration.',
      };
      
      res.status(200).json(response);
    } catch (error) {
      console.error('Error in registerWithPhone controller:', error);
      
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      };
      
      res.status(500).json(response);
    }
  }

  // POST /api/auth/login
  static async loginWithPhone(req: TypedRequest<{ phone: string }>, res: Response): Promise<void> {
    try {
      const { phone } = req.body;
      
      if (!phone) {
        const response: ApiResponse = {
          success: false,
          error: 'Phone number is required',
        };
        res.status(400).json(response);
        return;
      }

      // Check if user exists
      const existingUser = await UserService.getUserByPhone(phone);
      if (!existingUser) {
        const response: ApiResponse = {
          success: false,
          error: 'User not found. Please register first.',
        };
        res.status(404).json(response);
        return;
      }

      // Send OTP for login
      const { expiresAt } = await OtpService.sendOtp(phone, 'LOGIN');
      
      const response: ApiResponse<OtpResponse> = {
        success: true,
        data: {
          message: `OTP sent to ${phone} for login`,
          expiresAt,
        },
        message: 'Login OTP sent. Please verify to complete login.',
      };
      
      res.status(200).json(response);
    } catch (error) {
      console.error('Error in loginWithPhone controller:', error);
      
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      };
      
      res.status(500).json(response);
    }
  }
} 