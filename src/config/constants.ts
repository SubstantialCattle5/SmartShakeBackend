export const SESSION_CONFIG = {
  EXPIRATION_MINUTES: 10,
  EXPIRATION_MS: 10 * 60 * 1000, // 10 minutes in milliseconds
} as const;

export const VALIDATION_LIMITS = {
  MAX_QUANTITY_PER_TRANSACTION: 10,
  MIN_QUANTITY_PER_TRANSACTION: 1,
  MAX_HISTORY_LIMIT: 100,
  MIN_HISTORY_LIMIT: 1,
  DEFAULT_HISTORY_LIMIT: 50,
} as const;

export const DRINK_CONFIG = {
  MAX_PRICE: 1000, // Maximum price in currency units
  MIN_PRICE: 1,    // Minimum price in currency units
} as const; 