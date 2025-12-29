/**
 * Input Validation Utility for AI Form Generation and Smart Assistant
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

// Smart Assistant - keywords indicating form search/fill intent
const ASSISTANT_INTENT_KEYWORDS = [
  // Form-related
  'form', 'forms', 'application', 'apply', 'submit', 'fill', 'complete',
  // Action words
  'need', 'want', 'looking', 'find', 'search', 'show', 'list', 'help',
  'request', 'claim', 'report', 'book', 'reserve',
  // Common form types
  'leave', 'expense', 'support', 'ticket', 'feedback', 'complaint',
  'job', 'position', 'vacancy', 'hire', 'recruit',
  'approval', 'permission', 'authorize',
  // Questions
  'how', 'what', 'where', 'which', 'can'
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

  // Check 2: Too long (aligned with backend max_length=1000)
  if (trimmedPrompt.length > 1000) {
    return {
      valid: false,
      error: 'Your description is too long. Please keep it under 1000 characters.'
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

/**
 * Check if text has assistant-related intent (form search, help, etc.)
 * @param {string} text - Input text to check
 * @returns {boolean} - True if appears to be assistant-related
 */
export const hasAssistantIntent = (text) => {
  const lowerText = text.toLowerCase();
  return ASSISTANT_INTENT_KEYWORDS.some(keyword => lowerText.includes(keyword));
};

/**
 * Validation function for Smart Assistant chatbot messages
 * @param {string} message - User's chat message
 * @returns {Object} - { valid: boolean, error?: string, type?: string }
 */
export const validateAssistantMessage = (message) => {
  const trimmedMessage = message.trim();

  // Check 1: Empty message
  if (!trimmedMessage) {
    return {
      valid: false,
      error: 'Please enter a message.',
      type: 'empty'
    };
  }

  // Check 2: Too long
  if (trimmedMessage.length > 500) {
    return {
      valid: false,
      error: 'Your message is too long. Please keep it under 500 characters.',
      type: 'too_long'
    };
  }

  // Check 3: Profanity filter
  if (containsProfanity(trimmedMessage)) {
    return {
      valid: false,
      error: 'Please use appropriate language. I\'m here to help you find and fill forms.',
      type: 'profanity'
    };
  }

  // Check 4: Gibberish detection
  if (isGibberish(trimmedMessage)) {
    return {
      valid: false,
      error: 'I didn\'t understand that. Could you please describe what form or help you need?',
      type: 'gibberish'
    };
  }

  // Check 5: Very short messages (less than 3 chars) that aren't common words
  if (trimmedMessage.length < 3 && !/^(hi|ok|no|go)$/i.test(trimmedMessage)) {
    return {
      valid: false,
      error: 'Please provide more details about what you\'re looking for.',
      type: 'too_short'
    };
  }

  // Check 6: No form/assistant intent - still allow but with guidance
  const wordCount = countMeaningfulWords(trimmedMessage);
  if (!hasAssistantIntent(trimmedMessage) && wordCount >= 3) {
    // Check if it's just random words/conversation not related to forms
    const commonNonFormPhrases = [
      /^my name is/i,
      /^i am \w+$/i,
      /^i like/i,
      /^the weather/i,
      /^tell me a joke/i,
      /^what is your name/i,
      /^who are you/i,
      /^(\w+\s+){2,}and\s+\w+$/i, // patterns like "apple and tomato"
    ];

    const isNonFormRelated = commonNonFormPhrases.some(pattern => pattern.test(trimmedMessage));

    if (isNonFormRelated) {
      return {
        valid: false,
        error: 'I\'m a form assistant - I help you find and fill out forms. Try asking something like "I need to submit a leave request" or "Show me available forms".',
        type: 'off_topic'
      };
    }
  }

  // All checks passed
  return { valid: true };
};

/**
 * Get helpful suggestions for Smart Assistant
 * @returns {Array} - Array of suggestion strings
 */
export const getAssistantSuggestions = () => [
  'I want to apply for leave',
  'I need to submit an expense claim',
  'Show me all available forms',
  'I need IT support',
  'I want to apply for a job',
  'Help me submit a feedback form'
];

export default {
  validateFormPrompt,
  validateAssistantMessage,
  containsProfanity,
  isGibberish,
  hasFormIntent,
  hasAssistantIntent,
  countMeaningfulWords,
  getFormSuggestions,
  getAssistantSuggestions
};
