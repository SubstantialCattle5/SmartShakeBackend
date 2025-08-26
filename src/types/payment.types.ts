
export interface PhonePeConfig {
    merchantId: string;
    saltKey: string;
    saltIndex: number;
    baseUrl: string;
    redirectUrl: string;
    callbackUrl: string;
}
  
export interface PaymentInitiationRequest {
    orderId: string;
    amount: number; // in paise (smallest currency unit)
    userId: string;
    userPhone: string;
    description?: string;
}
  
export interface PaymentInitiationResponse {
    success: boolean;
    code: string;
    message: string;
    data?: {
      merchantId: string;
      merchantTransactionId: string;
      checksum: string;
      paymentUrl?: string;
      redirectUrl?: string;
      qrData?: string;
      paymentInstrument?: any;
      instrumentResponse?: any;
    };
}
  
export interface PaymentStatusResponse {
    success: boolean;
    code: string;
    message: string;
    data?: {
      merchantId: string;
      merchantTransactionId: string;
      transactionId: string;
      amount: number;
      state: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
      responseCode: string;
      paymentInstrument: {
        type: string;
        utr?: string;
        cardType?: string;
        pgTransactionId?: string;
      };
    };
}
  
export interface RefundRequest {
    originalTransactionId: string;
    merchantTransactionId: string;
    amount: number; // in paise
    callbackUrl?: string;
}
  
export interface RefundResponse {
    success: boolean;
    code: string;
    message: string;
    data?: {
      merchantId: string;
      merchantTransactionId: string;
      transactionId: string;
      amount: number;
      state: string;
      responseCode: string;
    };
}
  
export interface CallbackVerificationResult {
    isValid: boolean;
    transactionData?: any;
    error?: string;
}  