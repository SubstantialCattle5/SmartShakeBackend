import { Router } from 'express';
import { userRoutes } from './userRoutes';
import { healthRoutes } from './healthRoutes';
import { authRoutes } from './authRoutes';

const router = Router();

// Health routes
router.use('/health', healthRoutes);

// API routes
router.use('/api/auth', authRoutes);
router.use('/api/users', userRoutes);

export { router as routes }; 