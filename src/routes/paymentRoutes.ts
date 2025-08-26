import { Router } from 'express';
import { PaymentController } from '../controllers/paymentController';
import { AuthMiddleware } from '../middleware/authMiddleware';

const router = Router();

// ========================================
// PUBLIC ENDPOINTS (No Authentication)
// ========================================

// PhonePe webhook endpoint (public, no auth needed)
// This endpoint receives callbacks from PhonePe payment gateway
router.post('/webhook', PaymentController.handleWebhook);

// Get payment configuration (public, for frontend setup)
router.get('/config', PaymentController.getPaymentConfig);

// ========================================
// AUTHENTICATED ENDPOINTS
// ========================================

// Payment initiation for existing orders
router.post('/initiate', AuthMiddleware.authenticate, PaymentController.initiatePayment);

// Check payment status
router.get('/status/:merchantTransactionId', AuthMiddleware.authenticate, PaymentController.checkPaymentStatus);

// Get user's transaction history
router.get('/transactions', AuthMiddleware.authenticate, PaymentController.getTransactionHistory);

// ========================================
// ADMIN ENDPOINTS
// ========================================

// Process refunds (Admin only)
router.post('/refund', AuthMiddleware.authenticate, PaymentController.processRefund);

export default router;
