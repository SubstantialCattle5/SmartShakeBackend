import { Request } from 'express';
import { ConsumptionService, ConsumptionRequest } from '../services/consumptionService';
import { MachineService, MachineSessionService } from '../services/machineService';
import { ValidationService } from '../validation/machineValidation';
import { TypedRequest, TypedResponse, GenerateMachineQRRequest, GenerateMachineQRResponse, QRScanRequest } from '../types';
import { SESSION_CONFIG, VALIDATION_LIMITS } from '../config/constants';
import { prisma } from '../config/database';

export class ConsumptionController {

  // Step 1: Generate QR code for machine with embedded session and drink data
  static async generateMachineQR(
    req: TypedRequest<GenerateMachineQRRequest>, 
    res: TypedResponse<GenerateMachineQRResponse>
  ) {
    try {
      const requestData = req.body;

      // Validate input
      const validation = ValidationService.validateMachineQRRequest(requestData);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          error: validation.errors.join(', '),
        });
      }

      const { machineId, drinkType, drinkSlot, price } = requestData;

      // Validate machine
      const machineValidation = await MachineService.validateMachineById(machineId);
      if (!machineValidation.valid) {
        const statusCode = machineValidation.error === 'Machine not found' ? 404 : 400;
        return res.status(statusCode).json({
          success: false,
          error: machineValidation.error!,
        });
      }

      // Generate session and QR code
      const sessionId = MachineSessionService.generateSessionId();
      const qrCodeData = MachineSessionService.createQRCodeData({
        machineQrCode: machineValidation.machine!.qrCode,
        sessionId,
        drinkType,
        drinkSlot,
        price,
      });

      const responseData: GenerateMachineQRResponse = {
        qrCode: qrCodeData,
        sessionId,
        machineId,
        drinkDetails: {
          type: drinkType,
          slot: drinkSlot,
          price,
        },
        expiresAt: new Date(Date.now() + SESSION_CONFIG.EXPIRATION_MS),
      };

      res.status(200).json({
        success: true,
        data: responseData,
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
  static async scanQRAndPay(
    req: TypedRequest<QRScanRequest>, 
    res: TypedResponse
  ) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      // Validate input
      const validation = ValidationService.validateQRScanRequest(req.body);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          error: validation.errors.join(', '),
        });
      }

      const { qrCode, voucherId } = req.body;

      // Parse QR code data
      const qrData = ConsumptionService.parseDrinkFromQRCode(qrCode);
      
      // Extract session ID from QR
      const sessionId = MachineSessionService.extractSessionId(qrCode);

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

      const limit = parseInt(req.query.limit as string) || VALIDATION_LIMITS.DEFAULT_HISTORY_LIMIT;

      // Validate pagination
      const validation = ValidationService.validatePaginationParams({ limit }, VALIDATION_LIMITS.MAX_HISTORY_LIMIT);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          error: validation.errors.join(', '),
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