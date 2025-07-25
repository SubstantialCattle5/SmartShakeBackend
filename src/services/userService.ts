import { prisma } from '../config/database';
import { CreateUserRequest, UserResponse } from '../types';
import { Prisma } from '@prisma/client';

export class UserService {
  // Get all users
  static async getAllUsers(): Promise<UserResponse[]> {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          phone: true,
          email: true,
          name: true,
          isVerified: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
      return users;
    } catch (error) {
      console.error('Error fetching users:', error);
      throw new Error('Failed to fetch users');
    }
  }

  // Get user by ID
  static async getUserById(id: number): Promise<UserResponse | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          phone: true,
          email: true,
          name: true,
          isVerified: true,
          createdAt: true,
        },
      });
      return user;
    } catch (error) {
      console.error('Error fetching user:', error);
      throw new Error('Failed to fetch user');
    }
  }

  // Get user by phone
  static async getUserByPhone(phone: string): Promise<UserResponse | null> {
    try {
      const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
      
      const user = await prisma.user.findUnique({
        where: { phone: cleanPhone },
        select: {
          id: true,
          phone: true,
          email: true,
          name: true,
          isVerified: true,
          createdAt: true,
        },
      });
      return user;
    } catch (error) {
      console.error('Error fetching user by phone:', error);
      throw new Error('Failed to fetch user');
    }
  }

  // Create a new user
  static async createUser(userData: CreateUserRequest): Promise<UserResponse> {
    try {
      // Clean phone number
      const cleanPhone = userData.phone.replace(/[\s\-\(\)]/g, '');
      
      // Validate phone number format
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      if (!phoneRegex.test(cleanPhone)) {
        throw new Error('Invalid phone number format');
      }

      // In a real application, you should hash the password here
      // const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      const user = await prisma.user.create({
        data: {
          phone: cleanPhone,
          email: userData.email,
          name: userData.name,
          password: userData.password, // In production, use hashedPassword
        },
        select: {
          id: true,
          phone: true,
          email: true,
          name: true,
          isVerified: true,
          createdAt: true,
        },
      });
      return user;
    } catch (error) {
      console.error('Error creating user:', error);
      
      // Handle Prisma unique constraint errors
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          const target = error.meta?.target;
          if (Array.isArray(target) && target.includes('phone')) {
            throw new Error('Phone number already exists');
          }
          if (Array.isArray(target) && target.includes('email')) {
            throw new Error('Email already exists');
          }
          throw new Error('User already exists');
        }
      }
      throw new Error('Failed to create user');
    }
  }

  // Create user with phone verification
  static async createUserWithPhone(phone: string, name?: string, isVerified: boolean = true): Promise<UserResponse> {
    try {
      const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
      
      const user = await prisma.user.create({
        data: {
          phone: cleanPhone,
          name,
          isVerified,
        },
        select: {
          id: true,
          phone: true,
          email: true,
          name: true,
          isVerified: true,
          createdAt: true,
        },
      });
      return user;
    } catch (error) {
      console.error('Error creating user with phone:', error);
      
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new Error('Phone number already exists');
        }
      }
      throw new Error('Failed to create user');
    }
  }

  // Mark user as verified by phone
  static async markUserAsVerified(phone: string): Promise<UserResponse | null> {
    try {
      const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
      
      const user = await prisma.user.update({
        where: { phone: cleanPhone },
        data: { isVerified: true },
        select: {
          id: true,
          phone: true,
          email: true,
          name: true,
          isVerified: true,
          createdAt: true,
        },
      });
      return user;
    } catch (error) {
      console.error('Error marking user as verified:', error);
      
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          return null; // User not found
        }
      }
      throw new Error('Failed to verify user');
    }
  }

  // Update user
  static async updateUser(id: number, userData: Partial<CreateUserRequest>): Promise<UserResponse | null> {
    try {
      const user = await prisma.user.update({
        where: { id },
        data: userData,
        select: {
          id: true,
          phone: true,
          email: true,
          name: true,
          isVerified: true,
          createdAt: true,
        },
      });
      return user;
    } catch (error) {
      console.error('Error updating user:', error);
      
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          return null; // User not found
        }
        if (error.code === 'P2002') {
          throw new Error('Email already exists');
        }
      }
      throw new Error('Failed to update user');
    }
  }

  // Delete user
  static async deleteUser(id: number): Promise<boolean> {
    try {
      await prisma.user.delete({
        where: { id },
      });
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          return false; // User not found
        }
      }
      throw new Error('Failed to delete user');
    }
  }
} 