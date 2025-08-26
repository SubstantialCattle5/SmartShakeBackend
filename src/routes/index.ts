import { Router } from 'express';
import { userRoutes } from './userRoutes';
import { healthRoutes } from './healthRoutes';
import { authRoutes } from './authRoutes';
import voucherRoutes from './voucherRoutes';
import consumptionRoutes from './consumptionRoutes';
import paymentRoutes from './paymentRoutes';

const router = Router();

// Health routes
router.use('/health', healthRoutes);

// API routes
router.use('/api/auth', authRoutes);
router.use('/api/users', userRoutes);
router.use('/api/vouchers', voucherRoutes);
router.use('/api/consumption', consumptionRoutes);
router.use('/api/payments', paymentRoutes);

export { router as routes }; 