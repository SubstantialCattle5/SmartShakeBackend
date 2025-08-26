import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { TransactionStatus, TransactionType } from '@prisma/client';
import { PhonePeConfig, PaymentInitiationRequest, PaymentInitiationResponse, PaymentStatusResponse, RefundRequest, RefundResponse, CallbackVerificationResult } from '../types/payment.types';
import { CryptoService } from '../utils/cryptoService';
import { SecurityService } from '../utils/securityService';
import { PaymentRepository } from '../repositories/paymentRepository';

export class PaymentService {
  private static config: PhonePeConfig;
  private static httpClient: AxiosInstance;
  private static cryptoService: CryptoService;
  private static securityService: SecurityService;

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

    // Initialize service instances
    this.cryptoService = new CryptoService(this.config.saltKey, this.config.saltIndex);
    this.securityService = new SecurityService(100000, 0.01); // Max ₹1000, Min ₹0.01

    // Validate configuration using SecurityService
    const validation = this.securityService.validateConfiguration({
      merchantId: this.config.merchantId,
      saltKey: this.config.saltKey,
      saltIndex: this.config.saltIndex,
      baseUrl: this.config.baseUrl,
    });

    if (!validation.isValid) {
      throw new Error(`PhonePe configuration validation failed: ${validation.errors.join(', ')}`);
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
      if (!this.securityService.validateAmount(request.amount)) {
        throw new Error('Invalid amount: must be between ₹0.01 and ₹1000');
      }

      // Convert amount to paise
      const amountInPaise = this.securityService.convertToPaise(request.amount);
      
      // Generate unique merchant transaction ID
      const merchantTransactionId = this.securityService.generateMerchantTransactionId(request.orderId);

      // Create transaction record
      await PaymentRepository.createTransaction({
        userId: request.userId,
        orderId: request.orderId,
        amount: request.amount,
        currency: 'INR',
        status: TransactionStatus.PENDING,
        type: TransactionType.PAYMENT,
        phonepeMerchantId: merchantTransactionId,
      });

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
      const base64Payload = this.cryptoService.encodePayload(paymentPayload);
      
      // Generate checksum
      const checksum = this.cryptoService.generatePaymentChecksum(base64Payload);

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
      await PaymentRepository.updateTransactionByMerchantId(merchantTransactionId, {
        status: TransactionStatus.PENDING,
        phonepeTransactionId: response.data.data?.merchantTransactionId || undefined,
        phonepeResponse: response.data as any,
        processedAt: null,
        failureReason: null,
      });

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
      const checksum = this.cryptoService.generateStatusChecksum(this.config.merchantId, merchantTransactionId);

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

        await PaymentRepository.updateTransactionByMerchantId(merchantTransactionId, {
          status,
          phonepeTransactionId: response.data.data?.transactionId,
          phonepeResponse: response.data as any,
          processedAt: status !== TransactionStatus.PENDING ? new Date() : null,
          failureReason: status === TransactionStatus.FAILED ? response.data.message : null,
        });
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
      const isValidChecksum = this.cryptoService.verifyCallbackChecksum(xVerify, responseBody);
      
      if (!isValidChecksum) {
        return {
          isValid: false,
          error: 'Invalid callback checksum',
        };
      }

      // Decode the response
      const transactionData = this.cryptoService.decodePayload(responseBody);

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

        await PaymentRepository.updateTransactionByMerchantId(
          transactionData.merchantTransactionId,
          {
            status,
            phonepeTransactionId: transactionData.transactionId || transactionData.phonepeTransactionId,
            phonepeResponse: { data: transactionData } as any,
            processedAt: status !== TransactionStatus.PENDING ? new Date() : null,
            failureReason: status === TransactionStatus.FAILED ? transactionData.message : null,
          }
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
      if (!this.securityService.validateAmount(this.securityService.convertToRupees(request.amount))) {
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
      const base64Payload = this.cryptoService.encodePayload(refundPayload);
      
      // Generate checksum for refund
      const checksum = this.cryptoService.generateRefundChecksum(base64Payload);

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
        const originalTransaction = await PaymentRepository.getTransactionByPhonePeId(
          request.originalTransactionId,
          false
        );

        if (originalTransaction) {
          // Create refund transaction record
          await PaymentRepository.createRefundTransaction(originalTransaction, {
            amount: this.securityService.convertToRupees(request.amount),
            merchantTransactionId: request.merchantTransactionId,
            phonepeTransactionId: response.data.data?.transactionId,
            phonepeResponse: response.data as any,
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
    return await PaymentRepository.getTransactionByMerchantId(merchantTransactionId, true);
  }

  /**
   * Get transaction by PhonePe transaction ID
   */
  static async getTransactionByPhonePeId(phonepeTransactionId: string) {
    return await PaymentRepository.getTransactionByPhonePeId(phonepeTransactionId, true);
  }

  /**
   * Get transactions by user ID
   */
  static async getUserTransactions(userId: string, limit?: number, offset?: number) {
    return await PaymentRepository.getTransactionsByUserId(userId, limit, offset, true);
  }

  /**
   * Get transactions by order ID
   */
  static async getOrderTransactions(orderId: string) {
    return await PaymentRepository.getTransactionsByOrderId(orderId, true);
  }

  /**
   * Get user transaction statistics
   */
  static async getUserTransactionStats(userId: string) {
    return await PaymentRepository.getUserTransactionStats(userId);
  }

  /**
   * Get transactions by status
   */
  static async getTransactionsByStatus(status: TransactionStatus, limit?: number, offset?: number) {
    return await PaymentRepository.getTransactionsByStatus(status, limit, offset, true);
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
