import { Router } from 'express';
import { ConsumptionController } from '../controllers/consumptionController';
import { AuthMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Health check for consumption service
router.get('/health', ConsumptionController.healthCheck);

// Step 1: Machine generates QR code with session and drink data
router.post('/machine/generate-qr', ConsumptionController.generateMachineQR);

// Step 5: Machine checks if payment has been completed
router.get('/machine/check-payment/:sessionId', ConsumptionController.checkPaymentStatus);

// Steps 2-4: User scans QR and pays with voucher (combined into one endpoint)
router.post('/qr/scan-and-pay', AuthMiddleware.authenticate, ConsumptionController.scanQRAndPay);

// User history endpoint (optional)
router.get('/history', AuthMiddleware.authenticate, ConsumptionController.getConsumptionHistory);

export default router; 