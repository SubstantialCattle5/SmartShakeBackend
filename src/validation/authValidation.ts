import { OtpService } from '../services/otpService';
import { OtpPurpose } from '../types';
import { AUTH_CONFIG } from '../config/constants';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface PhoneValidationResult {
  isValid: boolean;
  error?: string;
  cleanPhone?: string;
}

export class AuthValidation {
  /**
   * Validates send OTP request
   */
  static validateSendOtpRequest(data: {
    phone?: string;
    purpose?: OtpPurpose;
  }): ValidationResult {
    const errors: string[] = [];

    if (!data.phone) {
      errors.push('Phone number is required');
    } else {
      const phoneValidation = OtpService.cleanAndValidatePhone(data.phone);
      if (!phoneValidation.isValid) {
        errors.push(phoneValidation.error || 'Invalid phone number format');
      }
    }

    if (data.purpose && !Object.values(OtpPurpose).includes(data.purpose)) {
      errors.push('Invalid OTP purpose');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates verify OTP request
   */
  static validateVerifyOtpRequest(data: {
    phone?: string;
    code?: string;
    purpose?: OtpPurpose;
  }): ValidationResult {
    const errors: string[] = [];

    if (!data.phone) {
      errors.push('Phone number is required');
    } else {
      const phoneValidation = OtpService.cleanAndValidatePhone(data.phone);
      if (!phoneValidation.isValid) {
        errors.push(phoneValidation.error || 'Invalid phone number format');
      }
    }

    if (!data.code) {
      errors.push('OTP code is required');
    }

    if (data.purpose && !Object.values(OtpPurpose).includes(data.purpose)) {
      errors.push('Invalid OTP purpose');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates registration request
   */
  static validateRegistrationRequest(data: {
    phone?: string;
    name?: string;
  }): ValidationResult {
    const errors: string[] = [];

    if (!data.phone) {
      errors.push('Phone number is required');
    } else {
      const phoneValidation = OtpService.cleanAndValidatePhone(data.phone);
      if (!phoneValidation.isValid) {
        errors.push(phoneValidation.error || 'Invalid phone number format');
      }
    }

    if (!data.name?.trim()) {
      errors.push('Name is required for registration');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates login request
   */
  static validateLoginRequest(data: {
    phone?: string;
  }): ValidationResult {
    const errors: string[] = [];

    if (!data.phone) {
      errors.push('Phone number is required');
    } else {
      const phoneValidation = OtpService.cleanAndValidatePhone(data.phone);
      if (!phoneValidation.isValid) {
        errors.push(phoneValidation.error || 'Invalid phone number format');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates refresh token request
   */
  static validateRefreshTokenRequest(data: {
    refreshToken?: string;
  }): ValidationResult {
    const errors: string[] = [];

    if (!data.refreshToken) {
      errors.push('Refresh token is required');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates phone number and returns clean phone
   */
  static validatePhoneNumber(phone: string): PhoneValidationResult {
    const result = OtpService.cleanAndValidatePhone(phone);
    return {
      isValid: result.isValid,
      error: result.error,
      cleanPhone: result.cleanPhone,
    };
  }

  /**
   * Validates rate limiting
   */
  static validateRateLimit(attempts: number, maxAttempts: number = AUTH_CONFIG.MAX_OTP_ATTEMPTS_PER_HOUR): ValidationResult {
    const errors: string[] = [];

    if (attempts >= maxAttempts) {
      errors.push('Too many OTP requests. Please try again later.');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates user existence for registration (should not exist)
   */
  static validateUserNotExists(userExists: boolean): ValidationResult {
    const errors: string[] = [];

    if (userExists) {
      errors.push('User with this phone number already exists');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates user existence for login (should exist)
   */
  static validateUserExists(userExists: boolean): ValidationResult {
    const errors: string[] = [];

    if (!userExists) {
      errors.push('User not found. Please register first.');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates user verification status
   */
  static validateUserVerification(
    isVerified: boolean, 
    createdAt: Date, 
    context: 'login' | 'registration' = 'login'
  ): ValidationResult {
    const errors: string[] = [];

    if (!isVerified) {
      if (context === 'login') {
        // Check if this user has been created recently - likely a new registration
        const recentThreshold = new Date(Date.now() - AUTH_CONFIG.RECENT_REGISTRATION_THRESHOLD_MS);
        const isRecentRegistration = createdAt > recentThreshold;
        
        let errorMessage = 'Account not verified.';
        if (isRecentRegistration) {
          errorMessage += ' Please complete registration first.';
        } else {
          errorMessage += ' If you recently changed your phone number, please verify it using the OTP sent to your new number with purpose "PHONE_VERIFICATION".';
        }
        errors.push(errorMessage);
      } else {
        errors.push('Account not verified. Please complete registration first.');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates phone verification context
   */
  static validatePhoneVerification(userExists: boolean, isVerified: boolean): ValidationResult {
    const errors: string[] = [];

    if (!userExists) {
      errors.push('User not found with this phone number. Please ensure you are using the correct phone number.');
    } else if (isVerified) {
      errors.push('Phone number is already verified. You can login normally.');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
} 