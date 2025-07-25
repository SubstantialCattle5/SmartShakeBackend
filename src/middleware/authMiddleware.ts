import { Request, Response, NextFunction } from 'express';
import { JwtService, JwtPayload } from '../services/jwtService';
import { UserService } from '../services/userService';
import { ApiResponse } from '../types';

// Extend Request interface to include user information
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        phone: string;
        isVerified: boolean;
      };
    }
  }
}

export interface AuthenticatedRequest extends Request {
  user: {
    id: number;
    phone: string;
    isVerified: boolean;
  };
}

export class AuthMiddleware {
  // Middleware to verify JWT token
  static async authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      const token = JwtService.extractTokenFromHeader(authHeader);

      if (!token) {
        const response: ApiResponse = {
          success: false,
          error: 'Access token is required',
        };
        res.status(401).json(response);
        return;
      }

      // Verify the token
      const decoded: JwtPayload = JwtService.verifyToken(token);

      // Get user from database to ensure they still exist and are active
      const user = await UserService.getUserById(decoded.userId);
      if (!user) {
        const response: ApiResponse = {
          success: false,
          error: 'User not found',
        };
        res.status(401).json(response);
        return;
      }

      // Attach user information to request
      req.user = {
        id: user.id,
        phone: user.phone,
        isVerified: user.isVerified,
      };

      next();
    } catch (error) {
      console.error('Authentication error:', error);
      
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed',
      };
      
      res.status(401).json(response);
    }
  }

  // Middleware to check if user is verified
  static async requireVerified(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          error: 'Authentication required',
        };
        res.status(401).json(response);
        return;
      }

      if (!req.user.isVerified) {
        const response: ApiResponse = {
          success: false,
          error: 'Account verification required',
        };
        res.status(403).json(response);
        return;
      }

      next();
    } catch (error) {
      console.error('Verification check error:', error);
      
      const response: ApiResponse = {
        success: false,
        error: 'Verification check failed',
      };
      
      res.status(403).json(response);
    }
  }

  // Optional authentication - doesn't fail if no token provided
  static async optionalAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      const token = JwtService.extractTokenFromHeader(authHeader);

      if (token) {
        try {
          const decoded: JwtPayload = JwtService.verifyToken(token);
          const user = await UserService.getUserById(decoded.userId);
          
          if (user) {
            req.user = {
              id: user.id,
              phone: user.phone,
              isVerified: user.isVerified,
            };
          }
        } catch (error) {
          // Ignore token errors in optional auth
          console.log('Optional auth token error (ignored):', error);
        }
      }

      next();
    } catch (error) {
      // Don't fail the request for optional auth
      console.error('Optional auth error (ignored):', error);
      next();
    }
  }
} 