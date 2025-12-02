/**
 * Input Validation Utility for AI Form Generation
 * Provides comprehensive validation for user prompts before sending to OpenAI API
 */

// Common profanity list (basic - can be extended)
const PROFANITY_LIST = [
  'fuck', 'shit', 'ass', 'damn', 'bitch', 'bastard', 'crap',
  'dick', 'piss', 'cock', 'pussy', 'asshole', 'bullshit',
  // Add more as needed
];

// Form-related keywords that indicate valid intent
const FORM_KEYWORDS = [
  'form', 'field', 'input', 'create', 'generate', 'make', 'build',
  'application', 'request', 'submit', 'registration', 'survey',
  'questionnaire', 'feedback', 'report', 'leave', 'expense',
  'approval', 'order', 'booking', 'reservation', 'contact',
  'support', 'ticket', 'complaint', 'inquiry', 'claim',
  'employee', 'customer', 'user', 'member', 'student',
  'assessment', 'evaluation', 'review', 'checklist'
];

/**
 * Check if text contains profanity
 * @param {string} text - Input text to check
 * @returns {boolean} - True if profanity found
 */
export const containsProfanity = (text) => {
  const lowerText = text.toLowerCase();
  return PROFANITY_LIST.some(word => {
    // Check for whole word match (with word boundaries)
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    return regex.test(lowerText);
  });
};

/**
 * Check if text appears to be gibberish
 * Uses multiple heuristics to detect random/meaningless text
 * @param {string} text - Input text to check
 * @returns {boolean} - True if likely gibberish
 */
export const isGibberish = (text) => {
  const cleanText = text.toLowerCase().replace(/[^a-z\s]/g, '');

  if (cleanText.length < 5) return false; // Too short to determine

  // Check 1: Vowel ratio (normal English has ~35-40% vowels)
  const vowels = (cleanText.match(/[aeiou]/g) || []).length;
  const vowelRatio = vowels / cleanText.replace(/\s/g, '').length;
  if (vowelRatio < 0.15 || vowelRatio > 0.7) {
    return true;
  }

  // Check 2: Consonant clusters (more than 5 consonants in a row is unusual)
  const hasLongConsonantCluster = /[bcdfghjklmnpqrstvwxyz]{6,}/i.test(cleanText);
  if (hasLongConsonantCluster) {
    return true;
  }

  // Check 3: Repeated characters (like "aaaaaaa" or "asdfasdf")
  const hasExcessiveRepeats = /(.)\1{4,}/.test(cleanText);
  if (hasExcessiveRepeats) {
    return true;
  }

  // Check 4: Common keyboard patterns
  const keyboardPatterns = ['qwert', 'asdf', 'zxcv', 'qazwsx', 'asdfgh', 'jkl;', 'uiop'];
  const hasKeyboardPattern = keyboardPatterns.some(pattern =>
    cleanText.includes(pattern)
  );
  if (hasKeyboardPattern && cleanText.length < 20) {
    return true;
  }

  return false;
};

/**
 * Check if text has form-related intent
 * @param {string} text - Input text to check
 * @returns {boolean} - True if appears to be form-related
 */
export const hasFormIntent = (text) => {
  const lowerText = text.toLowerCase();
  return FORM_KEYWORDS.some(keyword => lowerText.includes(keyword));
};

/**
 * Count meaningful words in text
 * @param {string} text - Input text
 * @returns {number} - Number of words with 2+ characters
 */
export const countMeaningfulWords = (text) => {
  const words = text.trim().split(/\s+/);
  return words.filter(word => word.length >= 2).length;
};

/**
 * Main validation function for AI form generation prompts
 * @param {string} prompt - User's input prompt
 * @returns {Object} - { valid: boolean, error?: string, warning?: string }
 */
export const validateFormPrompt = (prompt) => {
  const trimmedPrompt = prompt.trim();

  // Check 1: Empty or too short
  if (!trimmedPrompt) {
    return {
      valid: false,
      error: 'Please enter a description for the form you want to create.'
    };
  }

  if (trimmedPrompt.length < 10) {
    return {
      valid: false,
      error: 'Please provide more details. Your description should be at least 10 characters.'
    };
  }

  // Check 2: Too long
  if (trimmedPrompt.length > 500) {
    return {
      valid: false,
      error: 'Your description is too long. Please keep it under 500 characters.'
    };
  }

  // Check 3: Profanity filter
  if (containsProfanity(trimmedPrompt)) {
    return {
      valid: false,
      error: 'Please use appropriate language in your description.'
    };
  }

  // Check 4: Gibberish detection
  if (isGibberish(trimmedPrompt)) {
    return {
      valid: false,
      error: 'Your input doesn\'t appear to be a valid description. Please describe the form you want to create.'
    };
  }

  // Check 5: Minimum meaningful words
  const wordCount = countMeaningfulWords(trimmedPrompt);
  if (wordCount < 2) {
    return {
      valid: false,
      error: 'Please use at least 2 words to describe your form.'
    };
  }

  // Check 6: Form intent (warning only, not blocking)
  if (!hasFormIntent(trimmedPrompt) && wordCount < 5) {
    return {
      valid: true,
      warning: 'Tip: For better results, include words like "form", "application", or describe what information you want to collect.'
    };
  }

  // All checks passed
  return { valid: true };
};

/**
 * Get helpful suggestions based on common form types
 * @returns {Array} - Array of suggestion objects
 */
export const getFormSuggestions = () => [
  { label: 'Leave Request', prompt: 'Create a leave application form' },
  { label: 'Expense Claim', prompt: 'Create an expense reimbursement form' },
  { label: 'IT Support', prompt: 'Create an IT support ticket form' },
  { label: 'Feedback', prompt: 'Create a feedback form' },
  { label: 'Contact', prompt: 'Create a contact form' },
  { label: 'Job Application', prompt: 'Create a job application form' },
];

export default {
  validateFormPrompt,
  containsProfanity,
  isGibberish,
  hasFormIntent,
  countMeaningfulWords,
  getFormSuggestions
};
