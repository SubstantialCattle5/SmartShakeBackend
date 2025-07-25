import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { AuthMiddleware } from '../middleware/authMiddleware';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// POST /api/auth/register - Start registration with phone
router.post('/register', asyncHandler(AuthController.registerWithPhone));

// POST /api/auth/login - Start login with phone
router.post('/login', asyncHandler(AuthController.loginWithPhone));

// POST /api/auth/verify-otp - Verify OTP and complete login/registration
router.post('/verify-otp', asyncHandler(AuthController.verifyOtp));

// POST /api/auth/refresh-token - Refresh JWT token
router.post('/refresh-token', asyncHandler(AuthController.refreshToken));

// GET /api/auth/profile - Get current user profile (requires authentication)
router.get('/profile', AuthMiddleware.authenticate, asyncHandler(AuthController.getProfile));

// POST /api/auth/logout - Logout (requires authentication)
router.post('/logout', AuthMiddleware.authenticate, asyncHandler(AuthController.logout));

// POST /api/auth/logout-all - Logout from all devices (requires authentication)
router.post('/logout-all', AuthMiddleware.authenticate, asyncHandler(AuthController.logoutAll));

export { router as authRoutes }; 