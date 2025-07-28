import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { AuthMiddleware } from '../middleware/authMiddleware';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// GET /api/users - Get all users (requires admin/tech access)
router.get('/', AuthMiddleware.authenticate, AuthMiddleware.requireAdminOrTech, asyncHandler(UserController.getAllUsers));

// GET /api/users/profile - Get current user's profile (requires authentication)
router.get('/profile', AuthMiddleware.authenticate, asyncHandler(UserController.getUserProfile));

// PUT /api/users/profile - Update current user's profile (requires authentication)
router.put('/profile', AuthMiddleware.authenticate, asyncHandler(UserController.updateProfile));

// GET /api/users/drink-stats - Get current user's drink statistics (requires authentication and verification)
router.get('/drink-stats', AuthMiddleware.authenticate, AuthMiddleware.requireVerified, asyncHandler(UserController.getDrinkStats));

// POST /api/users - Create user (requires admin access)
//TODO REMOVE THIS ENDPOINT
router.post('/', AuthMiddleware.authenticate, AuthMiddleware.requireAdmin, asyncHandler(UserController.createUser));

// GET /api/users/:id - Get user by ID (requires admin/tech access)
router.get('/:id', AuthMiddleware.authenticate, AuthMiddleware.requireAdminOrTech, asyncHandler(UserController.getUserById));

// PUT /api/users/:id - Update user (requires admin/tech access)
router.put('/:id', AuthMiddleware.authenticate, AuthMiddleware.requireAdminOrTech, asyncHandler(UserController.updateUser));

// DELETE /api/users/:id - Soft delete user (requires admin/tech access)
router.delete('/:id', AuthMiddleware.authenticate, AuthMiddleware.requireAdminOrTech, asyncHandler(UserController.deleteUser));

export { router as userRoutes }; 