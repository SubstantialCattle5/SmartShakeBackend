import { Response } from 'express';
import { ApiResponse } from '../types';
import { ERROR_CODES } from '../config/constants';

export interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: any;
}

export interface SuccessResponse<T = any> {
  success: true;
  data?: T;
  message?: string;
}

export class ResponseHelper {
  /**
   * Send consistent error response
   */
  static sendError(
    res: Response, 
    statusCode: number, 
    error: string, 
    code?: string, 
    details?: any
  ): void {
    const response: ErrorResponse = {
      success: false,
      error,
      ...(code && { code }),
      ...(details && { details }),
    };
    res.status(statusCode).json(response);
  }

  /**
   * Send consistent success response
   */
  static sendSuccess<T>(
    res: Response, 
    statusCode: number = 200, 
    data?: T, 
    message?: string
  ): void {
    const response: SuccessResponse<T> = {
      success: true,
      ...(data && { data }),
      ...(message && { message }),
    };
    res.status(statusCode).json(response);
  }

  /**
   * Send validation error with multiple error details
   */
  static sendValidationError(
    res: Response, 
    errors: string[], 
    primaryError?: string
  ): void {
    this.sendError(
      res, 
      400, 
      primaryError || errors[0] || 'Validation failed',
      ERROR_CODES.VALIDATION_ERROR,
      { errors }
    );
  }

  /**
   * Send authentication error
   */
  static sendAuthError(
    res: Response, 
    error: string, 
    code: string = ERROR_CODES.UNAUTHORIZED
  ): void {
    this.sendError(res, 401, error, code);
  }

  /**
   * Send forbidden error
   */
  static sendForbiddenError(
    res: Response, 
    error: string = 'Access denied'
  ): void {
    this.sendError(res, 403, error, ERROR_CODES.FORBIDDEN);
  }

  /**
   * Send rate limiting error
   */
  static sendRateLimitError(
    res: Response, 
    error: string = 'Too many requests. Please try again later.'
  ): void {
    this.sendError(res, 429, error, ERROR_CODES.OTP_RATE_LIMITED);
  }

  /**
   * Send internal server error
   */
  static sendInternalError(
    res: Response, 
    error: string = 'Internal server error'
  ): void {
    this.sendError(res, 500, error, ERROR_CODES.INTERNAL_ERROR);
  }

  /**
   * Send user not found error
   */
  static sendUserNotFound(
    res: Response, 
    error: string = 'User not found'
  ): void {
    this.sendError(res, 404, error, ERROR_CODES.USER_NOT_FOUND);
  }

  /**
   * Send user already exists error
   */
  static sendUserExists(
    res: Response, 
    error: string = 'User already exists'
  ): void {
    this.sendError(res, 400, error, ERROR_CODES.USER_ALREADY_EXISTS);
  }

  /**
   * Generic API response (for backward compatibility)
   */
  static createApiResponse<T>(
    success: boolean, 
    data?: T, 
    message?: string, 
    error?: string
  ): ApiResponse<T> {
    return {
      success,
      ...(data && { data }),
      ...(message && { message }),
      ...(error && { error }),
    };
  }
} 