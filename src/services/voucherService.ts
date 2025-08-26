import { prisma } from '../config/database';
import { VoucherStatus, OrderStatus, PaymentStatus, TransactionStatus, OrderType, Prisma } from '@prisma/client';

export interface VoucherPurchaseRequest {
  totalDrinks: number;
  totalPrice: number;
  expiryDays?: number; // Optional: defaults to 90 days
}

export interface VoucherResponse {
  id: string;
  voucherNumber: string;
  totalDrinks: number;
  consumedDrinks: number;
  remainingDrinks: number;
  pricePerDrink: number;
  totalPrice: number;
  status: VoucherStatus;
  isActivated: boolean;
  purchaseDate: Date;
  expiryDate: Date | null;
  order: {
    id: string;
    orderNumber: string;
    status: OrderStatus;
    paymentStatus: PaymentStatus;
  };
}

export interface OrderResponse {
  id: string;
  orderNumber: string;
  orderType: OrderType;
  totalDrinks: number;
  totalAmount: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  createdAt: Date;
  phonepeMerchantId?: string; // For payment processing
}

export class VoucherService {
  
  // Generate unique voucher number
  private static generateVoucherNumber(): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `VCH-${timestamp.slice(-8)}-${random}`;
  }

  // Generate unique order number
  private static generateOrderNumber(): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `ORD-${timestamp.slice(-8)}-${random}`;
  }

  // Generate unique merchant transaction ID for PhonePe
  private static generateMerchantTransactionId(): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 10).toUpperCase();
    return `MERCHANT_${timestamp}_${random}`;
  }

  // Calculate expiry date
  private static calculateExpiryDate(days: number = 90): Date {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + days);
    return expiryDate;
  }

  // Create voucher purchase order
  static async createVoucherOrder(
    userId: string, 
    voucherData: VoucherPurchaseRequest
  ): Promise<OrderResponse> {
    try {
      const totalAmount = voucherData.totalPrice;
      const orderNumber = this.generateOrderNumber();
      const merchantTransactionId = this.generateMerchantTransactionId();

      const order = await prisma.order.create({
        data: {
          userId,
          orderNumber,
          orderType: OrderType.VOUCHER_PURCHASE,
          totalDrinks: voucherData.totalDrinks,
          totalAmount,
          status: OrderStatus.PENDING,
          paymentStatus: PaymentStatus.PENDING,
        },
      });

      // Create pending transaction
      await prisma.transaction.create({
        data: {
          userId,
          orderId: order.id,
          amount: totalAmount,
          status: 'PENDING',
          type: 'PAYMENT',
          currency: 'INR',
          phonepeMerchantId: merchantTransactionId,
        },
      });

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        orderType: order.orderType,
        totalDrinks: order.totalDrinks || 0,
        totalAmount: Number(order.totalAmount),
        status: order.status,
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt,
        phonepeMerchantId: merchantTransactionId,
      };
    } catch (error) {
      console.error('Error creating voucher order:', error);
      throw new Error('Failed to create voucher order');
    }
  }

  // Complete voucher purchase after successful payment
  static async completeVoucherPurchase(
    orderId: string,
    phonepeTransactionId: string,
    phonepeResponse?: any
  ): Promise<VoucherResponse> {
    try {
      // Use transaction to ensure data consistency
      const result = await prisma.$transaction(async (tx) => {
        // Get the order with user details
        const order = await tx.order.findUnique({
          where: { id: orderId },
          include: { user: true },
        });

        if (!order) {
          throw new Error('Order not found');
        }

        if (order.status !== 'PENDING') {
          throw new Error('Order is not in pending status');
        }

        // Update order status
        const updatedOrder = await tx.order.update({
          where: { id: orderId },
          data: {
            status: 'COMPLETED',
            paymentStatus: 'PAID',
          },
        });

        // Update transaction
        await tx.transaction.updateMany({
          where: { orderId },
          data: {
            status: 'SUCCESS',
            phonepeTransactionId,
            phonepeResponse,
            processedAt: new Date(),
          },
        });

        // Calculate voucher details
        const totalDrinks = order.totalDrinks || 0;
        const totalAmount = Number(order.totalAmount);
        const pricePerDrink = totalDrinks > 0 ? totalAmount / totalDrinks : 0;
        const voucherNumber = this.generateVoucherNumber();
        const expiryDate = this.calculateExpiryDate(90); // 90 days default

        // Create the voucher
        const voucher = await tx.drinkVoucher.create({
          data: {
            userId: order.userId,
            orderId: order.id,
            voucherNumber,
            totalDrinks,
            consumedDrinks: 0,
            pricePerDrink,
            totalPrice: totalAmount,
            status: 'ACTIVE',
            isActivated: false,
            purchaseDate: new Date(),
            expiryDate,
          },
        });

        return { voucher, order: updatedOrder };
      });

      return {
        id: result.voucher.id,
        voucherNumber: result.voucher.voucherNumber,
        totalDrinks: result.voucher.totalDrinks,
        consumedDrinks: result.voucher.consumedDrinks,
        remainingDrinks: result.voucher.totalDrinks - result.voucher.consumedDrinks,
        pricePerDrink: Number(result.voucher.pricePerDrink),
        totalPrice: Number(result.voucher.totalPrice),
        status: result.voucher.status,
        isActivated: result.voucher.isActivated,
        purchaseDate: result.voucher.purchaseDate,
        expiryDate: result.voucher.expiryDate,
        order: {
          id: result.order.id,
          orderNumber: result.order.orderNumber,
          status: result.order.status,
          paymentStatus: result.order.paymentStatus,
        },
      };
    } catch (error) {
      console.error('Error completing voucher purchase:', error);
      throw new Error('Failed to complete voucher purchase');
    }
  }

  // Cancel voucher order
  static async cancelVoucherOrder(orderId: string, reason?: string): Promise<boolean> {
    try {
      await prisma.$transaction(async (tx) => {
        // Update order status
        await tx.order.update({
          where: { id: orderId },
          data: {
            status: 'CANCELLED',
            paymentStatus: 'FAILED',
          },
        });

        // Update transaction
        await tx.transaction.updateMany({
          where: { orderId },
          data: {
            status: 'CANCELLED',
            failureReason: reason || 'Order cancelled',
            processedAt: new Date(),
          },
        });
      });

      return true;
    } catch (error) {
      console.error('Error cancelling voucher order:', error);
      throw new Error('Failed to cancel voucher order');
    }
  }

  // Get user's vouchers
  static async getUserVouchers(userId: string): Promise<VoucherResponse[]> {
    try {
      const vouchers = await prisma.drinkVoucher.findMany({
        where: { userId },
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              status: true,
              paymentStatus: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return vouchers.map((voucher) => ({
        id: voucher.id,
        voucherNumber: voucher.voucherNumber,
        totalDrinks: voucher.totalDrinks,
        consumedDrinks: voucher.consumedDrinks,
        remainingDrinks: voucher.totalDrinks - voucher.consumedDrinks,
        pricePerDrink: Number(voucher.pricePerDrink),
        totalPrice: Number(voucher.totalPrice),
        status: voucher.status,
        isActivated: voucher.isActivated,
        purchaseDate: voucher.purchaseDate,
        expiryDate: voucher.expiryDate,
        order: {
          id: voucher.order?.id || '',
          orderNumber: voucher.order?.orderNumber || '',
          status: voucher.order?.status || 'PENDING',
          paymentStatus: voucher.order?.paymentStatus || 'PENDING',
        },
      }));
    } catch (error) {
      console.error('Error fetching user vouchers:', error);
      throw new Error('Failed to fetch vouchers');
    }
  }

  // Get voucher by ID
  static async getVoucherById(voucherId: string, userId?: string): Promise<VoucherResponse | null> {
    try {
      // First find voucher with user filter if provided
      const voucher = await prisma.drinkVoucher.findFirst({
        where: {
          id: voucherId,
          ...(userId && { userId }),
        },
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              status: true,
              paymentStatus: true,
            },
          },
        },
      });

      if (!voucher) {
        return null;
      }

      return {
        id: voucher.id,
        voucherNumber: voucher.voucherNumber,
        totalDrinks: voucher.totalDrinks,
        consumedDrinks: voucher.consumedDrinks,
        remainingDrinks: voucher.totalDrinks - voucher.consumedDrinks,
        pricePerDrink: Number(voucher.pricePerDrink),
        totalPrice: Number(voucher.totalPrice),
        status: voucher.status,
        isActivated: voucher.isActivated,
        purchaseDate: voucher.purchaseDate,
        expiryDate: voucher.expiryDate,
        order: {
          id: voucher.order?.id || '',
          orderNumber: voucher.order?.orderNumber || '',
          status: voucher.order?.status || 'PENDING',
          paymentStatus: voucher.order?.paymentStatus || 'PENDING',
        },
      };
    } catch (error) {
      console.error('Error fetching voucher:', error);
      throw new Error('Failed to fetch voucher');
    }
  }

  // Get order by ID
  static async getOrderById(orderId: string, userId?: string): Promise<OrderResponse | null> {
    try {
      const order = await prisma.order.findFirst({
        where: {
          id: orderId,
          ...(userId && { userId }),
        },
        include: {
          transactions: {
            select: {
              phonepeMerchantId: true,
            },
            take: 1,
          },
        },
      });

      if (!order) {
        return null;
      }

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        orderType: order.orderType,
        totalDrinks: order.totalDrinks || 0,
        totalAmount: Number(order.totalAmount),
        status: order.status,
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt,
        phonepeMerchantId: order.transactions[0]?.phonepeMerchantId || undefined,
      };
    } catch (error) {
      console.error('Error fetching order:', error);
      throw new Error('Failed to fetch order');
    }
  }
} 