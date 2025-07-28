import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { AuthMiddleware } from '../middleware/authMiddleware';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// GET /api/users - Get all users (requires authentication)
router.get('/', AuthMiddleware.authenticate, asyncHandler(UserController.getAllUsers));

// GET /api/users/profile - Get current user's profile (requires authentication)
router.get('/profile', AuthMiddleware.authenticate, asyncHandler(UserController.getUserProfile));

// PUT /api/users/profile - Update current user's profile (requires authentication)
router.put('/profile', AuthMiddleware.authenticate, asyncHandler(UserController.updateProfile));

// GET /api/users/drink-stats - Get current user's drink statistics (requires authentication and verification)
router.get('/drink-stats', AuthMiddleware.authenticate, AuthMiddleware.requireVerified, asyncHandler(UserController.getDrinkStats));

// POST /api/users - Create user (public for admin purposes)
router.post('/', asyncHandler(UserController.createUser));

// GET /api/users/:id - Get user by ID (requires authentication)
router.get('/:id', AuthMiddleware.authenticate, asyncHandler(UserController.getUserById));

// PUT /api/users/:id - Update user (requires authentication and verified account)
router.put('/:id', AuthMiddleware.authenticate, AuthMiddleware.requireVerified, asyncHandler(UserController.updateUser));

// DELETE /api/users/:id - Delete user (requires authentication and verified account)
router.delete('/:id', AuthMiddleware.authenticate, AuthMiddleware.requireVerified, asyncHandler(UserController.deleteUser));

export { router as userRoutes }; 