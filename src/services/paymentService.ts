import crypto from 'crypto';
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { prisma } from '../config/database';
import { Prisma, TransactionStatus } from '@prisma/client';
import { PhonePeConfig, PaymentInitiationRequest, PaymentInitiationResponse, PaymentStatusResponse  , RefundRequest, RefundResponse, CallbackVerificationResult } from '../types/payment.types';


// ========================================
// PHONEPE PAYMENT SERVICE
// ========================================

export class PaymentService {
  private static config: PhonePeConfig;
  private static httpClient: AxiosInstance;

  // Initialize PhonePe configuration
  static initialize(): void {
    this.config = {
      merchantId: process.env.PHONEPE_MERCHANT_ID || '',
      saltKey: process.env.PHONEPE_SALT_KEY || '',
      saltIndex: parseInt(process.env.PHONEPE_SALT_INDEX || '1'),
      baseUrl: process.env.PHONEPE_BASE_URL || 'https://api-preprod.phonepe.com/apis/pg-sandbox',
      redirectUrl: process.env.PHONEPE_REDIRECT_URL || '',
      callbackUrl: process.env.PHONEPE_CALLBACK_URL || '',
    };

    // Validate required configuration
    if (!this.config.merchantId || !this.config.saltKey) {
      throw new Error('PhonePe configuration missing: PHONEPE_MERCHANT_ID and PHONEPE_SALT_KEY are required');
    }

    // Initialize HTTP client
    this.httpClient = axios.create({
      baseURL: this.config.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'accept': 'application/json',
      },
    });

    // Add request interceptor for logging
    this.httpClient.interceptors.request.use(
      (config) => {
        console.log(`PhonePe API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('PhonePe API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for logging
    this.httpClient.interceptors.response.use(
      (response) => {
        console.log(`PhonePe API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        console.error('PhonePe API Response Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  // ========================================
  // CRYPTO & SECURITY FUNCTIONS
  // ========================================

  /**
   * Generate SHA256 hash and encode in Base64
   */
  private static generateChecksum(payload: string): string {
    const saltKey = this.config.saltKey;
    const saltIndex = this.config.saltIndex;
    
    const stringToHash = payload + '/pg/v1/pay' + saltKey;
    const hash = crypto.createHash('sha256').update(stringToHash).digest('hex');
    return hash + '###' + saltIndex;
  }

  /**
   * Generate checksum for status check
   */
  private static generateStatusChecksum(merchantTransactionId: string): string {
    const saltKey = this.config.saltKey;
    const saltIndex = this.config.saltIndex;
    
    const stringToHash = `/pg/v1/status/${this.config.merchantId}/${merchantTransactionId}` + saltKey;
    const hash = crypto.createHash('sha256').update(stringToHash).digest('hex');
    return hash + '###' + saltIndex;
  }

  /**
   * Verify callback signature
   */
  private static verifyCallbackChecksum(xVerify: string, response: string): boolean {
    try {
      const saltKey = this.config.saltKey;
      const saltIndex = this.config.saltIndex;
      
      const [hash, index] = xVerify.split('###');
      
      if (parseInt(index) !== saltIndex) {
        return false;
      }
      
      const stringToHash = response + saltKey;
      const computedHash = crypto.createHash('sha256').update(stringToHash).digest('hex');
      
      return hash === computedHash;
    } catch (error) {
      console.error('Checksum verification error:', error);
      return false;
    }
  }

  // ========================================
  // UTILITY FUNCTIONS
  // ========================================

  /**
   * Generate unique merchant transaction ID (max 38 characters for PhonePe)
   */
  private static generateMerchantTransactionId(orderId: string): string {
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
   */
  private static convertToPaise(amount: number): number {
    return Math.round(amount * 100);
  }

  /**
   * Convert paise to rupees
   */
  private static convertToRupees(paise: number): number {
    return paise / 100;
  }

  /**
   * Validate amount
   */
  private static validateAmount(amount: number): boolean {
    return amount > 0 && amount <= 100000; // Max ₹1000
  }

  // ========================================
  // DATABASE OPERATIONS
  // ========================================

  /**
   * Create transaction record in database
   */
  private static async createTransactionRecord(
    orderId: string,
    userId: string,
    amount: number,
    merchantTransactionId: string
  ): Promise<string> {
    try {
      const transaction = await prisma.transaction.create({
        data: {
          userId,
          orderId,
          amount: new Prisma.Decimal(amount),
          currency: 'INR',
          status: 'PENDING',
          type: 'PAYMENT',
          phonepeMerchantId: merchantTransactionId,
        },
      });
      
      return transaction.id;
    } catch (error) {
      console.error('Error creating transaction record:', error);
      throw new Error('Failed to create transaction record');
    }
  }

  /**
   * Update transaction with PhonePe response
   */
  private static async updateTransactionRecord(
    merchantTransactionId: string,
    phonepeResponse: any,
    status: 'SUCCESS' | 'FAILED' | 'PENDING'
  ): Promise<void> {
    try {
      await prisma.transaction.updateMany({
        where: { phonepeMerchantId: merchantTransactionId },
        data: {
          status,
          phonepeTransactionId: phonepeResponse.data?.transactionId,
          phonepeResponse: phonepeResponse as any,
          processedAt: status !== 'PENDING' ? new Date() : null,
          failureReason: status === 'FAILED' ? phonepeResponse.message : null,
        },
      });
    } catch (error) {
      console.error('Error updating transaction record:', error);
      throw new Error('Failed to update transaction record');
    }
  }

  // ========================================
  // MAIN PAYMENT METHODS
  // ========================================

  /**
   * Initiate payment with PhonePe
   */
  static async initiatePayment(request: PaymentInitiationRequest): Promise<PaymentInitiationResponse> {
    try {
      // Validate configuration
      if (!this.config.merchantId) {
        throw new Error('PhonePe service not initialized');
      }

      // Validate amount
      if (!this.validateAmount(request.amount)) {
        throw new Error('Invalid amount: must be between ₹0.01 and ₹1000');
      }

      // Convert amount to paise
      const amountInPaise = this.convertToPaise(request.amount);
      
      // Generate unique merchant transaction ID
      const merchantTransactionId = this.generateMerchantTransactionId(request.orderId);

      // Create transaction record
      await this.createTransactionRecord(
        request.orderId,
        request.userId,
        request.amount,
        merchantTransactionId
      );

      // Prepare payment request payload
      const paymentPayload = {
        merchantId: this.config.merchantId,
        merchantTransactionId,
        merchantUserId: request.userId,
        amount: amountInPaise,
        redirectUrl: this.config.redirectUrl,
        redirectMode: 'POST',
        callbackUrl: this.config.callbackUrl,
        mobileNumber: request.userPhone,
        paymentInstrument: {
          type: 'PAY_PAGE',
        },
      };

      // Convert payload to base64
      const base64Payload = Buffer.from(JSON.stringify(paymentPayload)).toString('base64');
      
      // Generate checksum
      const checksum = this.generateChecksum(base64Payload);

      // Prepare API request
      const apiRequest = {
        request: base64Payload,
      };

      const headers = {
        'X-VERIFY': checksum,
      };

      // Make API call to PhonePe
      const response: AxiosResponse<PaymentInitiationResponse> = await this.httpClient.post(
        '/pg/v1/pay',
        apiRequest,
        { headers }
      );

      console.log('PhonePe Payment Initiation Response:', response.data);

      // Update transaction record with initial response
      await this.updateTransactionRecord(merchantTransactionId, response.data, 'PENDING');

      // Extract payment URL from PhonePe response
      const paymentUrl = response.data.data?.instrumentResponse?.redirectInfo?.url;
      
      return {
        ...response.data,
        data: {
          merchantId: this.config.merchantId,
          merchantTransactionId,
          checksum,
          paymentUrl: paymentUrl,
          redirectUrl: response.data.data?.redirectUrl || paymentUrl, // Fallback
          qrData: response.data.data?.qrData,
          paymentInstrument: response.data.data?.paymentInstrument,
          instrumentResponse: response.data.data?.instrumentResponse,
        },
      };

    } catch (error: any) {
      console.error('Payment initiation error:', error);
      
      // Handle specific PhonePe errors
      if (error.response?.data) {
        return {
          success: false,
          code: error.response.data.code || 'PAYMENT_INITIATION_FAILED',
          message: error.response.data.message || 'Payment initiation failed',
        };
      }

      throw new Error(`Payment initiation failed: ${error.message}`);
    }
  }

  /**
   * Check payment status
   */
  static async checkPaymentStatus(merchantTransactionId: string): Promise<PaymentStatusResponse> {
    try {
      if (!this.config.merchantId) {
        throw new Error('PhonePe service not initialized');
      }

      // Generate checksum for status check
      const checksum = this.generateStatusChecksum(merchantTransactionId);

      const headers = {
        'X-VERIFY': checksum,
        'X-MERCHANT-ID': this.config.merchantId,
      };

      // Make API call to check status
      const response: AxiosResponse<PaymentStatusResponse> = await this.httpClient.get(
        `/pg/v1/status/${this.config.merchantId}/${merchantTransactionId}`,
        { headers }
      );

      console.log('PhonePe Payment Status Response:', response.data);

      // Update transaction record based on status
      if (response.data.data?.state) {
        let status: TransactionStatus = TransactionStatus.PENDING;
        
        switch (response.data.data.state) {
          case 'COMPLETED':
            status = TransactionStatus.SUCCESS;
            break;
          case 'FAILED':
          case 'CANCELLED':
            status = TransactionStatus.FAILED;
            break;
          default:
            status = TransactionStatus.PENDING;
        }

        await this.updateTransactionRecord(merchantTransactionId, response.data, status);
      }

      return response.data;

    } catch (error: any) {
      console.error('Payment status check error:', error);
      
      if (error.response?.data) {
        return {
          success: false,
          code: error.response.data.code || 'PAYMENT_STATUS_CHECK_FAILED',
          message: error.response.data.message || 'Payment status check failed',
        };
      }

      throw new Error(`Payment status check failed: ${error.message}`);
    }
  }

  /**
   * Verify callback from PhonePe webhook
   */
  static async verifyCallback(xVerify: string, responseBody: string): Promise<CallbackVerificationResult> {
    try {
      // Verify checksum
      const isValidChecksum = this.verifyCallbackChecksum(xVerify, responseBody);
      
      if (!isValidChecksum) {
        return {
          isValid: false,
          error: 'Invalid callback checksum',
        };
      }

      // Decode the response
      const decodedResponse = Buffer.from(responseBody, 'base64').toString('utf-8');
      const transactionData = JSON.parse(decodedResponse);

      // Update transaction record
      if (transactionData.merchantTransactionId) {
        let status: TransactionStatus = TransactionStatus.PENDING;
        
        switch (transactionData.state) {
          case 'COMPLETED':
            status = TransactionStatus.SUCCESS;
            break;
          case 'FAILED':
          case 'CANCELLED':
            status = TransactionStatus.FAILED;
            break;
          default:
            status = TransactionStatus.PENDING;
        }

        await this.updateTransactionRecord(
          transactionData.merchantTransactionId,
          { data: transactionData } as any,
          status
        );
      }

      return {
        isValid: true,
        transactionData,
      };

    } catch (error) {
      console.error('Callback verification error:', error);
      return {
        isValid: false,
        error: 'Callback verification failed',
      };
    }
  }

  // ========================================
  // REFUND FUNCTIONALITY
  // ========================================

  /**
   * Process refund
   */
  static async processRefund(request: RefundRequest): Promise<RefundResponse> {
    try {
      if (!this.config.merchantId) {
        throw new Error('PhonePe service not initialized');
      }

      // Validate amount
      if (!this.validateAmount(this.convertToRupees(request.amount))) {
        throw new Error('Invalid refund amount');
      }

      // Prepare refund payload
      const refundPayload = {
        merchantId: this.config.merchantId,
        merchantTransactionId: request.merchantTransactionId,
        originalTransactionId: request.originalTransactionId,
        amount: request.amount,
        callbackUrl: request.callbackUrl || this.config.callbackUrl,
      };

      // Convert payload to base64
      const base64Payload = Buffer.from(JSON.stringify(refundPayload)).toString('base64');
      
      // Generate checksum
      const checksum = this.generateChecksum(base64Payload);

      // Prepare API request
      const apiRequest = {
        request: base64Payload,
      };

      const headers = {
        'X-VERIFY': checksum,
      };

      // Make API call for refund
      const response: AxiosResponse<RefundResponse> = await this.httpClient.post(
        '/pg/v1/refund',
        apiRequest,
        { headers }
      );

      console.log('PhonePe Refund Response:', response.data);

      // Create refund transaction record
      if (response.data.success) {
        // Find original transaction
        const originalTransaction = await prisma.transaction.findFirst({
          where: { phonepeTransactionId: request.originalTransactionId },
        });

        if (originalTransaction) {
          // Create refund transaction record
          await prisma.transaction.create({
            data: {
              userId: originalTransaction.userId,
              orderId: originalTransaction.orderId,
              amount: new Prisma.Decimal(this.convertToRupees(request.amount)),
              currency: 'INR',
              status: 'SUCCESS',
              type: 'REFUND',
              phonepeMerchantId: request.merchantTransactionId,
              phonepeTransactionId: response.data.data?.transactionId,
              phonepeResponse: response.data as any,
              processedAt: new Date(),
            },
          });
        }
      }

      return response.data;

    } catch (error: any) {
      console.error('Refund processing error:', error);
      
      if (error.response?.data) {
        return {
          success: false,
          code: error.response.data.code || 'REFUND_FAILED',
          message: error.response.data.message || 'Refund processing failed',
        };
      }

      throw new Error(`Refund processing failed: ${error.message}`);
    }
  }

  // ========================================
  // HELPER METHODS
  // ========================================

  /**
   * Get transaction by merchant transaction ID
   */
  static async getTransactionByMerchantId(merchantTransactionId: string) {
    try {
      return await prisma.transaction.findFirst({
        where: { phonepeMerchantId: merchantTransactionId },
        include: {
          user: true,
          order: true,
        },
      });
    } catch (error) {
      console.error('Error fetching transaction:', error);
      return null;
    }
  }

  /**
   * Get configuration (for debugging)
   */
  static getConfig(): Partial<PhonePeConfig> {
    return {
      merchantId: this.config?.merchantId,
      baseUrl: this.config?.baseUrl,
      redirectUrl: this.config?.redirectUrl,
      callbackUrl: this.config?.callbackUrl,
    };
  }
}
