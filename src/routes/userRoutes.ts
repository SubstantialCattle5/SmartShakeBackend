import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// GET /api/users - Get all users
router.get('/', asyncHandler(UserController.getAllUsers));

// GET /api/users/:id - Get user by ID
router.get('/:id', asyncHandler(UserController.getUserById));

// POST /api/users - Create new user
router.post('/', asyncHandler(UserController.createUser));

// PUT /api/users/:id - Update user
router.put('/:id', asyncHandler(UserController.updateUser));

// DELETE /api/users/:id - Delete user
router.delete('/:id', asyncHandler(UserController.deleteUser));

export { router as userRoutes }; 