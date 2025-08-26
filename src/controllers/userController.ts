import { Request, Response } from 'express';
import { UserService } from '../services/userService';
import { CreateUserRequest, TypedRequest, ApiResponse, UpdateProfileRequest, DrinkStats } from '../types';
import { isUUID } from '../utils/validationHelper';

export class UserController {
  // GET /api/users
  static async getAllUsers(req: Request, res: Response): Promise<void> {
    try {
      const users = await UserService.getAllUsers();
      
      const response: ApiResponse = {
        success: true,
        data: users,
        message: 'Users retrieved successfully',
      };
      
      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getAllUsers controller:', error);
      
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      };
      
      res.status(500).json(response);
    }
  }

  // GET /api/users/:id
  static async getUserById(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.params.id;
      
      if (!isUUID(userId)) {
        const response: ApiResponse = {
          success: false,
          error: 'Invalid user ID',
        };
        res.status(400).json(response);
        return;
      }

      const user = await UserService.getUserById(userId);
      
      if (!user) {
        const response: ApiResponse = {
          success: false,
          error: 'User not found',
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: user,
        message: 'User retrieved successfully',
      };
      
      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getUserById controller:', error);
      
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      };
      
      res.status(500).json(response);
    }
  }

  // POST /api/users
  static async createUser(req: TypedRequest<CreateUserRequest>, res: Response): Promise<void> {
    try {
      const { phone, email, name, password } = req.body;
      
      // Validation
      if (!phone) {
        const response: ApiResponse = {
          success: false,
          error: 'Phone number is required',
        };
        res.status(400).json(response);
        return;
      }

      // Basic phone validation
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
      if (!phoneRegex.test(cleanPhone)) {
        const response: ApiResponse = {
          success: false,
          error: 'Invalid phone number format',
        };
        res.status(400).json(response);
        return;
      }

      const user = await UserService.createUser({ phone, email, name, password });
      
      const response: ApiResponse = {
        success: true,
        data: user,
        message: 'User created successfully',
      };
      
      res.status(201).json(response);
    } catch (error) {
      console.error('Error in createUser controller:', error);
      
      const statusCode = error instanceof Error && error.message === 'Email already exists' ? 400 : 500;
      
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      };
      
      res.status(statusCode).json(response);
    }
  }

  // PUT /api/users/:id
  static async updateUser(req: TypedRequest<Partial<CreateUserRequest>>, res: Response): Promise<void> {
    try {
      const userId = req.params.id;
      
      if (!isUUID(userId)) {
        const response: ApiResponse = {
          success: false,
          error: 'Invalid user ID',
        };
        res.status(400).json(response);
        return;
      }

      const user = await UserService.updateUser(userId, req.body);
      
      if (!user) {
        const response: ApiResponse = {
          success: false,
          error: 'User not found',
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: user,
        message: 'User updated successfully',
      };
      
      res.status(200).json(response);
    } catch (error) {
      console.error('Error in updateUser controller:', error);
      
      const statusCode = error instanceof Error && error.message === 'Email already exists' ? 400 : 500;
      
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      };
      
      res.status(statusCode).json(response);
    }
  }

  // DELETE /api/users/:id - Soft delete user
  static async deleteUser(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.params.id;
      
      if (!isUUID(userId)) {
        const response: ApiResponse = {
          success: false,
          error: 'Invalid user ID',
        };
        res.status(400).json(response);
        return;
      }

      const deleted = await UserService.deleteUser(userId);
      
      if (!deleted) {
        const response: ApiResponse = {
          success: false,
          error: 'User not found or already deleted',
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        message: 'User marked as deleted successfully',
      };
      
      res.status(200).json(response);
    } catch (error) {
      console.error('Error in deleteUser controller:', error);
      
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      };
      
      res.status(500).json(response);
    }
  }

  // GET /api/users/profile - Get current user profile
  static async getUserProfile(req: Request, res: Response): Promise<void> {
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

      const response: ApiResponse = {
        success: true,
        data: { user },
        message: 'Profile retrieved successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getUserProfile controller:', error);
      
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      };
      
      res.status(500).json(response);
    }
  }

  // PUT /api/users/profile - Update current user profile
  static async updateProfile(req: TypedRequest<UpdateProfileRequest>, res: Response): Promise<void> {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          error: 'Authentication required',
        };
        res.status(401).json(response);
        return;
      }

      const { name, phone } = req.body;

      // Validation
      if (!name && !phone) {
        const response: ApiResponse = {
          success: false,
          error: 'At least one field (name or phone) is required for update',
        };
        res.status(400).json(response);
        return;
      }

      // Basic phone validation if phone is provided
      if (phone) {
        const phoneRegex = /^\+?[1-9]\d{1,14}$/;
        const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
        if (!phoneRegex.test(cleanPhone)) {
          const response: ApiResponse = {
            success: false,
            error: 'Invalid phone number format',
          };
          res.status(400).json(response);
          return;
        }
      }

      const result = await UserService.updateCurrentUserProfile(req.user.id, { name, phone });
      
      if (!result) {
        const response: ApiResponse = {
          success: false,
          error: 'User not found',
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: { 
          user: result.user,
          phoneChangeRequiresVerification: result.phoneChangeRequiresVerification 
        },
        message: result.message || 'Profile updated successfully',
      };
      
      res.status(200).json(response);
    } catch (error) {
      console.error('Error in updateProfile controller:', error);
      
      const statusCode = error instanceof Error && (error.message.includes('already exists') || error.message.includes('phone number')) ? 400 : 500;
      
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      };
      
      res.status(statusCode).json(response);
    }
  }



  // GET /api/users/drink-stats - Get current user's drink statistics
  static async getDrinkStats(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          error: 'Authentication required',
        };
        res.status(401).json(response);
        return;
      }

      const stats = await UserService.getUserDrinkStats(req.user.id);
      
      const response: ApiResponse<DrinkStats> = {
        success: true,
        data: stats,
        message: 'Drink statistics retrieved successfully',
      };
      
      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getDrinkStats controller:', error);
      
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      };
      
      res.status(500).json(response);
    }
  }
} 