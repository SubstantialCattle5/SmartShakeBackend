import { prisma } from '../config/database';
import { UserResponse, CreateUserRequest, UpdateProfileRequest, DrinkStats, OtpPurpose } from '../types';
import { Prisma } from '@prisma/client';
import { OtpService } from './otpService';

export class UserService {
  // Get all users
  static async getAllUsers(): Promise<UserResponse[]> {
    try {
      const users = await prisma.user.findMany({
        where: {
          deleted: false,
        },
        select: {
          id: true,
          phone: true,
          email: true,
          name: true,
          isVerified: true,
          isActive: true,
          deleted: true,
          role: true,
          lastLoginAt: true,
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

  // Get all users including deleted ones (admin function)
  static async getAllUsersIncludingDeleted(): Promise<UserResponse[]> {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          phone: true,
          email: true,
          name: true,
          isVerified: true,
          isActive: true,
          deleted: true,
          role: true,
          lastLoginAt: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
      return users;
    } catch (error) {
      console.error('Error fetching all users including deleted:', error);
      throw new Error('Failed to fetch users');
    }
  }

  // Get user by ID
  static async getUserById(id: string): Promise<UserResponse | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { 
          id,
          deleted: false,
        },
        select: {
          id: true,
          phone: true,
          email: true,
          name: true,
          isVerified: true,
          isActive: true,
          deleted: true,
          role: true,
          lastLoginAt: true,
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
      const { cleanPhone, isValid } = OtpService.cleanAndValidatePhone(phone);
      if (!isValid) {
        return null; // Invalid phone format, user not found
      }
      
      const user = await prisma.user.findUnique({
        where: { 
          phone: cleanPhone,
          deleted: false,
        },
        select: {
          id: true,
          phone: true,
          email: true,
          name: true,
          isVerified: true,
          isActive: true,
          deleted: true,
          role: true,
          lastLoginAt: true,
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
      // Validate phone if provided
      if (userData.phone) {
        const { cleanPhone, isValid, error } = OtpService.cleanAndValidatePhone(userData.phone);
        if (!isValid) {
          throw new Error(error || 'Invalid phone number format');
        }
        userData.phone = cleanPhone;
      }

      const user = await prisma.user.create({
        data: userData,
        select: {
          id: true,
          phone: true,
          email: true,
          name: true,
          isVerified: true,
          isActive: true,
          deleted: true,
          role: true,
          lastLoginAt: true,
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
      throw error instanceof Error ? error : new Error('Failed to create user');
    }
  }

  // Create user with phone verification
  static async createUserWithPhone(phone: string, name?: string, isVerified: boolean = true): Promise<UserResponse> {
    try {
      const { cleanPhone, isValid, error } = OtpService.cleanAndValidatePhone(phone);
      if (!isValid) {
        throw new Error(error || 'Invalid phone number format');
      }
      
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
          isActive: true,
          deleted: true,
          role: true,
          lastLoginAt: true,
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
      throw error instanceof Error ? error : new Error('Failed to create user');
    }
  }

  // Mark user as verified by phone
  static async markUserAsVerified(phone: string): Promise<UserResponse | null> {
    try {
      const { cleanPhone, isValid } = OtpService.cleanAndValidatePhone(phone);
      if (!isValid) {
        return null;
      }
      
      const user = await prisma.user.update({
        where: { 
          phone: cleanPhone,
          deleted: false,
        },
        data: { isVerified: true },
        select: {
          id: true,
          phone: true,
          email: true,
          name: true,
          isVerified: true,
          isActive: true,
          deleted: true,
          role: true,
          lastLoginAt: true,
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
  static async updateUser(id: string, userData: Partial<CreateUserRequest>): Promise<UserResponse | null> {
    try {
      // Validate phone if being updated
      if (userData.phone) {
        const { cleanPhone, isValid, error } = OtpService.cleanAndValidatePhone(userData.phone);
        if (!isValid) {
          throw new Error(error || 'Invalid phone number format');
        }
        userData.phone = cleanPhone;
      }

      const user = await prisma.user.update({
        where: { 
          id,
          deleted: false,
        },
        data: userData,
        select: {
          id: true,
          phone: true,
          email: true,
          name: true,
          isVerified: true,
          isActive: true,
          deleted: true,
          role: true,
          lastLoginAt: true,
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
      throw error instanceof Error ? error : new Error('Failed to update user');
    }
  }

  // Soft delete user
  static async deleteUser(id: string): Promise<boolean> {
    try {
      const result = await prisma.user.update({
        where: { 
          id,
          deleted: false, // Only allow deletion of non-deleted users
        },
        data: { deleted: true },
      });
      return !!result; // Return true if update was successful
    } catch (error) {
      console.error('Error deleting user:', error);
      
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          return false; // User not found or already deleted
        }
      }
      throw new Error('Failed to delete user');
    }
  }

  // Update current user's profile (for authenticated users)
  static async updateCurrentUserProfile(userId: string, profileData: UpdateProfileRequest): Promise<{ user?: UserResponse; phoneChangeRequiresVerification?: boolean; message?: string } | null> {
    try {
      let phoneChanged = false;
      let newPhone = '';

      // Check if phone is being updated
      if (profileData.phone) {
        const { cleanPhone, isValid, error } = OtpService.cleanAndValidatePhone(profileData.phone);
        if (!isValid) {
          throw new Error(error || 'Invalid phone number format');
        }

        // Get current user to check if phone is actually changing
        const currentUser = await prisma.user.findUnique({
          where: { 
            id: userId,
            deleted: false,
          },
          select: { phone: true }
        });

        if (!currentUser) {
          return null;
        }

        if (currentUser.phone !== cleanPhone) {
          phoneChanged = true;
          newPhone = cleanPhone;

          // Check if phone number is already taken by another user
          const existingUserWithPhone = await prisma.user.findUnique({
            where: { 
              phone: cleanPhone,
              deleted: false,
            },
            select: { id: true }
          });

          if (existingUserWithPhone && existingUserWithPhone.id !== userId) {
            throw new Error('Phone number already exists');
          }
        }

        profileData.phone = cleanPhone;
      }

      // If phone is changing, we need to set isVerified to false and send OTP
      const updateData: Prisma.UserUpdateInput = { ...profileData };
      if (phoneChanged) {
        updateData.isVerified = false;
      }

      const user = await prisma.user.update({
        where: { 
          id: userId,
          deleted: false,
        },
        data: updateData,
        select: {
          id: true,
          phone: true,
          email: true,
          name: true,
          isVerified: true,
          isActive: true,
          deleted: true,
          role: true,
          lastLoginAt: true,
          createdAt: true,
        },
      });

      // If phone changed, send OTP for verification
      if (phoneChanged) {
        try {
          await OtpService.sendOtp(newPhone, OtpPurpose.PHONE_VERIFICATION); // Using PHONE_VERIFICATION purpose for phone verification
          return {
            user,
            phoneChangeRequiresVerification: true,
            message: `Profile updated. Please verify your new phone number ${newPhone} with the OTP sent. To verify, call POST /api/auth/verify-otp with phone: "${newPhone}", code: "YOUR_OTP", and purpose: "PHONE_VERIFICATION". After verification, you can login normally.`
          };
        } catch (otpError) {
          console.error('Failed to send OTP for phone verification:', otpError);
          throw new Error('Profile updated but failed to send verification OTP. Please contact support.');
        }
      }

      return { user };
    } catch (error) {
      console.error('Error updating user profile:', error);
      
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          return null; // User not found
        }
        if (error.code === 'P2002') {
          const target = error.meta?.target;
          if (Array.isArray(target) && target.includes('phone')) {
            throw new Error('Phone number already exists');
          }
          throw new Error('Data already exists');
        }
      }
      throw error instanceof Error ? error : new Error('Failed to update profile');
    }
  }

  // Get user's voucher and consumption statistics
  static async getUserDrinkStats(userId: string): Promise<DrinkStats> {
    try {
      // Get all user vouchers with related data
      const vouchers = await prisma.drinkVoucher.findMany({
        where: { userId },
        include: {
          consumptions: {
            orderBy: {
              consumedAt: 'desc',
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Calculate stats
      const totalVouchers = vouchers.length;
      const activeVouchers = vouchers.filter((voucher) => 
        voucher.status === 'ACTIVE' && 
        (voucher.expiryDate === null || voucher.expiryDate > new Date()) &&
        voucher.consumedDrinks < voucher.totalDrinks
      ).length;
      
      // Calculate total drinks consumed and remaining
      let totalDrinksConsumed = 0;
      let totalDrinksRemaining = 0;
      
      vouchers.forEach((voucher) => {
        totalDrinksConsumed += voucher.consumedDrinks;
        if (voucher.status === 'ACTIVE' && 
            (voucher.expiryDate === null || voucher.expiryDate > new Date()) &&
            voucher.consumedDrinks < voucher.totalDrinks) {
          totalDrinksRemaining += (voucher.totalDrinks - voucher.consumedDrinks);
        }
      });

      // Get recent consumptions (last 10)
      const recentConsumptions = await prisma.consumption.findMany({
        where: { userId },
        orderBy: {
          consumedAt: 'desc',
        },
        take: 10,
      });

      // Get active voucher details
      const activeVoucherDetails = vouchers
        .filter((voucher) => 
          voucher.status === 'ACTIVE' && 
          (voucher.expiryDate === null || voucher.expiryDate > new Date()) &&
          voucher.consumedDrinks < voucher.totalDrinks
        )
        .map((voucher) => ({
          id: voucher.id,
          packageName: voucher.voucherNumber, // Map voucherNumber to packageName for backward compatibility
          totalDrinks: voucher.totalDrinks,
          consumedDrinks: voucher.consumedDrinks,
          remainingDrinks: voucher.totalDrinks - voucher.consumedDrinks,
          expiryDate: voucher.expiryDate,
          status: voucher.status,
          // Additional voucher-specific fields
          voucherNumber: voucher.voucherNumber,
          pricePerDrink: Number(voucher.pricePerDrink),
          totalPrice: Number(voucher.totalPrice),
          isActivated: voucher.isActivated,
          purchaseDate: voucher.purchaseDate,
          firstUsedAt: voucher.firstUsedAt,
        }));

      return {
        totalDrinksConsumed,
        totalDrinksRemaining,
        recentConsumptions: recentConsumptions.map((consumption) => ({
          productName: consumption.drinkType || 'Unknown Drink',
          flavor: consumption.drinkFlavour || '',
          consumedAt: consumption.consumedAt,
          quantity: consumption.quantity,
          machineLocation: consumption.location || '',
          machineId: consumption.machineId,
        })),
      };
    } catch (error) {
      console.error('Error fetching user drink stats:', error);
      throw new Error('Failed to fetch drink statistics');
    }
  }
} 