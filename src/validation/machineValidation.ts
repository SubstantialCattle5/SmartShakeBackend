import { DrinkType, DrinkFlavour } from '@prisma/client';
import { DRINK_CONFIG } from '../config/constants';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export class ValidationService {
  /**
   * Validates machine QR generation request
   */
  static validateMachineQRRequest(data: {
    machineId?: string;
    drinkType?: DrinkType;
    drinkFlavour?: DrinkFlavour;
    price?: number;
  }): ValidationResult {
    const errors: string[] = [];

    if (!data.machineId || typeof data.machineId !== 'string' || data.machineId.trim() === '') {
      errors.push('Machine ID is required and must be a non-empty string');
    }

    if (!data.drinkType || typeof data.drinkType !== 'string' || data.drinkType.trim() === '') {
      errors.push('Drink type is required and must be a non-empty string');
    } else {
      // Validate against DrinkType enum
      const validDrinkTypes = Object.values(DrinkType);
      if (!validDrinkTypes.includes(data.drinkType as DrinkType)) {
        errors.push(`Drink type must be one of: ${validDrinkTypes.join(', ')}`);
      }
    }

    if (!data.drinkFlavour || typeof data.drinkFlavour !== 'string' || data.drinkFlavour.trim() === '') {
      errors.push('Drink flavour is required and must be a non-empty string');
    } else {
      // Validate against DrinkFlavour enum
      const validDrinkFlavours = Object.values(DrinkFlavour);
      if (!validDrinkFlavours.includes(data.drinkFlavour as DrinkFlavour)) {
        errors.push(`Drink flavour must be one of: ${validDrinkFlavours.join(', ')}`);
      }
    }

    if (typeof data.price !== 'number' || data.price <= 0) {
      errors.push('Price is required and must be a positive number');
    } else if (data.price < DRINK_CONFIG.MIN_PRICE || data.price > DRINK_CONFIG.MAX_PRICE) {
      errors.push(`Price must be between ${DRINK_CONFIG.MIN_PRICE} and ${DRINK_CONFIG.MAX_PRICE}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates QR scan and payment request
   */
  static validateQRScanRequest(data: {
    qrCode?: string;
    voucherId?: string;
  }): ValidationResult {
    const errors: string[] = [];

    if (!data.qrCode || typeof data.qrCode !== 'string' || data.qrCode.trim() === '') {
      errors.push('QR code is required and must be a non-empty string');
    }

    if (!data.voucherId || typeof data.voucherId !== 'string' || data.voucherId.trim() === '') {
      errors.push('Voucher ID is required and must be a non-empty string');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates pagination parameters
   */
  static validatePaginationParams(params: {
    limit?: string | number;
    offset?: string | number;
  }, maxLimit: number = 100): ValidationResult {
    const errors: string[] = [];

    if (params.limit !== undefined) {
      const limit = typeof params.limit === 'string' ? parseInt(params.limit) : params.limit;
      if (isNaN(limit) || limit < 1 || limit > maxLimit) {
        errors.push(`Limit must be between 1 and ${maxLimit}`);
      }
    }

    if (params.offset !== undefined) {
      const offset = typeof params.offset === 'string' ? parseInt(params.offset) : params.offset;
      if (isNaN(offset) || offset < 0) {
        errors.push('Offset must be a non-negative number');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
} 