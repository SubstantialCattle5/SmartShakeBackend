import { Request, Response } from 'express';
import { ConsumptionService, ConsumptionRequest } from '../services/consumptionService';
import { TypedRequest, TypedResponse } from '../types';
import { prisma } from '../config/database';

export class ConsumptionController {

  // Health check for consumption service
  static async healthCheck(req: Request, res: Response) {
    try {
      // Test database connectivity by counting consumptions
      const count = await ConsumptionService.getConsumptionStats(1); // Test with user ID 1
      
      res.status(200).json({
        success: true,
        data: {
          service: 'consumption-service',
          status: 'healthy',
          timestamp: new Date().toISOString(),
        },
        message: 'Consumption service is healthy',
      });
    } catch (error) {
      console.error('Consumption service health check failed:', error);
      res.status(503).json({
        success: false,
        error: 'Consumption service is unhealthy',
      });
    }
  }

  // Step 1: Generate QR code for machine with embedded session and drink data
  static async generateMachineQR(req: TypedRequest<{
    machineId: string;
    drinkType: string;
    drinkSlot: string;
    price: number;
  }>, res: TypedResponse) {
    try {
      const { machineId, drinkType, drinkSlot, price } = req.body;
      if (!machineId) {
        return res.status(400).json({
          success: false,
          error: 'Machine ID is required',
        });
      }
      if (!drinkType) {
        return res.status(400).json({
          success: false,
          error: 'Drink type is required',
        });
      }
      if (!drinkSlot) {
        return res.status(400).json({
          success: false,
          error: 'Drink slot is required',
        });
      }
      if (!price) {
        return res.status(400).json({
          success: false,
          error: 'Price is required',
        });
      }
        
      if (!machineId || !drinkType || !drinkSlot || !price) {
        return res.status(400).json({
          success: false,
          error: 'Machine ID, drink type, drink slot, and price are required',
        });
      }

      // Validate machine exists
      const machine = await prisma.vendingMachine.findUnique({
        where: { machineId },
      });

      if (!machine) {
        return res.status(404).json({
          success: false,
          error: 'Machine not found',
        });
      }

      if (!machine.isActive || !machine.isOnline) {
        return res.status(400).json({
          success: false,
          error: 'Machine is not available',
        });
      }

      // Generate session ID (machine-generated)
      const sessionId = `MSS_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      
      // Create QR code with embedded data
      const qrCodeData = `${machine.qrCode}|SESSION:${sessionId}|DRINK:${drinkType}|SLOT:${drinkSlot}|PRICE:${price}`;

      res.status(200).json({
        success: true,
        data: {
          qrCode: qrCodeData,
          sessionId,
          machineId,
          drinkDetails: {
            type: drinkType,
            slot: drinkSlot,
            price,
          },
          expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        },
        message: 'QR code generated successfully',
      });
    } catch (error) {
      console.error('Error generating machine QR:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate QR code',
      });
    }
  }

  // Step 5: Check payment status for machine (polling endpoint)
  static async checkPaymentStatus(req: Request, res: TypedResponse) {
    try {
      const { sessionId } = req.params;

      if (!sessionId) {
        return res.status(400).json({
          success: false,
          error: 'Session ID is required',
        });
      }

      // Check if there's a completed consumption for this session
      const consumption = await prisma.consumption.findFirst({
        where: {
          vendingSessionId: sessionId,
          status: 'COMPLETED',
        },
        include: {
          voucher: {
            select: {
              voucherNumber: true,
            },
          },
        },
        orderBy: {
          consumedAt: 'desc',
        },
      });

      if (consumption) {
        return res.status(200).json({
          success: true,
          data: {
            paymentCompleted: true,
            sessionId,
            consumptionId: consumption.id,
            voucherNumber: consumption.voucher.voucherNumber,
            drinkType: consumption.drinkType,
            drinkSlot: consumption.drinkSlot,
            consumedAt: consumption.consumedAt,
            canDispense: true,
          },
          message: 'Payment completed - ready to dispense',
        });
      }

      res.status(200).json({
        success: true,
        data: {
          paymentCompleted: false,
          sessionId,
          canDispense: false,
        },
        message: 'Payment not completed yet',
      });
    } catch (error) {
      console.error('Error checking payment status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check payment status',
      });
    }
  }

  // Steps 2-4: Scan QR and process payment (combined flow)
  static async scanQRAndPay(req: TypedRequest<{
    qrCode: string;
    voucherId: number;
  }>, res: TypedResponse) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      const { qrCode, voucherId } = req.body;

      if (!qrCode || !voucherId) {
        return res.status(400).json({
          success: false,
          error: 'QR code and voucher ID are required',
        });
      }

      // Parse QR code data
      const qrData = ConsumptionService.parseDrinkFromQRCode(qrCode);
      
      // Extract session ID from QR
      let sessionId: string | undefined;
      if (qrCode.includes('SESSION:')) {
        const sessionMatch = qrCode.match(/SESSION:([^|]+)/);
        sessionId = sessionMatch?.[1];
      }

      if (!sessionId) {
        return res.status(400).json({
          success: false,
          error: 'Invalid QR code - no session ID found',
        });
      }

      // Validate machine
      const machineValidation = await ConsumptionService.validateMachineQR(qrData.machineQrCode);
      if (!machineValidation.valid) {
        return res.status(400).json({
          success: false,
          error: machineValidation.error,
        });
      }

      // Validate voucher
      const voucherValidation = await ConsumptionService.validateVoucherForConsumption(voucherId, userId, 1);
      if (!voucherValidation.valid) {
        return res.status(400).json({
          success: false,
          error: voucherValidation.error,
        });
      }

      // Process consumption (decreases drink count by 1)
      const consumptionRequest: ConsumptionRequest = {
        voucherId,
        machineId: machineValidation.machine!.id,
        quantity: 1,
        drinkType: qrData.drinkType,
        drinkSlot: qrData.drinkSlot,
        sessionId,
      };

      const result = await ConsumptionService.processConsumption(userId, consumptionRequest);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error,
        });
      }

      res.status(200).json({
        success: true,
        data: {
          consumption: result.consumption,
          voucher: result.voucher,
          sessionId,
          message: 'Payment successful! Machine will dispense your drink shortly.',
        },
        message: 'QR payment processed successfully',
      });
    } catch (error) {
      console.error('Error processing QR payment:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process QR payment',
      });
    }
  }

  // Get user's consumption history (optional)
  static async getConsumptionHistory(req: Request, res: TypedResponse) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      const limit = parseInt(req.query.limit as string) || 50;

      if (limit < 1 || limit > 100) {
        return res.status(400).json({
          success: false,
          error: 'Limit must be between 1 and 100',
        });
      }

      const history = await ConsumptionService.getConsumptionHistory(userId, limit);

      res.status(200).json({
        success: true,
        data: history,
        message: 'Consumption history fetched successfully',
      });
    } catch (error) {
      console.error('Error fetching consumption history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch consumption history',
      });
    }
  }
} 