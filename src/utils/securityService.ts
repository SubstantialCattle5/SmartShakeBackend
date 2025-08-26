/**
 * SecurityService - Handles validation, security checks, and utility functions
 * Separated from PaymentService for better modularity and security management
 */
export class SecurityService {
  private readonly maxAmount: number;
  private readonly minAmount: number;

  constructor(maxAmount: number = 100000, minAmount: number = 0.01) {
    this.maxAmount = maxAmount;
    this.minAmount = minAmount;
  }

  /**
   * Validate payment amount
   * @param amount - Amount in rupees
   * @returns True if amount is valid, false otherwise
   */
  validateAmount(amount: number): boolean {
    return amount >= this.minAmount && amount <= this.maxAmount;
  }

  /**
   * Validate merchant transaction ID format and length
   * @param merchantTransactionId - Transaction ID to validate
   * @returns True if valid, false otherwise
   */
  validateMerchantTransactionId(merchantTransactionId: string): boolean {
    // PhonePe merchant transaction ID should be max 38 characters
    return !!(merchantTransactionId && 
           merchantTransactionId.length <= 38 && 
           merchantTransactionId.length >= 3 &&
           /^[a-zA-Z0-9_-]+$/.test(merchantTransactionId));
  }

  /**
   * Validate phone number format
   * @param phoneNumber - Phone number to validate
   * @returns True if valid Indian phone number, false otherwise
   */
  validatePhoneNumber(phoneNumber: string): boolean {
    // Indian phone number: 10 digits, can start with 6,7,8,9
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(phoneNumber);
  }

  /**
   * Validate user ID format
   * @param userId - User ID to validate
   * @returns True if valid, false otherwise
   */
  validateUserId(userId: string): boolean {
    return !!(userId && userId.length > 0 && userId.length <= 50);
  }

  /**
   * Validate order ID format
   * @param orderId - Order ID to validate
   * @returns True if valid, false otherwise
   */
  validateOrderId(orderId: string): boolean {
    return !!(orderId && orderId.length > 0 && orderId.length <= 100);
  }

  /**
   * Generate unique merchant transaction ID (max 38 characters for PhonePe)
   * @param orderId - Order ID prefix
   * @returns Unique transaction ID
   */
  generateMerchantTransactionId(orderId: string): string {
    // Use timestamp and random for uniqueness, keep it under 38 chars
    const timestamp = Date.now().toString().slice(-8); // Last 8 digits of timestamp
    const randomStr = Math.random().toString(36).substring(2, 6); // 4 random chars
    const orderShort = orderId.substring(0, 8); // First 8 chars of order ID
    
    // Format: TXN_orderShort_timestamp_random (max 38 chars)
    const txnId = `TXN_${orderShort}_${timestamp}_${randomStr}`;
    
    // Ensure it's under 38 characters
    return txnId.length > 38 ? txnId.substring(0, 38) : txnId;
  }

  /**
   * Convert amount to paise (smallest currency unit)
   * @param amount - Amount in rupees
   * @returns Amount in paise
   */
  convertToPaise(amount: number): number {
    return Math.round(amount * 100);
  }

  /**
   * Convert paise to rupees
   * @param paise - Amount in paise
   * @returns Amount in rupees
   */
  convertToRupees(paise: number): number {
    return paise / 100;
  }

  /**
   * Sanitize sensitive data for logging
   * @param data - Data to sanitize
   * @returns Sanitized data safe for logging
   */
  sanitizeForLogging(data: any): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const sensitiveFields = [
      'saltKey', 'password', 'secret', 'key', 'token', 
      'phoneNumber', 'mobileNumber', 'cardNumber', 'cvv'
    ];

    const sanitized = { ...data };
    
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = this.maskSensitiveData(sanitized[field]);
      }
    }

    return sanitized;
  }

  /**
   * Mask sensitive data for display
   * @param data - Sensitive data to mask
   * @returns Masked data
   */
  private maskSensitiveData(data: string): string {
    if (!data || data.length <= 4) {
      return '****';
    }
    
    const visibleChars = 2;
    const maskedSection = '*'.repeat(data.length - (visibleChars * 2));
    return data.substring(0, visibleChars) + maskedSection + data.substring(data.length - visibleChars);
  }

  /**
   * Validate environment configuration
   * @param config - Configuration object to validate
   * @returns Validation result with errors if any
   */
  validateConfiguration(config: {
    merchantId?: string;
    saltKey?: string;
    saltIndex?: number;
    baseUrl?: string;
  }): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.merchantId) {
      errors.push('PHONEPE_MERCHANT_ID is required');
    }

    if (!config.saltKey) {
      errors.push('PHONEPE_SALT_KEY is required');
    }

    if (!config.saltIndex || config.saltIndex < 1) {
      errors.push('PHONEPE_SALT_INDEX must be a positive number');
    }

    if (!config.baseUrl) {
      errors.push('PHONEPE_BASE_URL is required');
    } else if (!this.isValidUrl(config.baseUrl)) {
      errors.push('PHONEPE_BASE_URL must be a valid URL');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if a string is a valid URL
   * @param url - URL string to validate
   * @returns True if valid URL, false otherwise
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Rate limiting check (basic implementation)
   * @param identifier - Unique identifier (user ID, IP, etc.)
   * @param maxRequests - Maximum requests allowed
   * @param windowMs - Time window in milliseconds
   * @returns True if request is allowed, false if rate limited
   */
  checkRateLimit(identifier: string, maxRequests: number = 10, windowMs: number = 60000): boolean {
    // This is a basic in-memory implementation
    // In production, you'd want to use Redis or similar
    const now = Date.now();
    const key = `rate_limit_${identifier}`;
    
    // This would need to be implemented with proper storage
    // For now, return true (no rate limiting)
    return true;
  }

  /**
   * Generate correlation ID for request tracking
   * @returns Unique correlation ID
   */
  generateCorrelationId(): string {
    return `corr_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }
}
