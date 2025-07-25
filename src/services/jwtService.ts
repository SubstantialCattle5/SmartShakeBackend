import jwt from 'jsonwebtoken';
import { UserResponse } from '../types';

export interface JwtPayload {
  userId: number;
  phone: string;
  isVerified: boolean;
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
} 