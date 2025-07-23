import { Router } from 'express';
import { userRoutes } from './userRoutes';
import { healthRoutes } from './healthRoutes';

const router = Router();

// Health routes
router.use('/health', healthRoutes);

// API routes
router.use('/api/users', userRoutes);

export { router as routes }; 