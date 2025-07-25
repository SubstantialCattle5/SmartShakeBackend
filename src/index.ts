import { app } from './app';
import { disconnectDatabase } from './config/database';
import { CleanupService } from './services/cleanupService';

const PORT = process.env.PORT || 3000;

// Graceful shutdown handler
const gracefulShutdown = async (signal: string) => {
  console.log(`${signal} received. Shutting down gracefully...`);
  
  try {
    // Stop cleanup service
    CleanupService.stopPeriodicCleanup();
    
    await disconnectDatabase();
    console.log('Database disconnected successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
};

// Register shutdown handlers
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🗄️  Database health: http://localhost:${PORT}/health/database`);
  console.log(`👥 Users API: http://localhost:${PORT}/api/users`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Start cleanup service for blacklisted tokens
  CleanupService.startPeriodicCleanup(24); // Run every 24 hours
});

export { app, server }; 