import { Request, Response } from 'express';
import { OtpService } from '../services/otpService';
import { UserService } from '../services/userService';
import { JwtService } from '../services/jwtService';
import { AuthValidation } from '../validation/authValidation';
import { AUTH_CONFIG } from '../config/constants';
import { SendOtpRequest, VerifyOtpRequest, TypedRequest, ApiResponse, LoginResponse, OtpResponse, OtpPurpose } from '../types';

export class AuthController {
  // POST /api/auth/send-otp
  static async sendOtp(req: TypedRequest<SendOtpRequest>, res: Response): Promise<void> {
    try {
      const { phone, purpose = OtpPurpose.LOGIN } = req.body;
      
      // Validate request
      const validation = AuthValidation.validateSendOtpRequest({ phone, purpose });
      if (!validation.isValid) {
        const response: ApiResponse = {
          success: false,
          error: validation.errors[0],
        };
        res.status(400).json(response);
        return;
      }

      // Rate limiting check
      const attempts = await OtpService.getOtpAttempts(phone!, AUTH_CONFIG.RATE_LIMIT_WINDOW_MINUTES);
      const rateLimitValidation = AuthValidation.validateRateLimit(attempts);
      if (!rateLimitValidation.isValid) {
        const response: ApiResponse = {
          success: false,
          error: rateLimitValidation.errors[0],
        };
        res.status(429).json(response);
        return;
      }

      // For registration, check if user doesn't exist
      if (purpose === OtpPurpose.REGISTRATION) {
        const existingUser = await UserService.getUserByPhone(phone!);
        const userNotExistsValidation = AuthValidation.validateUserNotExists(!!existingUser);
        if (!userNotExistsValidation.isValid) {
          const response: ApiResponse = {
            success: false,
            error: userNotExistsValidation.errors[0],
          };
          res.status(400).json(response);
          return;
        }
      }

      // For login, check if user exists
      if (purpose === OtpPurpose.LOGIN) {
        const existingUser = await UserService.getUserByPhone(phone!);
        const userExistsValidation = AuthValidation.validateUserExists(!!existingUser);
        if (!userExistsValidation.isValid) {
          const response: ApiResponse = {
            success: false,
            error: userExistsValidation.errors[0],
          };
          res.status(404).json(response);
          return;
        }
      }

      try {
        const { code, expiresAt } = await OtpService.sendOtp(phone!, purpose);
        
        const response: ApiResponse<OtpResponse> = {
          success: true,
          data: {
            message: `OTP sent to ${phone}`,
            expiresAt,
          },
          message: 'OTP sent successfully',
        };
        
        res.status(200).json(response);
      } catch (otpError) {
        console.error('Failed to send OTP:', otpError);
        
        const response: ApiResponse = {
          success: false,
          error: otpError instanceof Error ? otpError.message : 'Failed to send OTP',
        };
        res.status(400).json(response);
        return;
      }
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
      const { phone, code, purpose = OtpPurpose.LOGIN } = req.body;
      
      // Validate request
      const validation = AuthValidation.validateVerifyOtpRequest({ phone, code, purpose });
      if (!validation.isValid) {
        const response: ApiResponse = {
          success: false,
          error: validation.errors[0],
        };
        res.status(400).json(response);
        return;
      }

      // Verify OTP
      const isValid = await OtpService.verifyOtp(phone!, code!, purpose);
      
      if (!isValid) {
        const response: ApiResponse = {
          success: false,
          error: 'Invalid or expired OTP code',
        };
        res.status(400).json(response);
        return;
      }

      let user;

      if (purpose === OtpPurpose.REGISTRATION) {
        // Get the unverified user and mark as verified
        user = await UserService.getUserByPhone(phone!);
        if (!user) {
          const response: ApiResponse = {
            success: false,
            error: 'User not found. Please register first.',
          };
          res.status(404).json(response);
          return;
        }
        
        // Mark user as verified
        const verifiedUser = await UserService.markUserAsVerified(phone!);
        if (!verifiedUser) {
          const response: ApiResponse = {
            success: false,
            error: 'Failed to verify user.',
          };
          res.status(500).json(response);
          return;
        }
        user = verifiedUser;
      } else if (purpose === OtpPurpose.PHONE_VERIFICATION) {
        // Handle phone verification for profile updates
        const { cleanPhone } = AuthValidation.validatePhoneNumber(phone!);
        
        // Check if user exists with this phone number
        const existingUser = await UserService.getUserByPhone(cleanPhone!);
        const phoneVerificationValidation = AuthValidation.validatePhoneVerification(
          !!existingUser, 
          existingUser?.isVerified || false
        );
        
        if (!phoneVerificationValidation.isValid) {
          const response: ApiResponse = {
            success: false,
            error: phoneVerificationValidation.errors[0],
          };
          res.status(existingUser ? 400 : 404).json(response);
          return;
        }
        
        // Find user by phone number and mark as verified
        const verifiedUser = await UserService.markUserAsVerified(cleanPhone!);
        if (!verifiedUser) {
          const response: ApiResponse = {
            success: false,
            error: 'Failed to verify phone number. Please try again.',
          };
          res.status(500).json(response);
          return;
        }
        user = verifiedUser;
        
        const response: ApiResponse = {
          success: true,
          data: { user },
          message: 'Phone number verified successfully. You can now login with this phone number.',
        };
        
        res.status(200).json(response);
        return;
      } else {
        // Get existing user for login
        user = await UserService.getUserByPhone(phone!);
        if (!user) {
          const response: ApiResponse = {
            success: false,
            error: 'User not found',
          };
          res.status(404).json(response);
          return;
        }

        // Check if user is verified
        const verificationValidation = AuthValidation.validateUserVerification(
          user.isVerified, 
          user.createdAt, 
          'login'
        );
        
        if (!verificationValidation.isValid) {
          const response: ApiResponse = {
            success: false,
            error: verificationValidation.errors[0],
          };
          res.status(400).json(response);
          return;
        }
      }

      // Generate JWT tokens (for login and registration, not for phone verification)
      const token = JwtService.generateToken(user);
      const refreshToken = JwtService.generateRefreshToken(user);

      const response: ApiResponse<LoginResponse> = {
        success: true,
        data: {
          user,
          token,
          refreshToken,
          expiresIn: '7d',
          message: purpose === OtpPurpose.REGISTRATION ? 'Registration successful' : 'Login successful',
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
      
      // Validate request
      const validation = AuthValidation.validateRegistrationRequest({ phone, name });
      if (!validation.isValid) {
        const response: ApiResponse = {
          success: false,
          error: validation.errors[0],
        };
        res.status(400).json(response);
        return;
      }

      // Check if user already exists
      const existingUser = await UserService.getUserByPhone(phone!);
      const userNotExistsValidation = AuthValidation.validateUserNotExists(!!existingUser);
      if (!userNotExistsValidation.isValid) {
        const response: ApiResponse = {
          success: false,
          error: userNotExistsValidation.errors[0],
        };
        res.status(400).json(response);
        return;
      }

      // Create user with isVerified: false
      await UserService.createUserWithPhone(phone!, name!, false);

      // Send OTP for registration
      try {
        const { expiresAt } = await OtpService.sendOtp(phone!, OtpPurpose.REGISTRATION);
        
        const response: ApiResponse<OtpResponse> = {
          success: true,
          data: {
            message: `OTP sent to ${phone} for registration`,
            expiresAt,
          },
          message: 'Registration initiated. Please verify OTP to complete registration.',
        };
        
        res.status(200).json(response);
      } catch (otpError) {
        // If OTP sending fails after user creation, we should handle this gracefully
        console.error('Failed to send OTP after user creation:', otpError);
        
        const response: ApiResponse = {
          success: false,
          error: 'User created but failed to send verification OTP. Please try logging in to resend OTP.',
        };
        res.status(400).json(response);
        return;
      }
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
      
      // Validate request
      const validation = AuthValidation.validateLoginRequest({ phone });
      if (!validation.isValid) {
        const response: ApiResponse = {
          success: false,
          error: validation.errors[0],
        };
        res.status(400).json(response);
        return;
      }

      // Check if user exists
      const existingUser = await UserService.getUserByPhone(phone!);
      const userExistsValidation = AuthValidation.validateUserExists(!!existingUser);
      if (!userExistsValidation.isValid) {
        const response: ApiResponse = {
          success: false,
          error: userExistsValidation.errors[0],
        };
        res.status(404).json(response);
        return;
      }

      // Check if user is verified
      const verificationValidation = AuthValidation.validateUserVerification(
        existingUser!.isVerified, 
        existingUser!.createdAt, 
        'login'
      );
      
      if (!verificationValidation.isValid) {
        const response: ApiResponse = {
          success: false,
          error: verificationValidation.errors[0],
        };
        res.status(400).json(response);
        return;
      }

      // Send OTP for login
      try {
        const { expiresAt } = await OtpService.sendOtp(phone!, OtpPurpose.LOGIN);
        
        const response: ApiResponse<OtpResponse> = {
          success: true,
          data: {
            message: `OTP sent to ${phone} for login`,
            expiresAt,
          },
          message: 'Login OTP sent. Please verify to complete login.',
        };
        
        res.status(200).json(response);
      } catch (otpError) {
        console.error('Failed to send login OTP:', otpError);
        
        const response: ApiResponse = {
          success: false,
          error: otpError instanceof Error ? otpError.message : 'Failed to send OTP',
        };
        res.status(400).json(response);
        return;
      }
    } catch (error) {
      console.error('Error in loginWithPhone controller:', error);
      
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      };
      
      res.status(500).json(response);
    }
  }

  // POST /api/auth/refresh-token
  static async refreshToken(req: TypedRequest<{ refreshToken: string }>, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      // Validate request
      const validation = AuthValidation.validateRefreshTokenRequest({ refreshToken });
      if (!validation.isValid) {
        const response: ApiResponse = {
          success: false,
          error: validation.errors[0],
        };
        res.status(400).json(response);
        return;
      }

      // Verify refresh token
      try {
        const decoded = JwtService.verifyToken(refreshToken!);
        
        // Get user from database
        const user = await UserService.getUserById(decoded.userId.toString());
        if (!user) {
          const response: ApiResponse = {
            success: false,
            error: 'User not found',
          };
          res.status(404).json(response);
          return;
        }

        // Generate new tokens
        const newToken = JwtService.generateToken(user);
        const newRefreshToken = JwtService.generateRefreshToken(user);

        const response: ApiResponse<{ token: string; refreshToken: string; expiresIn: string }> = {
          success: true,
          data: {
            token: newToken,
            refreshToken: newRefreshToken,
            expiresIn: '7d',
          },
          message: 'Token refreshed successfully',
        };

        res.status(200).json(response);
      } catch (tokenError) {
        console.error('Invalid refresh token:', tokenError);
        
        const response: ApiResponse = {
          success: false,
          error: 'Invalid or expired refresh token',
        };
        res.status(401).json(response);
        return;
      }
    } catch (error) {
      console.error('Error in refreshToken controller:', error);
      
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      };
      
      res.status(500).json(response);
    }
  }

  // GET /api/auth/profile - Get current user profile
  static async getProfile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          error: 'Authentication required',
        };
        res.status(401).json(response);
        return;
      }

      // Get full user data from database
      const user = await UserService.getUserById(req.user.id);
      if (!user) {
        const response: ApiResponse = {
          success: false,
          error: 'User not found',
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse<{ user: typeof user }> = {
        success: true,
        data: { user },
        message: 'Profile retrieved successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getProfile controller:', error);
      
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      };
      
      res.status(500).json(response);
    }
  }

  // POST /api/auth/logout - Logout with token blacklisting
  static async logout(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          error: 'Authentication required',
        };
        res.status(401).json(response);
        return;
      }

      // Extract token from Authorization header
      const authHeader = req.headers.authorization;
      const token = JwtService.extractTokenFromHeader(authHeader);

      if (!token) {
        const response: ApiResponse = {
          success: false,
          error: 'No token provided',
        };
        res.status(400).json(response);
        return;
      }

      // Blacklist the current token
      await JwtService.blacklistToken(token, req.user.id, 'logout');

      const response: ApiResponse = {
        success: true,
        message: 'Logged out successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in logout controller:', error);
      
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      };
      
      res.status(500).json(response);
    }
  }

  // POST /api/auth/logout-all - Logout from all devices
  static async logoutAll(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          error: 'Authentication required',
        };
        res.status(401).json(response);
        return;
      }

      // Blacklist all tokens for this user
      await JwtService.blacklistAllUserTokens(req.user.id, 'logout_all_devices');

      const response: ApiResponse = {
        success: true,
        message: 'Logged out from all devices successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in logoutAll controller:', error);
      
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      };
      
      res.status(500).json(response);
    }
  }

  // POST /api/auth/resend-phone-verification-otp - Resend OTP for phone verification
  static async resendPhoneVerificationOtp(req: TypedRequest<{ phone: string }>, res: Response): Promise<void> {
    try {
      const { phone } = req.body;

      // Validate request
      const validation = AuthValidation.validateLoginRequest({ phone });
      if (!validation.isValid) {
        const response: ApiResponse = {
          success: false,
          error: validation.errors[0],
        };
        res.status(400).json(response);
        return;
      }

      // Check if user exists
      const user = await UserService.getUserByPhone(phone!);
      const userExistsValidation = AuthValidation.validateUserExists(!!user);
      if (!userExistsValidation.isValid) {
        const response: ApiResponse = {
          success: false,
          error: userExistsValidation.errors[0],
        };
        res.status(404).json(response);
        return;
      }

      // Check if user is already verified
      if (user!.isVerified) {
        const response: ApiResponse = {
          success: false,
          error: 'Phone number is already verified.',
        };
        res.status(400).json(response);
        return;
      }

      // Send OTP for phone verification
      try {
        const { expiresAt } = await OtpService.sendOtp(phone!, OtpPurpose.PHONE_VERIFICATION);
        
        const response: ApiResponse<OtpResponse> = {
          success: true,
          data: {
            message: `OTP sent to ${phone} for phone verification`,
            expiresAt,
          },
          message: 'Phone verification OTP sent. Please verify your phone number.',
        };
        
        res.status(200).json(response);
      } catch (otpError) {
        console.error('Failed to send phone verification OTP:', otpError);
        
        const response: ApiResponse = {
          success: false,
          error: otpError instanceof Error ? otpError.message : 'Failed to send OTP',
        };
        res.status(400).json(response);
        return;
      }
    } catch (error) {
      console.error('Error in resendPhoneVerificationOtp controller:', error);
      
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      };
      
      res.status(500).json(response);
    }
  }


} 