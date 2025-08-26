import crypto from 'crypto';

/**
 * CryptoService - Handles all cryptographic operations for payment processing
 * Separated from PaymentService for better modularity and testability
 */
export class CryptoService {
  private readonly saltKey: string;
  private readonly saltIndex: number;

  constructor(saltKey: string, saltIndex: number) {
    if (!saltKey) {
      throw new Error('Salt key is required for crypto operations');
    }
    this.saltKey = saltKey;
    this.saltIndex = saltIndex;
  }

  /**
   * Generate SHA256 hash and encode in Base64 for payment initiation
   * @param payload - Base64 encoded payload
   * @returns Checksum string in format: hash###saltIndex
   */
  generatePaymentChecksum(payload: string): string {
    const stringToHash = payload + '/pg/v1/pay' + this.saltKey;
    const hash = crypto.createHash('sha256').update(stringToHash).digest('hex');
    return hash + '###' + this.saltIndex;
  }

  /**
   * Generate checksum for payment status check
   * @param merchantId - Merchant ID
   * @param merchantTransactionId - Merchant transaction ID
   * @returns Checksum string in format: hash###saltIndex
   */
  generateStatusChecksum(merchantId: string, merchantTransactionId: string): string {
    const stringToHash = `/pg/v1/status/${merchantId}/${merchantTransactionId}` + this.saltKey;
    const hash = crypto.createHash('sha256').update(stringToHash).digest('hex');
    return hash + '###' + this.saltIndex;
  }

  /**
   * Generate checksum for refund operations
   * @param payload - Base64 encoded refund payload
   * @returns Checksum string in format: hash###saltIndex
   */
  generateRefundChecksum(payload: string): string {
    const stringToHash = payload + '/pg/v1/refund' + this.saltKey;
    const hash = crypto.createHash('sha256').update(stringToHash).digest('hex');
    return hash + '###' + this.saltIndex;
  }

  /**
   * Verify callback signature from PhonePe webhook
   * @param xVerify - X-VERIFY header value from callback
   * @param response - Response body from callback
   * @returns True if signature is valid, false otherwise
   */
  verifyCallbackChecksum(xVerify: string, response: string): boolean {
    try {
      const [hash, index] = xVerify.split('###');
      
      // Verify salt index matches
      if (parseInt(index) !== this.saltIndex) {
        console.warn('Salt index mismatch in callback verification');
        return false;
      }
      
      // Generate expected hash
      const stringToHash = response + this.saltKey;
      const computedHash = crypto.createHash('sha256').update(stringToHash).digest('hex');
      
      // Compare hashes
      return hash === computedHash;
    } catch (error) {
      console.error('Checksum verification error:', error);
      return false;
    }
  }

  /**
   * Encode payload to Base64
   * @param payload - Object to encode
   * @returns Base64 encoded string
   */
  encodePayload(payload: object): string {
    return Buffer.from(JSON.stringify(payload)).toString('base64');
  }

  /**
   * Decode Base64 payload
   * @param encodedPayload - Base64 encoded string
   * @returns Decoded object
   */
  decodePayload(encodedPayload: string): any {
    try {
      const decodedString = Buffer.from(encodedPayload, 'base64').toString('utf-8');
      return JSON.parse(decodedString);
    } catch (error) {
      console.error('Payload decoding error:', error);
      throw new Error('Invalid payload format');
    }
  }

  /**
   * Generate secure random string for transaction IDs
   * @param length - Length of random string
   * @returns Random string
   */
  generateSecureRandomString(length: number = 6): string {
    return crypto.randomBytes(Math.ceil(length / 2))
      .toString('hex')
      .substring(0, length);
  }

  /**
   * Hash sensitive data for logging (one-way)
   * @param data - Data to hash
   * @returns SHA256 hash
   */
  hashForLogging(data: string): string {
    return crypto.createHash('sha256').update(data + this.saltKey).digest('hex').substring(0, 16);
  }
}
