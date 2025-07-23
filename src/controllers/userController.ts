import { Request, Response } from 'express';
import { UserService } from '../services/userService';
import { CreateUserRequest, TypedRequest, ApiResponse } from '../types';

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
      const userId = parseInt(req.params.id);
      
      if (isNaN(userId)) {
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
      const { email, name, password } = req.body;
      
      // Validation
      if (!email || !password) {
        const response: ApiResponse = {
          success: false,
          error: 'Email and password are required',
        };
        res.status(400).json(response);
        return;
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        const response: ApiResponse = {
          success: false,
          error: 'Invalid email format',
        };
        res.status(400).json(response);
        return;
      }

      const user = await UserService.createUser({ email, name, password });
      
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
      const userId = parseInt(req.params.id);
      
      if (isNaN(userId)) {
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

  // DELETE /api/users/:id
  static async deleteUser(req: Request, res: Response): Promise<void> {
    try {
      const userId = parseInt(req.params.id);
      
      if (isNaN(userId)) {
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
          error: 'User not found',
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        message: 'User deleted successfully',
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
} 