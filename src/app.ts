import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

import { routes } from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { PaymentService } from './services/paymentService';

// Load environment variables
dotenv.config();

// Initialize PaymentService
try {
  PaymentService.initialize();
  console.log('✅ PaymentService initialized successfully');
} catch (error) {
  console.error('❌ PaymentService initialization failed:', error);
  // Don't exit process, just log the error
  // The app can still function without payment service
}

// Create Express application
const app = express();

// Security middleware
app.use(helmet()); // Set security headers

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging in development
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

// Routes
app.use('/', routes);

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

export { app }; 
