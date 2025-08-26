import { prisma } from '../config/database';
import { Prisma, TransactionStatus, TransactionType } from '@prisma/client';

export interface CreateTransactionData {
  userId: string;
  orderId?: string | null;
  paymentMethodId?: string | null;
  amount: number;
  currency: string;
  status: TransactionStatus;
  type: TransactionType;
  phonepeTransactionId?: string | null;
  phonepeOrderId?: string | null;
  phonepeMerchantId?: string | null;
  phonepeResponse?: any;
  phonepeCallbackData?: any;
}

export interface UpdateTransactionData {
  status?: TransactionStatus;
  phonepeTransactionId?: string;
  phonepeResponse?: any;
  processedAt?: Date | null;
  failureReason?: string | null;
}

export interface TransactionWithRelations {
  id: string;
  userId: string;
  orderId: string | null;
  paymentMethodId?: string | null;
  amount: Prisma.Decimal;
  currency: string;
  status: TransactionStatus;
  type: TransactionType;
  phonepeTransactionId: string | null;
  phonepeOrderId?: string | null;
  phonepeMerchantId: string | null;
  phonepeResponse: any;
  phonepeCallbackData?: any;
  processedAt: Date | null;
  failureReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  user?: any;
  order?: any;
  paymentMethod?: any;
}

export class PaymentRepository {
  /**
   * Create a new transaction record
   */
  static async createTransaction(data: CreateTransactionData): Promise<string> {
    try {
      const transaction = await prisma.transaction.create({
        data: {
          userId: data.userId,
          orderId: data.orderId,
          paymentMethodId: data.paymentMethodId,
          amount: new Prisma.Decimal(data.amount),
          currency: data.currency,
          status: data.status,
          type: data.type,
          phonepeTransactionId: data.phonepeTransactionId,
          phonepeOrderId: data.phonepeOrderId,
          phonepeMerchantId: data.phonepeMerchantId,
          phonepeResponse: data.phonepeResponse,
          phonepeCallbackData: data.phonepeCallbackData,
        },
      });
      
      return transaction.id;
    } catch (error) {
      console.error('Error creating transaction record:', error);
      throw new Error('Failed to create transaction record');
    }
  }

  /**
   * Update transaction record by merchant transaction ID
   */
  static async updateTransactionByMerchantId(
    merchantTransactionId: string,
    updateData: UpdateTransactionData
  ): Promise<void> {
    try {
      await prisma.transaction.updateMany({
        where: { phonepeMerchantId: merchantTransactionId },
        data: updateData,
      });
    } catch (error) {
      console.error('Error updating transaction record:', error);
      throw new Error('Failed to update transaction record');
    }
  }

  /**
   * Update transaction record by transaction ID
   */
  static async updateTransactionById(
    transactionId: string,
    updateData: UpdateTransactionData
  ): Promise<void> {
    try {
      await prisma.transaction.update({
        where: { id: transactionId },
        data: updateData,
      });
    } catch (error) {
      console.error('Error updating transaction record:', error);
      throw new Error('Failed to update transaction record');
    }
  }

  /**
   * Get transaction by merchant transaction ID
   */
  static async getTransactionByMerchantId(
    merchantTransactionId: string,
    includeRelations: boolean = true
  ): Promise<TransactionWithRelations | null> {
    try {
      return await prisma.transaction.findFirst({
        where: { phonepeMerchantId: merchantTransactionId },
        include: includeRelations ? {
          user: true,
          order: true,
          paymentMethod: true,
        } : undefined,
      });
    } catch (error) {
      console.error('Error fetching transaction by merchant ID:', error);
      return null;
    }
  }

  /**
   * Get transaction by PhonePe transaction ID
   */
  static async getTransactionByPhonePeId(
    phonepeTransactionId: string,
    includeRelations: boolean = true
  ): Promise<TransactionWithRelations | null> {
    try {
      return await prisma.transaction.findFirst({
        where: { phonepeTransactionId },
        include: includeRelations ? {
          user: true,
          order: true,
          paymentMethod: true,
        } : undefined,
      });
    } catch (error) {
      console.error('Error fetching transaction by PhonePe ID:', error);
      return null;
    }
  }

  /**
   * Get transaction by ID
   */
  static async getTransactionById(
    transactionId: string,
    includeRelations: boolean = true
  ): Promise<TransactionWithRelations | null> {
    try {
      return await prisma.transaction.findUnique({
        where: { id: transactionId },
        include: includeRelations ? {
          user: true,
          order: true,
          paymentMethod: true,
        } : undefined,
      });
    } catch (error) {
      console.error('Error fetching transaction by ID:', error);
      return null;
    }
  }

  /**
   * Get transactions by user ID
   */
  static async getTransactionsByUserId(
    userId: string,
    limit?: number,
    offset?: number,
    includeRelations: boolean = false
  ): Promise<TransactionWithRelations[]> {
    try {
      return await prisma.transaction.findMany({
        where: { userId },
        include: includeRelations ? {
          user: true,
          order: true,
          paymentMethod: true,
        } : undefined,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      });
    } catch (error) {
      console.error('Error fetching transactions by user ID:', error);
      return [];
    }
  }

  /**
   * Get transactions by order ID
   */
  static async getTransactionsByOrderId(
    orderId: string,
    includeRelations: boolean = false
  ): Promise<TransactionWithRelations[]> {
    try {
      return await prisma.transaction.findMany({
        where: { orderId },
        include: includeRelations ? {
          user: true,
          order: true,
          paymentMethod: true,
        } : undefined,
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      console.error('Error fetching transactions by order ID:', error);
      return [];
    }
  }

  /**
   * Get transactions by status
   */
  static async getTransactionsByStatus(
    status: TransactionStatus,
    limit?: number,
    offset?: number,
    includeRelations: boolean = false
  ): Promise<TransactionWithRelations[]> {
    try {
      return await prisma.transaction.findMany({
        where: { status },
        include: includeRelations ? {
          user: true,
          order: true,
          paymentMethod: true,
        } : undefined,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      });
    } catch (error) {
      console.error('Error fetching transactions by status:', error);
      return [];
    }
  }

  /**
   * Create refund transaction record
   */
  static async createRefundTransaction(
    originalTransaction: TransactionWithRelations,
    refundData: {
      amount: number;
      merchantTransactionId: string;
      phonepeTransactionId?: string;
      phonepeResponse?: any;
    }
  ): Promise<string> {
    try {
      const refundTransaction = await prisma.transaction.create({
        data: {
          userId: originalTransaction.userId,
          orderId: originalTransaction.orderId,
          amount: new Prisma.Decimal(refundData.amount),
          currency: 'INR',
          status: TransactionStatus.SUCCESS,
          type: TransactionType.REFUND,
          phonepeMerchantId: refundData.merchantTransactionId,
          phonepeTransactionId: refundData.phonepeTransactionId,
          phonepeResponse: refundData.phonepeResponse,
          processedAt: new Date(),
        },
      });
      
      return refundTransaction.id;
    } catch (error) {
      console.error('Error creating refund transaction record:', error);
      throw new Error('Failed to create refund transaction record');
    }
  }

  /**
   * Get transaction statistics for a user
   */
  static async getUserTransactionStats(userId: string): Promise<{
    totalTransactions: number;
    successfulTransactions: number;
    failedTransactions: number;
    pendingTransactions: number;
    totalAmount: number;
    successfulAmount: number;
  }> {
    try {
      const stats = await prisma.transaction.groupBy({
        by: ['status'],
        where: { userId, type: TransactionType.PAYMENT },
        _count: { id: true },
        _sum: { amount: true },
      });

      let totalTransactions = 0;
      let successfulTransactions = 0;
      let failedTransactions = 0;
      let pendingTransactions = 0;
      let totalAmount = 0;
      let successfulAmount = 0;

      stats.forEach(stat => {
        const count = stat._count.id;
        const amount = parseFloat(stat._sum.amount?.toString() || '0');
        
        totalTransactions += count;
        totalAmount += amount;

        switch (stat.status) {
          case TransactionStatus.SUCCESS:
            successfulTransactions += count;
            successfulAmount += amount;
            break;
          case TransactionStatus.FAILED:
            failedTransactions += count;
            break;
          case TransactionStatus.PENDING:
            pendingTransactions += count;
            break;
        }
      });

      return {
        totalTransactions,
        successfulTransactions,
        failedTransactions,
        pendingTransactions,
        totalAmount,
        successfulAmount,
      };
    } catch (error) {
      console.error('Error fetching user transaction stats:', error);
      throw new Error('Failed to fetch transaction statistics');
    }
  }
}
