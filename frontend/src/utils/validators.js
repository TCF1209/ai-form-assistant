import { REGEX_PATTERNS } from './constants';

/**
 * Validate email address
 * @param {string} email - Email to validate
 * @returns {string|null} Error message or null if valid
 */
export const validateEmail = (email) => {
  if (!email) {
    return 'Email is required';
  }

  if (!REGEX_PATTERNS.EMAIL.test(email)) {
    return 'Please enter a valid email address';
  }

  return null;
};

/**
 * Validate password
 * @param {string} password - Password to validate
 * @returns {string|null} Error message or null if valid
 */
export const validatePassword = (password) => {
  if (!password) {
    return 'Password is required';
  }

  if (password.length < 8) {
    return 'Password must be at least 8 characters long';
  }

  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter';
  }

  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter';
  }

  if (!/\d/.test(password)) {
    return 'Password must contain at least one number';
  }

  return null;
};

/**
 * Validate password confirmation
 * @param {string} password - Original password
 * @param {string} confirmPassword - Confirmation password
 * @returns {string|null} Error message or null if valid
 */
export const validatePasswordConfirmation = (password, confirmPassword) => {
  if (!confirmPassword) {
    return 'Please confirm your password';
  }

  if (password !== confirmPassword) {
    return 'Passwords do not match';
  }

  return null;
};

/**
 * Validate phone number
 * @param {string} phone - Phone number to validate
 * @returns {string|null} Error message or null if valid
 */
export const validatePhone = (phone) => {
  if (!phone) {
    return null; // Phone is optional
  }

  if (!REGEX_PATTERNS.PHONE.test(phone)) {
    return 'Please enter a valid phone number';
  }

  const digitsOnly = phone.replace(/\D/g, '');
  if (digitsOnly.length < 10 || digitsOnly.length > 15) {
    return 'Phone number must be between 10 and 15 digits';
  }

  return null;
};

/**
 * Validate URL
 * @param {string} url - URL to validate
 * @returns {string|null} Error message or null if valid
 */
export const validateUrl = (url) => {
  if (!url) {
    return 'URL is required';
  }

  if (!REGEX_PATTERNS.URL.test(url)) {
    return 'Please enter a valid URL (must start with http:// or https://)';
  }

  return null;
};

/**
 * Validate required field
 * @param {any} value - Value to validate
 * @param {string} fieldName - Name of the field
 * @returns {string|null} Error message or null if valid
 */
export const validateRequired = (value, fieldName = 'This field') => {
  if (value === null || value === undefined || value === '') {
    return `${fieldName} is required`;
  }

  if (typeof value === 'string' && value.trim() === '') {
    return `${fieldName} is required`;
  }

  return null;
};

/**
 * Validate string length
 * @param {string} value - Value to validate
 * @param {number} min - Minimum length
 * @param {number} max - Maximum length
 * @param {string} fieldName - Name of the field
 * @returns {string|null} Error message or null if valid
 */
export const validateLength = (value, min, max, fieldName = 'This field') => {
  if (!value) {
    return null;
  }

  if (value.length < min) {
    return `${fieldName} must be at least ${min} characters long`;
  }

  if (max && value.length > max) {
    return `${fieldName} must not exceed ${max} characters`;
  }

  return null;
};

/**
 * Validate number range
 * @param {number} value - Value to validate
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @param {string} fieldName - Name of the field
 * @returns {string|null} Error message or null if valid
 */
export const validateRange = (value, min, max, fieldName = 'This field') => {
  if (value === null || value === undefined) {
    return null;
  }

  const numValue = Number(value);

  if (isNaN(numValue)) {
    return `${fieldName} must be a number`;
  }

  if (min !== undefined && numValue < min) {
    return `${fieldName} must be at least ${min}`;
  }

  if (max !== undefined && numValue > max) {
    return `${fieldName} must not exceed ${max}`;
  }

  return null;
};

/**
 * Validate file size
 * @param {File} file - File to validate
 * @param {number} maxSize - Maximum file size in bytes
 * @returns {string|null} Error message or null if valid
 */
export const validateFileSize = (file, maxSize) => {
  if (!file) {
    return 'Please select a file';
  }

  if (file.size > maxSize) {
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(2);
    return `File size must not exceed ${maxSizeMB}MB`;
  }

  return null;
};

/**
 * Validate file type
 * @param {File} file - File to validate
 * @param {string[]} allowedTypes - Array of allowed MIME types
 * @returns {string|null} Error message or null if valid
 */
export const validateFileType = (file, allowedTypes) => {
  if (!file) {
    return 'Please select a file';
  }

  if (!allowedTypes.includes(file.type)) {
    return `File type ${file.type} is not allowed`;
  }

  return null;
};

/**
 * Validate date
 * @param {string|Date} date - Date to validate
 * @returns {string|null} Error message or null if valid
 */
export const validateDate = (date) => {
  if (!date) {
    return 'Date is required';
  }

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    return 'Please enter a valid date';
  }

  return null;
};

/**
 * Validate date range
 * @param {string|Date} startDate - Start date
 * @param {string|Date} endDate - End date
 * @returns {string|null} Error message or null if valid
 */
export const validateDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) {
    return 'Both start and end dates are required';
  }

  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return 'Please enter valid dates';
  }

  if (start > end) {
    return 'End date must be after start date';
  }

  return null;
};

/**
 * Validate form data
 * @param {Object} data - Form data
 * @param {Object} rules - Validation rules
 * @returns {Object} Object with field errors
 */
export const validateForm = (data, rules) => {
  const errors = {};

  Object.keys(rules).forEach((field) => {
    const fieldRules = rules[field];
    const value = data[field];

    // Required validation
    if (fieldRules.required) {
      const error = validateRequired(value, fieldRules.label || field);
      if (error) {
        errors[field] = error;
        return;
      }
    }

    // Skip other validations if value is empty and not required
    if (!value && !fieldRules.required) {
      return;
    }

    // Email validation
    if (fieldRules.type === 'email') {
      const error = validateEmail(value);
      if (error) {
        errors[field] = error;
        return;
      }
    }

    // Password validation
    if (fieldRules.type === 'password') {
      const error = validatePassword(value);
      if (error) {
        errors[field] = error;
        return;
      }
    }

    // Phone validation
    if (fieldRules.type === 'phone') {
      const error = validatePhone(value);
      if (error) {
        errors[field] = error;
        return;
      }
    }

    // URL validation
    if (fieldRules.type === 'url') {
      const error = validateUrl(value);
      if (error) {
        errors[field] = error;
        return;
      }
    }

    // Length validation
    if (fieldRules.minLength || fieldRules.maxLength) {
      const error = validateLength(
        value,
        fieldRules.minLength,
        fieldRules.maxLength,
        fieldRules.label || field
      );
      if (error) {
        errors[field] = error;
        return;
      }
    }

    // Range validation
    if (fieldRules.min !== undefined || fieldRules.max !== undefined) {
      const error = validateRange(
        value,
        fieldRules.min,
        fieldRules.max,
        fieldRules.label || field
      );
      if (error) {
        errors[field] = error;
        return;
      }
    }

    // Custom validation
    if (fieldRules.validate && typeof fieldRules.validate === 'function') {
      const error = fieldRules.validate(value, data);
      if (error) {
        errors[field] = error;
        return;
      }
    }

    // Match validation (e.g., password confirmation)
    if (fieldRules.match) {
      if (value !== data[fieldRules.match]) {
        errors[field] = `${fieldRules.label || field} does not match`;
        return;
      }
    }
  });

  return errors;
};

export default {
  validateEmail,
  validatePassword,
  validatePasswordConfirmation,
  validatePhone,
  validateUrl,
  validateRequired,
  validateLength,
  validateRange,
  validateFileSize,
  validateFileType,
  validateDate,
  validateDateRange,
  validateForm,
};
