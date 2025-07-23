import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { HealthCheckResponse, ApiResponse } from '../types';

export class HealthController {
  // GET /health
  static async getHealth(req: Request, res: Response): Promise<void> {
    try {
      const response: ApiResponse<HealthCheckResponse> = {
        success: true,
        data: {
          status: 'OK',
          timestamp: new Date().toISOString(),
          service: 'SmartShake Backend',
        },
        message: 'Service is healthy',
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in health check:', error);
      
      const response: ApiResponse = {
        success: false,
        error: 'Health check failed',
      };
      
      res.status(500).json(response);
    }
  }

  // GET /health/database
  static async getDatabaseHealth(req: Request, res: Response): Promise<void> {
    try {
      // Test database connection
      await prisma.$queryRaw`SELECT 1`;
      
      const response: ApiResponse<HealthCheckResponse> = {
        success: true,
        data: {
          status: 'OK',
          timestamp: new Date().toISOString(),
          service: 'SmartShake Backend',
          database: 'Connected',
        },
        message: 'Database connection is healthy',
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Database health check failed:', error);
      
      const response: ApiResponse<HealthCheckResponse> = {
        success: false,
        data: {
          status: 'ERROR',
          timestamp: new Date().toISOString(),
          service: 'SmartShake Backend',
          database: 'Disconnected',
        },
        error: 'Database connection failed',
      };
      
      res.status(503).json(response);
    }
  }
} 