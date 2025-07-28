import jwt from 'jsonwebtoken';
import { UserResponse } from '../types';
import { Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import { prisma } from '../config/database';
import { UserRole } from '@prisma/client';

// JWT Payload interface
export interface JwtPayload {
  userId: number;
  phone: string;
  isVerified: boolean;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export class JwtService {
  private static readonly JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key_change_this_in_production';
  private static readonly JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

  // Generate JWT token for a user
  static generateToken(user: UserResponse): string {
    const payload = {
      userId: user.id,
      phone: user.phone,
      isVerified: user.isVerified,
      role: user.role, // Assuming UserResponse includes a 'role' field
      exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days
    };

    try {
      const token = jwt.sign(payload, this.JWT_SECRET);
      return token;
    } catch (error) {
      console.error('Error generating JWT token:', error);
      throw new Error('Failed to generate authentication token');
    }
  }

  // Verify JWT token and return payload
  static verifyToken(token: string): JwtPayload {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as JwtPayload;
      return decoded;
    } catch (error) {
      console.error('Error verifying JWT token:', error);
      
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token has expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      } else if (error instanceof jwt.NotBeforeError) {
        throw new Error('Token not active yet');
      } else {
        throw new Error('Token verification failed');
      }
    }
  }

  // Decode token without verification (for debugging)
  static decodeToken(token: string): JwtPayload | null {
    try {
      const decoded = jwt.decode(token) as JwtPayload;
      return decoded;
    } catch (error) {
      console.error('Error decoding JWT token:', error);
      return null;
    }
  }

  // Check if token is expired
  static isTokenExpired(token: string): boolean {
    try {
      const decoded = this.decodeToken(token);
      if (!decoded || !decoded.exp) {
        return true;
      }

      const currentTime = Math.floor(Date.now() / 1000);
      return decoded.exp < currentTime;
    } catch (error) {
      return true;
    }
  }

  // Extract token from Authorization header
  static extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader) {
      return null;
    }

    // Expected format: "Bearer <token>"
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }

  // Generate refresh token (longer expiry)
  static generateRefreshToken(user: UserResponse): string {
    const payload = {
      userId: user.id,
      phone: user.phone,
      isVerified: user.isVerified,
      role: user.role, // Assuming UserResponse includes a 'role' field
      exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days
    };

    try {
      const token = jwt.sign(payload, this.JWT_SECRET);
      return token;
    } catch (error) {
      console.error('Error generating refresh token:', error);
      throw new Error('Failed to generate refresh token');
    }
  }

  // Hash token for storage (security best practice)
  private static hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  // Blacklist a token (for logout)
  static async blacklistToken(token: string, userId: number, reason: string = 'logout'): Promise<void> {
    try {
      const decoded = this.decodeToken(token);
      if (!decoded || !decoded.exp) {
        throw new Error('Invalid token');
      }

      const tokenHash = this.hashToken(token);
      const expiresAt = new Date(decoded.exp * 1000);

      await prisma.blacklistedToken.create({
        data: {
          tokenHash,
          userId,
          expiresAt,
          reason,
        },
      });
    } catch (error) {
      console.error('Error blacklisting token:', error);
      throw new Error('Failed to blacklist token');
    }
  }

  // Check if a token is blacklisted
  static async isTokenBlacklisted(token: string): Promise<boolean> {
    try {
      const tokenHash = this.hashToken(token);
      
      const blacklistedToken = await prisma.blacklistedToken.findUnique({
        where: {
          tokenHash,
        },
      });

      return !!blacklistedToken;
    } catch (error) {
      console.error('Error checking token blacklist:', error);
      // In case of error, assume token is not blacklisted to avoid blocking valid users
      return false;
    }
  }

  // Blacklist all tokens for a user (logout from all devices)
  static async blacklistAllUserTokens(userId: number, reason: string = 'logout_all_devices'): Promise<void> {
    try {
      // Get all active tokens for the user from database
      // Since we don't store tokens directly, we'll create a future expiry date
      // This will effectively invalidate all current tokens
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1); // 1 year from now

      // Create a special blacklist entry for all tokens
      await prisma.blacklistedToken.create({
        data: {
          tokenHash: `ALL_TOKENS_${userId}_${Date.now()}`, // Unique identifier
          userId,
          expiresAt: futureDate,
          reason,
        },
      });
    } catch (error) {
      console.error('Error blacklisting all user tokens:', error);
      throw new Error('Failed to blacklist all tokens');
    }
  }

  // Check if all tokens for a user are blacklisted (logout from all devices)
  static async areAllUserTokensBlacklisted(userId: number, tokenIssuedAt: number): Promise<boolean> {
    try {
      const blacklistEntry = await prisma.blacklistedToken.findFirst({
        where: {
          userId,
          tokenHash: {
            startsWith: `ALL_TOKENS_${userId}_`,
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (!blacklistEntry) {
        return false;
      }

      // Check if the blacklist entry was created after the token was issued
      const blacklistCreatedAt = Math.floor(blacklistEntry.createdAt.getTime() / 1000);
      return blacklistCreatedAt > tokenIssuedAt;
    } catch (error) {
      console.error('Error checking all tokens blacklist:', error);
      return false;
    }
  }

  // Clean up expired blacklisted tokens (should be run periodically)
  static async cleanupExpiredBlacklistedTokens(): Promise<void> {
    try {
      const now = new Date();
      await prisma.blacklistedToken.deleteMany({
        where: {
          expiresAt: {
            lt: now,
          },
        },
      });
    } catch (error) {
      console.error('Error cleaning up expired blacklisted tokens:', error);
    }
  }
} 