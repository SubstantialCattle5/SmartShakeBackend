import { Request, Response } from 'express';
import { VoucherService } from '../services/voucherService';
import { ApiResponse, TypedRequest, TypedResponse } from '../types';
import { isUUID } from '../utils/validationHelper';
import { prisma } from '../config/database';
import { PaymentService } from '../services/paymentService';
import { PaymentInitiationRequest } from '../types/payment.types';

// ========================================
// PAYMENT CONTROLLER
// ========================================

export class PaymentController {

  // ========================================
  // PAYMENT INITIATION
  // ========================================

  /**
   * Initiate payment for an existing order
   * POST /api/payments/initiate
   */
  static async initiatePayment(req: TypedRequest<{
    orderId: string;
  }>, res: TypedResponse) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      const { orderId } = req.body;

      // Validate orderId
      if (!orderId || !isUUID(orderId)) {
        return res.status(400).json({
          success: false,
          error: 'Valid order ID is required',
        });
      }

      // Get order details and verify ownership
      const order = await VoucherService.getOrderById(orderId, userId);
      if (!order) {
        return res.status(404).json({
          success: false,
          error: 'Order not found or does not belong to user',
        });
      }

      // Check if order is in valid state for payment
      if (order.status !== 'PENDING') {
        return res.status(400).json({
          success: false,
          error: 'Order is not in pending status',
        });
      }

      if (order.paymentStatus === 'PAID') {
        return res.status(400).json({
          success: false,
          error: 'Order has already been paid',
        });
      }

      // Get user details for payment request
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { phone: true, name: true }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      // Prepare payment initiation request
      const paymentRequest: PaymentInitiationRequest = {
        orderId: order.id,
        amount: Number(order.totalAmount), // Convert Decimal to number
        userId: userId,
        userPhone: user.phone,
        description: `Voucher purchase - ${order.totalDrinks} drinks`,
      };

      // Initiate payment with PhonePe
      const paymentResponse = await PaymentService.initiatePayment(paymentRequest);

      if (!paymentResponse.success) {
        return res.status(400).json({
          success: false,
          error: paymentResponse.message || 'Payment initiation failed',
          code: paymentResponse.code,
        });
      }

      // Return payment initiation response
      res.status(200).json({
        success: true,
        data: {
          paymentUrl: paymentResponse.data?.redirectUrl,
          merchantTransactionId: paymentResponse.data?.merchantTransactionId,
          qrData: paymentResponse.data?.qrData,
          order: {
            id: order.id,
            orderNumber: order.orderNumber,
            totalAmount: order.totalAmount,
            totalDrinks: order.totalDrinks,
          },
        },
        message: 'Payment initiated successfully',
      });

    } catch (error) {
      console.error('Error initiating payment:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to initiate payment',
      });
    }
  }

  // ========================================
  // PAYMENT STATUS CHECK
  // ========================================

  /**
   * Check payment status
   * GET /api/payments/status/:merchantTransactionId
   */
  static async checkPaymentStatus(req: TypedRequest, res: TypedResponse) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      const { merchantTransactionId } = req.params;

      if (!merchantTransactionId) {
        return res.status(400).json({
          success: false,
          error: 'Merchant transaction ID is required',
        });
      }

      // Verify transaction belongs to user
      const transaction = await PaymentService.getTransactionByMerchantId(merchantTransactionId);
      if (!transaction || transaction.userId !== userId) {
        return res.status(404).json({
          success: false,
          error: 'Transaction not found or does not belong to user',
        });
      }

      // Check payment status with PhonePe
      const statusResponse = await PaymentService.checkPaymentStatus(merchantTransactionId);

      if (!statusResponse.success) {
        return res.status(400).json({
          success: false,
          error: statusResponse.message || 'Failed to check payment status',
          code: statusResponse.code,
        });
      }

      // Refresh transaction data after status check (it should be updated)
      const updatedTransaction = await PaymentService.getTransactionByMerchantId(merchantTransactionId);

      // If payment is successful and voucher hasn't been created yet
      if (statusResponse.data?.state === 'COMPLETED' && 
          updatedTransaction?.status === 'SUCCESS' && 
          updatedTransaction.order?.status === 'PENDING') {
        
        try {
          // Complete voucher creation
          const voucher = await VoucherService.completeVoucherPurchase(
            updatedTransaction.orderId!,
            statusResponse.data.transactionId,
            statusResponse.data
          );

          return res.status(200).json({
            success: true,
            data: {
              paymentStatus: statusResponse.data.state,
              transaction: {
                id: updatedTransaction.id,
                status: updatedTransaction.status,
                amount: updatedTransaction.amount,
                phonepeTransactionId: statusResponse.data.transactionId,
              },
              voucher: {
                id: voucher.id,
                voucherNumber: voucher.voucherNumber,
                totalDrinks: voucher.totalDrinks,
                consumedDrinks: voucher.consumedDrinks,
                remainingDrinks: voucher.remainingDrinks,
                pricePerDrink: voucher.pricePerDrink,
                totalPrice: voucher.totalPrice,
                status: voucher.status,
                purchaseDate: voucher.purchaseDate,
                expiryDate: voucher.expiryDate,
              },
              order: voucher.order,
            },
            message: 'Payment completed and voucher created successfully',
          });
        } catch (voucherError) {
          console.error('Error creating voucher after successful payment:', voucherError);
          // Payment was successful but voucher creation failed
          // This needs manual intervention
          return res.status(200).json({
            success: true,
            data: {
              paymentStatus: statusResponse.data.state,
              transaction: {
                id: transaction.id,
                status: transaction.status,
                amount: transaction.amount,
                phonepeTransactionId: statusResponse.data.transactionId,
              },
              voucherCreated: false,
              error: 'Payment successful but voucher creation failed. Please contact support.',
            },
            message: 'Payment completed but voucher creation pending',
          });
        }
      }

      // Return current status (use updated transaction data)
      const finalTransaction = updatedTransaction || transaction;
      res.status(200).json({
        success: true,
        data: {
          paymentStatus: statusResponse.data?.state || 'UNKNOWN',
          transaction: {
            id: finalTransaction.id,
            status: finalTransaction.status,
            amount: finalTransaction.amount,
            phonepeTransactionId: statusResponse.data?.transactionId || finalTransaction.phonepeTransactionId,
          },
          order: finalTransaction.order ? {
            id: finalTransaction.order.id,
            orderNumber: finalTransaction.order.orderNumber,
            status: finalTransaction.order.status,
            paymentStatus: finalTransaction.order.paymentStatus,
          } : null,
        },
        message: 'Payment status retrieved successfully',
      });

    } catch (error) {
      console.error('Error checking payment status:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check payment status',
      });
    }
  }

  // ========================================
  // WEBHOOK HANDLER
  // ========================================

  /**
   * Handle PhonePe webhook callbacks
   * POST /api/payments/webhook
   */
  static async handleWebhook(req: Request, res: Response) {
    try {
      const xVerify = req.headers['x-verify'] as string;
      const response = req.body.response;

      if (!xVerify || !response) {
        return res.status(400).json({
          success: false,
          error: 'Missing required webhook headers or body',
        });
      }

      // Verify callback authenticity
      const verificationResult = await PaymentService.verifyCallback(xVerify, response);

      if (!verificationResult.isValid) {
        console.error('Invalid webhook callback:', verificationResult.error);
        return res.status(400).json({
          success: false,
          error: 'Invalid webhook signature',
        });
      }

      const transactionData = verificationResult.transactionData;
      console.log('Valid webhook received:', transactionData);

      // If payment is successful, complete voucher creation
      if (transactionData.state === 'COMPLETED') {
        try {
          // Get transaction from database
          const transaction = await PaymentService.getTransactionByMerchantId(
            transactionData.merchantTransactionId
          );

          if (transaction && transaction.orderId && transaction.order?.status === 'PENDING') {
            // Complete voucher creation
            await VoucherService.completeVoucherPurchase(
              transaction.orderId,
              transactionData.transactionId,
              transactionData
            );
            
            console.log(`Voucher created successfully for transaction ${transactionData.merchantTransactionId}`);
          }
        } catch (voucherError) {
          console.error('Error creating voucher from webhook:', voucherError);
          // Don't fail the webhook response, just log the error
          // The voucher creation can be handled separately
        }
      }

      // Always return success to PhonePe to acknowledge webhook receipt
      res.status(200).json({
        success: true,
        message: 'Webhook processed successfully',
      });

    } catch (error) {
      console.error('Webhook processing error:', error);
      
      // Return success even on error to avoid PhonePe retries
      // Log the error for manual investigation
      res.status(200).json({
        success: true,
        message: 'Webhook received',
      });
    }
  }

  // ========================================
  // REFUND PROCESSING
  // ========================================

  /**
   * Process refund for a transaction
   * POST /api/payments/refund
   */
  static async processRefund(req: TypedRequest<{
    transactionId: string;
    amount?: number;
    reason?: string;
  }>, res: TypedResponse) {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;
      
      // Only admins can process refunds
      if (!userId || userRole !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          error: 'Access denied. Admin privileges required.',
        });
      }

      const { transactionId, amount, reason } = req.body;

      if (!transactionId || !isUUID(transactionId)) {
        return res.status(400).json({
          success: false,
          error: 'Valid transaction ID is required',
        });
      }

      // Get transaction details
      const transaction = await PaymentService.getTransactionByMerchantId(transactionId);
      if (!transaction) {
        return res.status(404).json({
          success: false,
          error: 'Transaction not found',
        });
      }

      if (transaction.status !== 'SUCCESS') {
        return res.status(400).json({
          success: false,
          error: 'Only successful transactions can be refunded',
        });
      }

      if (!transaction.phonepeTransactionId) {
        return res.status(400).json({
          success: false,
          error: 'PhonePe transaction ID not found',
        });
      }

      // Use provided amount or full transaction amount
      const refundAmount = amount || Number(transaction.amount);
      
      if (refundAmount <= 0 || refundAmount > Number(transaction.amount)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid refund amount',
        });
      }

      // Generate unique merchant transaction ID for refund
      const refundMerchantTxnId = `REFUND_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      // Process refund with PhonePe
      const refundResponse = await PaymentService.processRefund({
        originalTransactionId: transaction.phonepeTransactionId,
        merchantTransactionId: refundMerchantTxnId,
        amount: Math.round(refundAmount * 100), // Convert to paise
      });

      if (!refundResponse.success) {
        return res.status(400).json({
          success: false,
          error: refundResponse.message || 'Refund processing failed',
          code: refundResponse.code,
        });
      }

      res.status(200).json({
        success: true,
        data: {
          refundTransactionId: refundResponse.data?.transactionId,
          merchantTransactionId: refundMerchantTxnId,
          refundAmount,
          status: refundResponse.data?.state,
          originalTransaction: {
            id: transaction.id,
            amount: transaction.amount,
          },
        },
        message: 'Refund processed successfully',
      });

    } catch (error) {
      console.error('Error processing refund:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process refund',
      });
    }
  }

  // ========================================
  // UTILITY ENDPOINTS
  // ========================================

  /**
   * Get payment configuration (for frontend)
   * GET /api/payments/config
   */
  static async getPaymentConfig(req: TypedRequest, res: TypedResponse) {
    try {
      const config = PaymentService.getConfig();
      
      res.status(200).json({
        success: true,
        data: {
          merchantId: config.merchantId,
          environment: config.baseUrl?.includes('preprod') ? 'sandbox' : 'production',
          redirectUrl: config.redirectUrl,
        },
        message: 'Payment configuration retrieved successfully',
      });

    } catch (error) {
      console.error('Error getting payment config:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get payment configuration',
      });
    }
  }

  /**
   * Get transaction history for user
   * GET /api/payments/transactions
   */
  static async getTransactionHistory(req: TypedRequest, res: TypedResponse) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;

      const transactions = await prisma.transaction.findMany({
        where: { userId },
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              totalDrinks: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      });

      const totalCount = await prisma.transaction.count({
        where: { userId },
      });

      res.status(200).json({
        success: true,
        data: {
          transactions: transactions.map(tx => ({
            id: tx.id,
            amount: tx.amount,
            currency: tx.currency,
            status: tx.status,
            type: tx.type,
            phonepeTransactionId: tx.phonepeTransactionId,
            createdAt: tx.createdAt,
            processedAt: tx.processedAt,
            order: tx.order,
          })),
          pagination: {
            page,
            limit,
            total: totalCount,
            totalPages: Math.ceil(totalCount / limit),
          },
        },
        message: 'Transaction history retrieved successfully',
      });

    } catch (error) {
      console.error('Error getting transaction history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get transaction history',
      });
    }
  }
}
