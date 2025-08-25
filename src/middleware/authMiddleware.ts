import { Request, Response, NextFunction } from 'express';
import { JwtService, JwtPayload } from '../services/jwtService';
import { UserService } from '../services/userService';
import { ApiResponse } from '../types';
import { UserRole } from '@prisma/client';

// Extend Request interface to include user information
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        phone: string;
        isVerified: boolean;
        role: UserRole;
      };
    }
  }
}

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    phone: string;
    isVerified: boolean;
    role: UserRole;
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

      // Verify the token first
      const decoded: JwtPayload = JwtService.verifyToken(token);

      // Check if token is blacklisted
      const isBlacklisted = await JwtService.isTokenBlacklisted(token);
      if (isBlacklisted) {
        const response: ApiResponse = {
          success: false,
          error: 'Token has been invalidated. Please login again.',
        };
        res.status(401).json(response);
        return;
      }

      // Check if all tokens for this user are blacklisted (logout from all devices)
      const tokenIssuedAt = decoded.iat || 0;
      const allTokensBlacklisted = await JwtService.areAllUserTokensBlacklisted(decoded.userId, tokenIssuedAt);
      if (allTokensBlacklisted) {
        const response: ApiResponse = {
          success: false,
          error: 'All sessions have been invalidated. Please login again.',
        };
        res.status(401).json(response);
        return;
      }

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
        role: user.role,
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
          
          // Check if token is blacklisted
          const isBlacklisted = await JwtService.isTokenBlacklisted(token);
          if (!isBlacklisted) {
            // Check if all tokens for this user are blacklisted
            const tokenIssuedAt = decoded.iat || 0;
            const allTokensBlacklisted = await JwtService.areAllUserTokensBlacklisted(decoded.userId, tokenIssuedAt);
            
            if (!allTokensBlacklisted) {
              const user = await UserService.getUserById(decoded.userId);
              
              if (user) {
                req.user = {
                  id: user.id,
                  phone: user.phone,
                  isVerified: user.isVerified,
                  role: user.role,
                };
              }
            }
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

  // Middleware to check if user has admin role
  static async requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          error: 'Authentication required',
        };
        res.status(401).json(response);
        return;
      }

      if (req.user.role !== UserRole.ADMIN) {
        const response: ApiResponse = {
          success: false,
          error: 'Admin access required',
        };
        res.status(403).json(response);
        return;
      }

      next();
    } catch (error) {
      console.error('Admin check error:', error);
      
      const response: ApiResponse = {
        success: false,
        error: 'Admin access check failed',
      };
      
      res.status(403).json(response);
    }
  }

  // Middleware to check if user has tech role
  static async requireTech(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          error: 'Authentication required',
        };
        res.status(401).json(response);
        return;
      }

      if (req.user.role !== UserRole.TECH) {
        const response: ApiResponse = {
          success: false,
          error: 'Technical support access required',
        };
        res.status(403).json(response);
        return;
      }

      next();
    } catch (error) {
      console.error('Tech check error:', error);
      
      const response: ApiResponse = {
        success: false,
        error: 'Tech access check failed',
      };
      
      res.status(403).json(response);
    }
  }

  // Middleware to check if user has admin or tech role
  static async requireAdminOrTech(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          error: 'Authentication required',
        };
        res.status(401).json(response);
        return;
      }

      if (req.user.role !== UserRole.ADMIN && req.user.role !== UserRole.TECH) {
        const response: ApiResponse = {
          success: false,
          error: 'Admin or technical support access required',
        };
        res.status(403).json(response);
        return;
      }

      next();
    } catch (error) {
      console.error('Admin/Tech check error:', error);
      
      const response: ApiResponse = {
        success: false,
        error: 'Admin/Tech access check failed',
      };
      
      res.status(403).json(response);
    }
  }
} 