import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { AuthMiddleware } from '../middleware/authMiddleware';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// GET /api/users - Get all users (requires authentication)
router.get('/', AuthMiddleware.authenticate, asyncHandler(UserController.getAllUsers));

// GET /api/users/:id - Get user by ID (requires authentication)
router.get('/:id', AuthMiddleware.authenticate, asyncHandler(UserController.getUserById));

// POST /api/users - Create user (public for admin purposes)
router.post('/', asyncHandler(UserController.createUser));

// PUT /api/users/:id - Update user (requires authentication and verified account)
router.put('/:id', AuthMiddleware.authenticate, AuthMiddleware.requireVerified, asyncHandler(UserController.updateUser));

// DELETE /api/users/:id - Delete user (requires authentication and verified account)
router.delete('/:id', AuthMiddleware.authenticate, AuthMiddleware.requireVerified, asyncHandler(UserController.deleteUser));

export { router as userRoutes }; 