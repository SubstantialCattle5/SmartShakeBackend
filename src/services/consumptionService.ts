import { prisma } from '../config/database';
import { VoucherStatus, ConsumptionStatus, Prisma } from '@prisma/client';

export interface ConsumptionRequest {
  voucherId: string;
  machineId: string;
  quantity: number;
  drinkType?: string;
  drinkFlavour?: string;
  sessionId?: string;
}

export interface ConsumptionValidationResult {
  valid: boolean;
  voucher?: {
    id: string;
    voucherNumber: string;
    remainingDrinks: number;
    status: VoucherStatus;
    isActivated: boolean;
    expiryDate: Date | null;
  };
  machine?: {
    id: string;
    name: string;
    location: string;
    isActive: boolean;
    isOnline: boolean;
  };
  error?: string;
}

export interface ConsumptionResult {
  success: boolean;
  consumption?: {
    id: string;
    voucherId: string;
    quantity: number;
    consumedAt: Date;
    machineId: string;
    location: string;
    drinkType: string | null;
    drinkFlavour: string | null;
    sessionId: string | null;
    preConsumptionBalance: number;
    postConsumptionBalance: number;
  };
  voucher?: {
    id: string;
    voucherNumber: string;
    remainingDrinks: number;
    totalDrinks: number;
    consumedDrinks: number;
  };
  error?: string;
}

export interface MachineValidationResult {
  valid: boolean;
  machine?: {
    id: string;
    name: string;
    location: string;
    address: string | null;
    city: string;
    isActive: boolean;
    isOnline: boolean;
    qrCode: string;
  };
  error?: string;
}

export class ConsumptionService {

  // Validate machine QR code and get machine details
  static async validateMachineQR(qrCode: string): Promise<MachineValidationResult> {
    try {
      const machine = await prisma.vendingMachine.findUnique({
        where: { qrCode },
      });

      if (!machine) {
        return {
          valid: false,
          error: 'Invalid QR code - machine not found',
        };
      }

      if (!machine.isActive) {
        return {
          valid: false,
          error: 'Machine is currently inactive',
        };
      }

      if (!machine.isOnline) {
        return {
          valid: false,
          error: 'Machine is currently offline',
        };
      }

      return {
        valid: true,
        machine: {
          id: machine.machineId,
          name: machine.name,
          location: machine.location,
          address: machine.address,
          city: machine.city,
          isActive: machine.isActive,
          isOnline: machine.isOnline,
          qrCode: machine.qrCode,
        },
      };
    } catch (error) {
      console.error('Error validating machine QR code:', error);
      return {
        valid: false,
        error: 'Failed to validate machine',
      };
    }
  }

  // Validate voucher for consumption
  static async validateVoucherForConsumption(
    voucherId: string,
    userId: string,
    quantity: number = 1
  ): Promise<ConsumptionValidationResult> {
    try {
      // Get voucher with user verification
      const voucher = await prisma.drinkVoucher.findFirst({
        where: {
          id: voucherId,
          userId: userId,
        },
      });

      if (!voucher) {
        return {
          valid: false,
          error: 'Voucher not found or does not belong to user',
        };
      }

      // Check voucher status
      if (voucher.status !== 'ACTIVE') {
        return {
          valid: false,
          error: `Voucher is ${voucher.status.toLowerCase()}`,
        };
      }

      // Check expiry
      if (voucher.expiryDate && voucher.expiryDate < new Date()) {
        return {
          valid: false,
          error: 'Voucher has expired',
        };
      }

      // Check remaining balance
      const remainingDrinks = voucher.totalDrinks - voucher.consumedDrinks;
      if (remainingDrinks < quantity) {
        return {
          valid: false,
          error: `Insufficient balance. You have ${remainingDrinks} drinks remaining`,
        };
      }

      // Validate quantity limits
      if (quantity < 1 || quantity > 10) {
        return {
          valid: false,
          error: 'Quantity must be between 1 and 10 drinks per transaction',
        };
      }

      return {
        valid: true,
        voucher: {
          id: voucher.id,
          voucherNumber: voucher.voucherNumber,
          remainingDrinks,
          status: voucher.status,
          isActivated: voucher.isActivated,
          expiryDate: voucher.expiryDate,
        },
      };
    } catch (error) {
      console.error('Error validating voucher for consumption:', error);
      return {
        valid: false,
        error: 'Failed to validate voucher',
      };
    }
  }

  // Process consumption (decreases drink count by 1)
  static async processConsumption(
    userId: string,
    consumptionData: ConsumptionRequest
  ): Promise<ConsumptionResult> {
    try {
      const { voucherId, machineId, quantity, drinkType, drinkFlavour, sessionId } = consumptionData;

      // Use database transaction for atomicity
      const result = await prisma.$transaction(async (tx) => {
        // Get voucher with lock (using findUnique with current version)
        const voucher = await tx.drinkVoucher.findFirst({
          where: {
            id: voucherId,
            userId: userId,
          },
        });

        if (!voucher) {
          throw new Error('Voucher not found or does not belong to user');
        }

        // Validate voucher status
        if (voucher.status !== 'ACTIVE') {
          throw new Error(`Voucher is ${voucher.status.toLowerCase()}`);
        }

        // Check expiry
        if (voucher.expiryDate && voucher.expiryDate < new Date()) {
          throw new Error('Voucher has expired');
        }

        // Calculate remaining drinks
        const remainingDrinks = voucher.totalDrinks - voucher.consumedDrinks;
        if (remainingDrinks < quantity) {
          throw new Error(`Insufficient balance. You have ${remainingDrinks} drinks remaining`);
        }

        // Validate quantity
        if (quantity < 1 || quantity > 10) {
          throw new Error('Quantity must be between 1 and 10 drinks per transaction');
        }

        // Get machine details
        const machine = await tx.vendingMachine.findUnique({
          where: { machineId },
        });

        if (!machine) {
          throw new Error('Vending machine not found');
        }

        if (!machine.isActive) {
          throw new Error('Vending machine is inactive');
        }

        // Calculate new balances
        const newConsumedDrinks = voucher.consumedDrinks + quantity;
        const newRemainingDrinks = voucher.totalDrinks - newConsumedDrinks;
        const newStatus = newRemainingDrinks <= 0 ? 'EXHAUSTED' : voucher.status;

        // Update voucher with optimistic locking
        const updatedVoucher = await tx.drinkVoucher.updateMany({
          where: {
            id: voucherId,
            version: voucher.version, // Optimistic locking
          },
          data: {
            consumedDrinks: newConsumedDrinks,
            status: newStatus as VoucherStatus,
            isActivated: true, // Mark as activated on first use
            firstUsedAt: voucher.firstUsedAt || new Date(),
            version: voucher.version + 1,
          },
        });

        // Check if update was successful (optimistic locking check)
        if (updatedVoucher.count === 0) {
          throw new Error('Voucher was modified by another transaction. Please try again.');
        }

        // Create consumption record
        const consumption = await tx.consumption.create({
          data: {
            userId,
            voucherId,
            quantity,
            consumedAt: new Date(),
            machineId,
            machineQRCode: machine.qrCode,
            location: machine.location,
            drinkType: drinkType as any, // Will be cast to DrinkType enum
            drinkFlavour: drinkFlavour as any, // Will be cast to DrinkFlavour enum
            externalTransactionId: null, // Can be set by vending machine
            vendingSessionId: sessionId || `SESSION_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
            status: 'COMPLETED',
            preConsumptionBalance: remainingDrinks,
            postConsumptionBalance: newRemainingDrinks,
            voucherVersion: voucher.version + 1,
          },
        });

        return {
          consumption,
          voucher: {
            id: voucher.id,
            voucherNumber: voucher.voucherNumber,
            totalDrinks: voucher.totalDrinks,
            consumedDrinks: newConsumedDrinks,
            remainingDrinks: newRemainingDrinks,
          },
        };
      });

      return {
        success: true,
        consumption: {
          id: result.consumption.id,
          voucherId: result.consumption.voucherId,
          quantity: result.consumption.quantity,
          consumedAt: result.consumption.consumedAt,
          machineId: result.consumption.machineId,
          location: result.consumption.location || '',
          drinkType: result.consumption.drinkType,
          drinkFlavour: result.consumption.drinkFlavour,
          sessionId: result.consumption.vendingSessionId,
          preConsumptionBalance: result.consumption.preConsumptionBalance,
          postConsumptionBalance: result.consumption.postConsumptionBalance,
        },
        voucher: result.voucher,
      };
    } catch (error) {
      console.error('Error processing consumption:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process consumption',
      };
    }
  }

  // Get user's consumption history
  static async getConsumptionHistory(userId: string, limit: number = 50) {
    try {
      const consumptions = await prisma.consumption.findMany({
        where: { userId },
        select: {
          id: true,
          quantity: true,
          consumedAt: true,
          machineId: true,
          location: true,
          drinkType: true,
          drinkFlavour: true,
          vendingSessionId: true,
          status: true,
          preConsumptionBalance: true,
          postConsumptionBalance: true,
          voucher: {
            select: {
              voucherNumber: true,
            },
          },
        },
        orderBy: { consumedAt: 'desc' },
        take: limit,
      });

      return consumptions.map((consumption) => ({
        id: consumption.id,
        voucherNumber: consumption.voucher.voucherNumber,
        quantity: consumption.quantity,
        consumedAt: consumption.consumedAt,
        machineId: consumption.machineId,
        location: consumption.location || '',
        drinkType: consumption.drinkType || 'Unknown',
        drinkFlavour: consumption.drinkFlavour || '',
        sessionId: consumption.vendingSessionId,
        status: consumption.status,
        preConsumptionBalance: consumption.preConsumptionBalance,
        postConsumptionBalance: consumption.postConsumptionBalance,
      }));
    } catch (error) {
      console.error('Error fetching consumption history:', error);
      throw new Error('Failed to fetch consumption history');
    }
  }

  // Get consumption statistics for a user
  static async getConsumptionStats(userId: string) {
    try {
      const stats = await prisma.consumption.groupBy({
        by: ['machineId'],
        where: { userId },
        _count: {
          _all: true,
        },
        _sum: {
          quantity: true,
        },
      });

      const totalConsumptions = await prisma.consumption.count({
        where: { userId },
      });

      const totalDrinks = await prisma.consumption.aggregate({
        where: { userId },
        _sum: {
          quantity: true,
        },
      });

      return {
        totalConsumptions,
        totalDrinksConsumed: totalDrinks._sum.quantity || 0,
        consumptionsByMachine: stats.map((stat) => ({
          machineId: stat.machineId,
          consumptions: stat._count._all,
          totalDrinks: stat._sum.quantity || 0,
        })),
      };
    } catch (error) {
      console.error('Error fetching consumption stats:', error);
      throw new Error('Failed to fetch consumption statistics');
    }
  }

  // Parse drink selection from QR code (if encoded)
  static parseDrinkFromQRCode(qrCode: string): {
    machineQrCode: string;
    drinkType?: string;
    drinkFlavour?: string;
    price?: number;
  } {
    try {
      // Check if QR code contains drink selection data
      // Format: "QR_VM_GYM_ANDHERI_01|SESSION:sessionId|DRINK:WATER|FLAVOUR:VANILLA|PRICE:25"
      const parts = qrCode.split('|');
      const machineQrCode = parts[0];
      
      if (parts.length === 1) {
        // Simple machine QR without drink selection
        return { machineQrCode };
      }

      // Parse drink selection data
      const drinkData: any = { machineQrCode };
      
      for (let i = 1; i < parts.length; i++) {
        const [key, value] = parts[i].split(':');
        if (key === 'DRINK') drinkData.drinkType = value;
        if (key === 'FLAVOUR') drinkData.drinkFlavour = value;
        if (key === 'PRICE') drinkData.price = parseInt(value);
      }

      return drinkData;
    } catch (error) {
      console.error('Error parsing QR code:', error);
      return { machineQrCode: qrCode };
    }
  }
} 