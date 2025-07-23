import { Router } from 'express';
import { HealthController } from '../controllers/healthController';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// GET /health - Basic health check
router.get('/', asyncHandler(HealthController.getHealth));

// GET /health/database - Database health check
router.get('/database', asyncHandler(HealthController.getDatabaseHealth));

export { router as healthRoutes }; 