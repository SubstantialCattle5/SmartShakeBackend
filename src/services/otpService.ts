import { prisma } from '../config/database';
import { Prisma, OtpPurpose } from '@prisma/client';

export class OtpService {
  // Generate a 6-digit OTP (hardcoded for development)
  static generateOtpCode(): string {
    return '000000';
  }

  // Calculate expiration time (5 minutes from now)
  private static getExpirationTime(): Date {
    const now = new Date();
    return new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes
  }

  // Clean and validate phone number
  static cleanAndValidatePhone(phone: string): { cleanPhone: string; isValid: boolean; error?: string } {
    try {
      // Clean phone number (remove spaces, dashes, etc.)
      const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
      
      // Validate phone number format (basic validation)
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      if (!phoneRegex.test(cleanPhone)) {
        return {
          cleanPhone,
          isValid: false,
          error: 'Invalid phone number format. Please use format: +1234567890'
        };
      }

      return { cleanPhone, isValid: true };
    } catch (error) {
      return {
        cleanPhone: phone,
        isValid: false,
        error: 'Invalid phone number format'
      };
    }
  }

  // Send OTP (in real app, integrate with SMS service)
  static async sendOtp(
    phone: string, 
    purpose: OtpPurpose = OtpPurpose.LOGIN
  ): Promise<{ code: string; expiresAt: Date }> {
    try {
      // Clean and validate phone number
      const { cleanPhone, isValid, error } = this.cleanAndValidatePhone(phone);
      if (!isValid) {
        throw new Error(error || 'Invalid phone number format');
      }

      // Generate OTP code
      const code = this.generateOtpCode();
      const expiresAt = this.getExpirationTime();

      // Invalidate any existing unused OTP for this phone and purpose
      await prisma.otpCode.updateMany({
        where: {
          phone: cleanPhone,
          purpose,
          used: false,
          expiresAt: {
            gt: new Date()
          }
        },
        data: {
          used: true
        }
      });

      // Create new OTP record
      await prisma.otpCode.create({
        data: {
          phone: cleanPhone,
          code,
          purpose,
          expiresAt,
        },
      });

      // TODO: In production, integrate with SMS service (Twilio, AWS SNS, etc.)
      console.log(`📱 OTP for ${cleanPhone}: ${code} (expires at ${expiresAt})`);
      
      return { code, expiresAt };
    } catch (error) {
      console.error('Error sending OTP:', error);
      // Re-throw the original error message for better error handling
      throw error;
    }
  }

  // Verify OTP code
  static async verifyOtp(
    phone: string, 
    code: string, 
    purpose: OtpPurpose = OtpPurpose.LOGIN
  ): Promise<boolean> {
    try {
      const { cleanPhone, isValid } = this.cleanAndValidatePhone(phone);
      if (!isValid) {
        return false;
      }
      
      // Find valid OTP
      const otpRecord = await prisma.otpCode.findFirst({
        where: {
          phone: cleanPhone,
          code,
          purpose,
          used: false,
          expiresAt: {
            gt: new Date()
          }
        }
      });

      if (!otpRecord) {
        return false;
      }

      // Mark OTP as used
      await prisma.otpCode.update({
        where: {
          id: otpRecord.id
        },
        data: {
          used: true
        }
      });

      return true;
    } catch (error) {
      console.error('Error verifying OTP:', error);
      throw new Error('Failed to verify OTP');
    }
  }

  // Clean expired OTPs (cleanup job)
  static async cleanExpiredOtps(): Promise<number> {
    try {
      const result = await prisma.otpCode.deleteMany({
        where: {
          expiresAt: {
            lt: new Date()
          }
        }
      });

      return result.count;
    } catch (error) {
      console.error('Error cleaning expired OTPs:', error);
      throw new Error('Failed to clean expired OTPs');
    }
  }

  // Get OTP attempts for rate limiting
  static async getOtpAttempts(phone: string, timeWindow = 60): Promise<number> {
    try {
      const { cleanPhone, isValid } = this.cleanAndValidatePhone(phone);
      if (!isValid) {
        return 0;
      }
      
      const timeLimit = new Date(Date.now() - timeWindow * 60 * 1000); // Last hour

      const count = await prisma.otpCode.count({
        where: {
          phone: cleanPhone,
          createdAt: {
            gte: timeLimit
          }
        }
      });

      return count;
    } catch (error) {
      console.error('Error getting OTP attempts:', error);
      return 0;
    }
  }
} 