import { Router } from 'express';
import { VoucherController } from '../controllers/voucherController';
import { AuthMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Get voucher packages/pricing options (public endpoint)
router.get('/packages', VoucherController.getVoucherPackages);

// PhonePe webhook endpoint (public, no auth needed)
router.post('/webhook/phonepe', VoucherController.handlePaymentWebhook);

// Voucher purchase flow (authenticated)
router.post('/orders', AuthMiddleware.authenticate, VoucherController.createOrder);
router.post('/orders/complete', AuthMiddleware.authenticate, VoucherController.completePayment);
router.post('/orders/cancel', AuthMiddleware.authenticate, VoucherController.cancelOrder);
router.get('/orders/:id', AuthMiddleware.authenticate, VoucherController.getOrderById);

// Voucher management (authenticated)
router.get('/', AuthMiddleware.authenticate, VoucherController.getUserVouchers);
router.get('/:id', AuthMiddleware.authenticate, VoucherController.getVoucherById);

export default router; 