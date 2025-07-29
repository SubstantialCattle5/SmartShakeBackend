import { prisma } from '../config/database';
import { SESSION_CONFIG } from '../config/constants';

export interface MachineValidationResult {
  valid: boolean;
  error?: string;
  machine?: {
    id: string;
    name: string;
    location: string;
    address: string | null;
    city: string;
    isActive: boolean;
    isOnline: boolean;
    qrCode: string;
  };
}

export class MachineService {
  /**
   * Validates machine by machine ID and returns machine details
   */
  static async validateMachineById(machineId: string): Promise<MachineValidationResult> {
    try {
      const machine = await prisma.vendingMachine.findUnique({
        where: { machineId },
      });

      if (!machine) {
        return {
          valid: false,
          error: 'Machine not found',
        };
      }

      if (!machine.isActive) {
        return {
          valid: false,
          error: 'Machine is currently inactive',
        };
      }

      if (!machine.isOnline) {
        return {
          valid: false,
          error: 'Machine is currently offline',
        };
      }

      return {
        valid: true,
        machine: {
          id: machine.machineId,
          name: machine.name,
          location: machine.location,
          address: machine.address,
          city: machine.city,
          isActive: machine.isActive,
          isOnline: machine.isOnline,
          qrCode: machine.qrCode,
        },
      };
    } catch (error) {
      console.error('Error validating machine by ID:', error);
      return {
        valid: false,
        error: 'Failed to validate machine',
      };
    }
  }

  /**
   * Gets machine details by machine ID (without validation)
   */
  static async getMachineById(machineId: string) {
    return await prisma.vendingMachine.findUnique({
      where: { machineId },
    });
  }

  /**
   * Checks if machine is available for transactions
   */
  static isMachineAvailable(machine: { isActive: boolean; isOnline: boolean }): boolean {
    return machine.isActive && machine.isOnline;
  }
} 


export class MachineSessionService {
  /**
   * Generates a unique machine session ID
   * Format: MSS_<timestamp>_<random_string>
   */
  static generateSessionId(): string {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `MSS_${timestamp}_${randomString}`;
  }

  /**
   * Creates QR code data with embedded session and drink information
   * Format: <machineQrCode>|SESSION:<sessionId>|DRINK:<drinkType>|SLOT:<drinkSlot>|PRICE:<price>
   */
  static createQRCodeData(params: {
    machineQrCode: string;
    sessionId: string;
    drinkType: string;
    drinkSlot: string;
    price: number;
  }): string {
    const { machineQrCode, sessionId, drinkType, drinkSlot, price } = params;
    return `${machineQrCode}|SESSION:${sessionId}|DRINK:${drinkType}|SLOT:${drinkSlot}|PRICE:${price}`;
  }

  /**
   * Parses session ID from QR code data
   */
  static extractSessionId(qrCode: string): string | null {
    if (!qrCode.includes('SESSION:')) {
      return null;
    }
    
    const sessionMatch = qrCode.match(/SESSION:([^|]+)/);
    return sessionMatch?.[1] || null;
  }

  /**
   * Validates session ID format
   */
  static isValidSessionId(sessionId: string): boolean {
    // MSS_<timestamp>_<random_string> pattern
    const sessionPattern = /^MSS_\d+_[A-Z0-9]{6}$/;
    return sessionPattern.test(sessionId);
  }

  /**
   * Checks if a session has expired based on creation timestamp
   * @param sessionId The session ID to check
   * @param expirationMinutes Number of minutes after which session expires (default from config)
   */
  static isSessionExpired(sessionId: string, expirationMinutes: number = SESSION_CONFIG.EXPIRATION_MINUTES): boolean {
    if (!this.isValidSessionId(sessionId)) {
      return true;
    }

    const parts = sessionId.split('_');
    const timestamp = parseInt(parts[1]);
    const expirationTime = timestamp + (expirationMinutes * 60 * 1000);
    
    return Date.now() > expirationTime;
  }
} 