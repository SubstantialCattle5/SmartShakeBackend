/**
 * Validation helper utilities for common validation tasks
 */

/**
 * Validates if a string is a valid UUID (v4 format)
 * @param value - The string to validate
 * @returns boolean indicating if the value is a valid UUID
 */
export const isUUID = (value: string): boolean => {
  if (!value || typeof value !== 'string') {
    return false;
  }
  
  // UUID v4 regex pattern
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
};

/**
 * Validates if a string is a valid email address
 * @param email - The email string to validate
 * @returns boolean indicating if the email is valid
 */
export const isValidEmail = (email: string): boolean => {
  if (!email || typeof email !== 'string') {
    return false;
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validates if a string is a valid phone number
 * @param phone - The phone string to validate
 * @returns object with validation result and cleaned phone number
 */
export const isValidPhone = (phone: string): { isValid: boolean; cleanPhone?: string; error?: string } => {
  if (!phone || typeof phone !== 'string') {
    return { isValid: false, error: 'Phone number is required' };
  }
  
  // Remove common formatting characters
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  
  // Basic international phone number validation
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  
  if (!phoneRegex.test(cleanPhone)) {
    return { isValid: false, error: 'Invalid phone number format' };
  }
  
  return { isValid: true, cleanPhone };
};

/**
 * Validates if a value is a valid integer
 * @param value - The value to validate
 * @returns boolean indicating if the value is a valid integer
 */
export const isValidInteger = (value: any): boolean => {
  return Number.isInteger(Number(value)) && !isNaN(Number(value));
};

/**
 * Validates if a string is not empty after trimming
 * @param value - The string to validate
 * @returns boolean indicating if the string is not empty
 */
export const isNonEmptyString = (value: string): boolean => {
  return typeof value === 'string' && value.trim().length > 0;
};

/**
 * Validates password strength
 * @param password - The password to validate
 * @returns object with validation result and error message if invalid
 */
export const isValidPassword = (password: string): { isValid: boolean; error?: string } => {
  if (!password || typeof password !== 'string') {
    return { isValid: false, error: 'Password is required' };
  }
  
  if (password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters long' };
  }
  
  // Check for at least one uppercase, one lowercase, one digit, and one special character
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  if (!hasUppercase || !hasLowercase || !hasDigit || !hasSpecialChar) {
    return { 
      isValid: false, 
      error: 'Password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character' 
    };
  }
  
  return { isValid: true };
};
