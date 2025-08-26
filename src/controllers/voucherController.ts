import { Request, Response } from 'express';
import { VoucherService, VoucherPurchaseRequest } from '../services/voucherService';
import { ApiResponse, TypedRequest, TypedResponse } from '../types';
import { isUUID } from '../utils/validationHelper';

export class VoucherController {
  
  // Create a voucher purchase order
  static async createOrder(req: TypedRequest<VoucherPurchaseRequest>, res: TypedResponse) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      const { totalDrinks, totalPrice, expiryDays } = req.body;

      // Validate input
      if (!totalDrinks || !totalPrice) {
        return res.status(400).json({
          success: false,
          error: 'Total drinks and price per drink are required',
        });
      }

      if (totalDrinks < 1 || totalDrinks > 100) {
        return res.status(400).json({
          success: false,
          error: 'Total drinks must be between 1 and 100',
        });
      }

      if (totalPrice <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Total price must be greater than 0',
        });
      }

      const order = await VoucherService.createVoucherOrder(userId, {
        totalDrinks,
        totalPrice,
        expiryDays,
      });

      res.status(201).json({
        success: true,
        data: order,
        message: 'Voucher order created successfully',
      });
    } catch (error) {
      console.error('Error creating voucher order:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create voucher order',
      });
    }
  }

  // Complete payment and create voucher
  static async completePayment(req: TypedRequest<{
    orderId: string;
    phonepeTransactionId: string;
    phonepeResponse?: any;
  }>, res: TypedResponse) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      const { orderId, phonepeTransactionId, phonepeResponse } = req.body;

      if (!orderId || !phonepeTransactionId) {
        return res.status(400).json({
          success: false,
          error: 'Order ID and PhonePe transaction ID are required',
        });
      }

      // Verify the order belongs to the user
      const order = await VoucherService.getOrderById(orderId, userId);
      if (!order) {
        return res.status(404).json({
          success: false,
          error: 'Order not found',
        });
      }

      const voucher = await VoucherService.completeVoucherPurchase(
        orderId,
        phonepeTransactionId,
        phonepeResponse
      );

      res.status(200).json({
        success: true,
        data: voucher,
        message: 'Voucher created successfully',
      });
    } catch (error) {
      console.error('Error completing voucher payment:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to complete payment',
      });
    }
  }

  // Cancel voucher order
  static async cancelOrder(req: TypedRequest<{
    orderId: string;
    reason?: string;
  }>, res: TypedResponse) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      const { orderId, reason } = req.body;

      if (!orderId) {
        return res.status(400).json({
          success: false,
          error: 'Order ID is required',
        });
      }

      if (!isUUID(orderId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid order ID format',
        });
      }

      // Verify the order belongs to the user
      const order = await VoucherService.getOrderById(orderId, userId);
      if (!order) {
        return res.status(404).json({
          success: false,
          error: 'Order not found',
        });
      }

      const success = await VoucherService.cancelVoucherOrder(orderId, reason);

      if (success) {
        res.status(200).json({
          success: true,
          message: 'Order cancelled successfully',
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'Failed to cancel order',
        });
      }
    } catch (error) {
      console.error('Error cancelling voucher order:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to cancel order',
      });
    }
  }

  // Get user's vouchers
  static async getUserVouchers(req: Request, res: TypedResponse) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      const vouchers = await VoucherService.getUserVouchers(userId);

      res.status(200).json({
        success: true,
        data: vouchers,
        message: 'Vouchers fetched successfully',
      });
    } catch (error) {
      console.error('Error fetching user vouchers:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch vouchers',
      });
    }
  }

  // Get specific voucher by ID
  static async getVoucherById(req: Request, res: TypedResponse) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      const voucherId = req.params.id;

      if (!isUUID(voucherId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid voucher ID',
        });
      }

      const voucher = await VoucherService.getVoucherById(voucherId, userId);

      if (!voucher) {
        return res.status(404).json({
          success: false,
          error: 'Voucher not found',
        });
      }

      res.status(200).json({
        success: true,
        data: voucher,
        message: 'Voucher fetched successfully',
      });
    } catch (error) {
      console.error('Error fetching voucher:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch voucher',
      });
    }
  }

  // Get order by ID
  static async getOrderById(req: Request, res: TypedResponse) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      const orderId = req.params.id;

      if (!isUUID(orderId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid order ID',
        });
      }

      const order = await VoucherService.getOrderById(orderId, userId);

      if (!order) {
        return res.status(404).json({
          success: false,
          error: 'Order not found',
        });
      }

      res.status(200).json({
        success: true,
        data: order,
        message: 'Order fetched successfully',
      });
    } catch (error) {
      console.error('Error fetching order:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch order',
      });
    }
  }

  // Get voucher packages/pricing options (static data for now)
  static async getVoucherPackages(req: Request, res: TypedResponse) {
    try {
      const packages = [
        {
          id: 'small',
          name: 'Small Pack',
          totalDrinks: 10,
          pricePerDrink: 25,
          totalPrice: 250,
          originalPrice: 300,
          savings: 50,
          recommended: false,
        },
        {
          id: 'medium',
          name: 'Medium Pack',
          totalDrinks: 20,
          pricePerDrink: 23,
          totalPrice: 460,
          originalPrice: 600,
          savings: 140,
          recommended: true,
        },
        {
          id: 'large',
          name: 'Large Pack',
          totalDrinks: 50,
          pricePerDrink: 20,
          totalPrice: 1000,
          originalPrice: 1500,
          savings: 500,
          recommended: false,
        },
        {
          id: 'jumbo',
          name: 'Jumbo Pack',
          totalDrinks: 100,
          pricePerDrink: 18,
          totalPrice: 1800,
          originalPrice: 3000,
          savings: 1200,
          recommended: false,
        },
      ];

      res.status(200).json({
        success: true,
        data: packages,
        message: 'Voucher packages fetched successfully',
      });
    } catch (error) {
      console.error('Error fetching voucher packages:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch voucher packages',
      });
    }
  }

  // PhonePe webhook handler (for payment notifications)
  static async handlePaymentWebhook(req: Request, res: Response) {
    try {
      // This will be implemented based on PhonePe webhook specification
      const webhookData = req.body;
      
      console.log('PhonePe webhook received:', webhookData);

      // Verify webhook signature here (implement based on PhonePe docs)
      // Process payment status update
      // Update order and create voucher if payment successful

      res.status(200).json({
        success: true,
        message: 'Webhook processed',
      });
    } catch (error) {
      console.error('Error processing payment webhook:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process webhook',
      });
    }
  }
} 