/**
 * Assistant Service for Smart Assistant
 * Connects to real OpenAI-powered backend for AI form search and assistance
 */

import api, { AI_TIMEOUT } from './api';
import { EMAIL_PATTERN, PHONE_PATTERN } from '../utils/patterns';

// Auto-fill field mappings - maps form field names to user profile fields
const AUTO_FILL_MAPPINGS = {
  // Name variations - only fields that refer to the person filling the form
  'name': 'name',
  'full_name': 'name',
  'fullname': 'name',
  'employee_name': 'name',
  'applicant_name': 'name',
  'your_name': 'name',
  'requester_name': 'name',
  'submitter_name': 'name',
  'staff_name': 'name',
  'first_name': 'first_name',
  'firstname': 'first_name',
  'last_name': 'last_name',
  'lastname': 'last_name',

  // Email variations
  'email': 'email',
  'email_address': 'email',
  'e_mail': 'email',
  'your_email': 'email',
  'contact_email': 'email',
  'my_email': 'email',

  // Employee ID variations
  'employee_id': 'employee_id',
  'employeeid': 'employee_id',
  'emp_id': 'employee_id',
  'staff_id': 'employee_id',
  'id_number': 'employee_id',

  // Department variations
  'department': 'department',
  'dept': 'department',
  'department_name': 'department',

  // Phone variations - only the user's own phone number
  'phone': 'phone',
  'phone_number': 'phone',
  'mobile': 'phone',
  'mobile_number': 'phone',
  'telephone': 'phone',
  'your_phone': 'phone',
  'your_phone_number': 'phone',
  'my_phone': 'phone',
  'my_phone_number': 'phone',
  'contact_number': 'phone',
  'your_contact_number': 'phone',
  'my_contact_number': 'phone',

  // Position variations
  'position': 'position',
  'job_title': 'position',
  'title': 'position',
  'role': 'position',
};

// Fields that should NOT be auto-filled with user profile data
// These are fields where "name", "phone", "email" etc. don't refer to the person filling the form
const NON_PERSON_PREFIXES = [
  // Other entities
  'project', 'company', 'business', 'organization', 'vendor', 'supplier',
  'client', 'customer', 'product', 'item', 'event', 'meeting', 'file',
  'document', 'report', 'account', 'team', 'group', 'branch', 'office',
  'bank', 'expense', 'budget', 'cost', 'task', 'activity',
  // Emergency/alternative contacts (not the user themselves)
  'emergency', 'alternate', 'alternative', 'secondary', 'backup',
  'spouse', 'parent', 'guardian', 'next_of_kin', 'nextofkin',
  'supervisor', 'manager', 'approver', 'recipient', 'beneficiary'
];

// Person-related prefixes that indicate the field IS about the user
const PERSON_PREFIXES = [
  'employee', 'applicant', 'requester', 'submitter', 'staff', 'your',
  'my', 'user', 'requestor', 'sender', 'reporter'
];

// Welcome messages
const welcomeMessages = [
  "Welcome to the Smart Form Assistant! I'm powered by AI to help you find and complete forms quickly.",
  "",
  "I can help you with:",
  "• Finding the right form based on what you need",
  "• Auto-filling your information from your profile",
  "• Guiding you through the form step by step",
  "",
  "Try saying something like:",
  "• \"I want to apply for leave\"",
  "• \"I need to submit an expense claim\"",
  "• \"Show me all available forms\""
];

// Cache for user profile
let userProfileCache = null;
let profileCacheTime = null;
const PROFILE_CACHE_EXPIRY = 10 * 60 * 1000; // 10 minutes

/**
 * Assistant Service - connects to real OpenAI-powered backend
 */
const assistantService = {
  // Cache for forms
  _formsCache: null,
  _formsCacheTime: null,
  _cacheExpiry: 5 * 60 * 1000, // 5 minutes

  /**
   * Get welcome message
   */
  getWelcomeMessage() {
    return {
      type: 'welcome',
      content: welcomeMessages.join('\n'),
      timestamp: new Date().toISOString(),
    };
  },

  /**
   * Fetch user profile for auto-fill
   */
  async fetchUserProfile(forceRefresh = false) {
    // Check cache
    if (!forceRefresh && userProfileCache && profileCacheTime) {
      const elapsed = Date.now() - profileCacheTime;
      if (elapsed < PROFILE_CACHE_EXPIRY) {
        return userProfileCache;
      }
    }

    try {
      const response = await api.get('/ai/assistant/user_profile/');
      userProfileCache = response.data;
      profileCacheTime = Date.now();
      return userProfileCache;
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      return null;
    }
  },

  /**
   * AI-powered form search
   */
  async searchFormsWithAI(query) {
    try {
      const response = await api.post('/ai/assistant/search_forms/', { query }, {
        timeout: AI_TIMEOUT  // 60 seconds for AI calls
      });
      return {
        success: true,
        forms: response.data.forms || [],
        aiResponse: response.data.ai_response || '',
        confidence: response.data.confidence || 0,
        reasoning: response.data.reasoning || '',
        extractedFields: response.data.extracted_fields || {}
      };
    } catch (error) {
      console.error('AI form search failed:', error);
      return {
        success: false,
        forms: [],
        aiResponse: 'Sorry, I had trouble searching for forms. Please try again.',
        confidence: 0,
        extractedFields: {}
      };
    }
  },

  /**
   * Fetch all available forms from backend
   */
  async fetchForms(forceRefresh = false) {
    // Check cache
    if (!forceRefresh && this._formsCache && this._formsCacheTime) {
      const elapsed = Date.now() - this._formsCacheTime;
      if (elapsed < this._cacheExpiry) {
        return this._formsCache;
      }
    }

    try {
      const response = await api.get('/forms/', { params: { page_size: 1000 } });
      const forms = response.data.results || response.data;

      // Transform forms to include fields info
      const formsWithFields = await Promise.all(
        forms.map(async (form) => {
          try {
            const fieldsResponse = await api.get(`/forms/${form.id}/fields/`);
            const fields = fieldsResponse.data || [];
            return {
              ...form,
              fields: fields.sort((a, b) => a.order - b.order),
            };
          } catch (err) {
            console.error(`Failed to fetch fields for form ${form.id}:`, err);
            return { ...form, fields: [] };
          }
        })
      );

      this._formsCache = formsWithFields;
      this._formsCacheTime = Date.now();
      return formsWithFields;
    } catch (error) {
      console.error('Failed to fetch forms:', error);
      if (this._formsCache) return this._formsCache;
      throw error;
    }
  },

  /**
   * Get form by ID with fields
   */
  async getFormById(formId) {
    try {
      const [formResponse, fieldsResponse] = await Promise.all([
        api.get(`/forms/${formId}/`),
        api.get(`/forms/${formId}/fields/`)
      ]);

      return {
        ...formResponse.data,
        fields: (fieldsResponse.data || []).sort((a, b) => a.order - b.order),
      };
    } catch (error) {
      console.error('Failed to fetch form:', error);
      throw error;
    }
  },

  /**
   * Auto-fill form fields from user profile
   */
  async getAutoFilledFields(formFields) {
    const userProfile = await this.fetchUserProfile();
    if (!userProfile) return {};

    const autoFilledData = {};

    formFields.forEach(field => {
      const fieldNameLower = field.name.toLowerCase();

      // Skip fields that are clearly NOT about the person filling the form
      const hasNonPersonPrefix = NON_PERSON_PREFIXES.some(prefix =>
        fieldNameLower.startsWith(prefix + '_') || fieldNameLower.startsWith(prefix)
      );
      if (hasNonPersonPrefix) {
        return; // Skip this field
      }

      // Check direct mapping first (exact match)
      if (AUTO_FILL_MAPPINGS[fieldNameLower]) {
        const profileKey = AUTO_FILL_MAPPINGS[fieldNameLower];
        if (userProfile[profileKey]) {
          autoFilledData[field.name] = userProfile[profileKey];
        }
      } else {
        // For loose matching, be more careful with "name" fields
        // Only auto-fill if field has a person-related prefix
        const hasPersonPrefix = PERSON_PREFIXES.some(prefix =>
          fieldNameLower.startsWith(prefix + '_') || fieldNameLower.startsWith(prefix)
        );

        // Keys that are too generic and could match non-person fields
        // These require a person-related prefix for loose matching
        const sensitiveKeys = ['name', 'phone', 'mobile', 'telephone', 'contact', 'email'];

        for (const [key, profileKey] of Object.entries(AUTO_FILL_MAPPINGS)) {
          // For sensitive keys, require person-related prefix to avoid matching
          // fields like "emergency_phone", "company_email", "project_name"
          if (sensitiveKeys.includes(key) && !hasPersonPrefix) {
            continue; // Skip matching for non-person fields
          }

          // For other keys, check if field contains the key
          if (fieldNameLower.includes(key) || key.includes(fieldNameLower)) {
            if (userProfile[profileKey]) {
              autoFilledData[field.name] = userProfile[profileKey];
              break;
            }
          }
        }
      }
    });

    return autoFilledData;
  },

  /**
   * Get fields that need user input (not auto-filled)
   */
  getFieldsNeedingInput(formFields, autoFilledData) {
    return formFields.filter(field => !autoFilledData[field.name]);
  },

  /**
   * Process user message and return AI response
   */
  async processMessage(message, context = {}) {
    const messageLower = message.toLowerCase().trim();

    // Check for greetings (English, Chinese, Malay)
    // Chinese: 你好, 嗨, 早上好, 下午好, 晚上好
    // Malay: selamat pagi, selamat petang, selamat malam, hai
    // Only match SHORT greetings (less than 30 chars) to avoid matching "Hi I want to apply for leave"
    if (messageLower.length < 30 && /^(hi|hello|hey|good morning|good afternoon|good evening|你好|嗨|早上好|下午好|晚上好|selamat pagi|selamat petang|selamat malam|hai)[\s!.?]*$/i.test(messageLower)) {
      return {
        type: 'greeting',
        content: "Hello! I'm here to help you find and fill out forms. What would you like to do today?",
        timestamp: new Date().toISOString(),
      };
    }

    // Check for thanks (English, Chinese, Malay)
    // Chinese: 谢谢, 感谢, 多谢
    // Malay: terima kasih
    // Only match SHORT thanks messages
    if (messageLower.length < 30 && /^(thank|thanks|thx|ty|appreciate|谢谢|感谢|多谢|terima kasih)[\s!.?]*$/i.test(messageLower)) {
      return {
        type: 'thanks',
        content: "You're welcome! Is there anything else I can help you with?",
        timestamp: new Date().toISOString(),
      };
    }

    // Check for goodbye (English, Chinese, Malay)
    // Chinese: 再见, 拜拜
    // Malay: selamat tinggal, jumpa lagi
    // Only match SHORT goodbye messages
    if (messageLower.length < 30 && /^(bye|goodbye|see you|exit|quit|再见|拜拜|selamat tinggal|jumpa lagi)[\s!.?]*$/i.test(messageLower)) {
      return {
        type: 'goodbye',
        content: "Goodbye! Feel free to come back anytime you need help with forms.",
        timestamp: new Date().toISOString(),
      };
    }

    // Check for "show all forms" request - must be explicit request to list all forms
    // More specific patterns to avoid matching questions like "what form should I use"
    if (/^(show\s*(all|me)?\s*forms?|list\s*(all\s*)?forms?|available\s*forms?|what\s*forms?\s*(are\s*)?(there|available|do\s*you\s*have))$/i.test(messageLower.trim()) ||
        /^(show|list|display|view)\s*(all|me)?\s*(the\s*)?(available\s*)?forms?$/i.test(messageLower.trim())) {
      try {
        const forms = await this.fetchForms();
        return {
          type: 'form_list',
          content: "Here are all the available forms you can access:",
          forms: forms,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        return {
          type: 'error',
          content: "Sorry, I couldn't load the forms. Please try again.",
          timestamp: new Date().toISOString(),
        };
      }
    }

    // Use AI-powered search
    const searchResult = await this.searchFormsWithAI(message);

    // Check if we have a high-confidence match
    if (searchResult.success && searchResult.forms.length > 0 && searchResult.confidence >= 0.5) {
      const bestMatch = searchResult.forms.find(f => f.is_best_match) || searchResult.forms[0];
      const alternatives = searchResult.forms.filter(f => f !== bestMatch);

      // Fetch full form data with fields
      try {
        const formWithFields = await this.getFormById(bestMatch.id);
        bestMatch.fields = formWithFields.fields;
      } catch (e) {
        console.error('Failed to fetch form fields:', e);
      }

      return {
        type: 'form_recommendation',
        content: searchResult.aiResponse || `I found a form that might help you:\n\n**${bestMatch.name}**\n\n${bestMatch.description || 'No description available.'}\n\nIs this the form you're looking for?`,
        recommendedForm: bestMatch,
        alternatives: alternatives,
        confidence: searchResult.confidence,
        extractedFields: searchResult.extractedFields || {},  // Pass extracted values from user's query
        timestamp: new Date().toISOString(),
      };
    }

    // Low confidence or no match - show all forms
    if (!searchResult.success || searchResult.forms.length === 0 || searchResult.confidence < 0.5) {
      try {
        const allForms = await this.fetchForms();
        return {
          type: 'no_match',
          content: searchResult.aiResponse || "I couldn't find a specific form matching your request. Here are all available forms:",
          forms: allForms,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        return {
          type: 'error',
          content: "Sorry, I couldn't load the forms. Please try again.",
          timestamp: new Date().toISOString(),
        };
      }
    }

    return {
      type: 'text',
      content: searchResult.aiResponse || "I'm not sure what you're looking for. Could you describe the form you need?",
      timestamp: new Date().toISOString(),
    };
  },

  /**
   * Start form filling process with auto-fill
   * @param {Object} form - The form to fill
   * @param {Object} extractedFields - Optional fields extracted from user's initial query
   */
  async startFormFilling(form, extractedFields = {}) {
    // Ensure we have fields
    let formWithFields = form;
    if (!form.fields || form.fields.length === 0) {
      try {
        formWithFields = await this.getFormById(form.id);
      } catch (error) {
        return {
          type: 'error',
          content: 'Unable to load form fields. Please try again.',
          timestamp: new Date().toISOString(),
        };
      }
    }

    if (!formWithFields.fields || formWithFields.fields.length === 0) {
      return {
        type: 'error',
        content: 'This form has no fields to fill. Please contact your administrator.',
        timestamp: new Date().toISOString(),
      };
    }

    // Get auto-filled data from user profile
    const profileData = await this.getAutoFilledFields(formWithFields.fields);

    // Merge profile data with extracted fields from user's query
    // Extracted fields take precedence as they're more specific to this request
    const autoFilledData = { ...profileData, ...extractedFields };

    // Separate counts for the message
    const profileFieldCount = Object.keys(profileData).length;
    const extractedFieldCount = Object.keys(extractedFields).length;
    const totalAutoFilledCount = Object.keys(autoFilledData).length;

    // Get fields that still need user input
    const fieldsNeedingInput = this.getFieldsNeedingInput(formWithFields.fields, autoFilledData);

    // Build response message
    let message = `Great! I'll help you fill out the "${formWithFields.title || formWithFields.name}" form.\n\n`;

    if (totalAutoFilledCount > 0) {
      // Show profile-filled fields
      if (profileFieldCount > 0) {
        const profileOnlyFields = Object.entries(profileData).filter(
          ([key]) => !extractedFields[key]
        );
        if (profileOnlyFields.length > 0) {
          message += `✅ I've auto-filled ${profileOnlyFields.length} field(s) from your profile:\n`;
          for (const [fieldName, value] of profileOnlyFields) {
            const field = formWithFields.fields.find(f => f.name === fieldName);
            message += `• ${field?.label || fieldName}: ${value}\n`;
          }
          message += '\n';
        }
      }

      // Show fields extracted from user's query
      if (extractedFieldCount > 0) {
        message += `🧠 I've also extracted ${extractedFieldCount} field(s) from what you told me:\n`;
        for (const [fieldName, value] of Object.entries(extractedFields)) {
          const field = formWithFields.fields.find(f => f.name === fieldName);
          message += `• ${field?.label || fieldName}: ${value}\n`;
        }
        message += '\n';
      }

      message += 'You can edit these if needed.\n\n';
    }

    if (fieldsNeedingInput.length > 0) {
      const firstField = fieldsNeedingInput[0];
      message += `Now, let's fill in the remaining fields.\n\n`;
      message += this._getFieldPrompt(firstField);
    } else {
      message += `All fields have been auto-filled! Please review and submit.`;
    }

    return {
      type: 'start_filling',
      content: message,
      form: formWithFields,
      autoFilledData: autoFilledData,
      fieldsNeedingInput: fieldsNeedingInput,
      currentFieldIndex: 0,
      currentField: fieldsNeedingInput[0] || null,
      timestamp: new Date().toISOString(),
    };
  },

  /**
   * Get prompt for a field
   */
  _getFieldPrompt(field) {
    const fieldType = field.field_type || field.type;
    const fieldLabel = (field.label || field.name || 'this field').toLowerCase();
    const prompts = {
      'TEXT': `Please enter your ${fieldLabel}.`,
      'SHORT_TEXT': `Please enter your ${fieldLabel}.`,
      'LONG_TEXT': `Please provide details for ${fieldLabel}.`,
      'EMAIL': `Please enter a valid email address for ${fieldLabel}.`,
      'DATE': `Please select the ${fieldLabel}.`,
      'NUMBER': `Please enter the ${fieldLabel} (numbers only).`,
      'TEXTAREA': `Please provide details for ${fieldLabel}.`,
      'SELECT': `Please choose an option for ${fieldLabel}.`,
      'DROPDOWN': `Please choose an option for ${fieldLabel}.`,
      'RADIO': `Please select one option for ${fieldLabel}.`,
      'FILE': `Please upload your ${fieldLabel}.`,
      'TIME': `Please select the ${fieldLabel}.`,
      'PHONE': `Please enter a phone number for ${fieldLabel}.`,
      'URL': `Please enter a URL for ${fieldLabel}.`,
      'CHECKBOX': `Do you want to check ${fieldLabel}? (yes/no)`,
      'MULTISELECT': `Please select one or more options for ${fieldLabel}.`,
    };
    return prompts[fieldType] || `Please fill in the ${fieldLabel}.`;
  },

  /**
   * Process response during form filling mode
   */
  async processFormFillingResponse(message, context) {
    const { currentForm, currentFieldIndex, formData, fieldsNeedingInput } = context;

    // Use fieldsNeedingInput if available, otherwise use all fields
    const fields = fieldsNeedingInput || currentForm.fields;
    const currentField = fields[currentFieldIndex];

    if (!currentField) {
      return {
        type: 'form_complete',
        content: "All fields have been filled! Please review your responses and submit.",
        formData: formData,
        timestamp: new Date().toISOString(),
      };
    }

    // Store the response
    const newFormData = { ...formData };

    // Basic validation
    let isValid = true;
    let errorMessage = '';
    let processedValue = message.trim();

    if (currentField.required && !processedValue) {
      isValid = false;
      errorMessage = `${currentField.label || currentField.name || 'This field'} is required. Please provide a value.`;
    } else if (processedValue) {
      const fieldType = currentField.field_type || currentField.type;

      switch (fieldType) {
        case 'EMAIL':
          if (!EMAIL_PATTERN.test(processedValue)) {
            isValid = false;
            errorMessage = 'Please enter a valid email address.';
          }
          break;
        case 'NUMBER':
          if (isNaN(parseFloat(processedValue))) {
            isValid = false;
            errorMessage = 'Please enter a valid number.';
          }
          break;
        case 'PHONE':
          if (!PHONE_PATTERN.test(processedValue)) {
            isValid = false;
            errorMessage = 'Please enter a valid phone number.';
          }
          break;
        case 'CHECKBOX':
          processedValue = /^(yes|y|true|1|check|checked)$/i.test(processedValue);
          break;
        case 'SELECT':
        case 'DROPDOWN':
        case 'RADIO':
          if (currentField.options && currentField.options.length > 0) {
            const validOption = currentField.options.find(opt => {
              const optValue = typeof opt === 'string' ? opt : opt.value || opt.label;
              return optValue.toLowerCase() === processedValue.toLowerCase();
            });
            if (!validOption) {
              const optionLabels = currentField.options.map(opt =>
                typeof opt === 'string' ? opt : opt.label || opt.value
              ).join(', ');
              isValid = false;
              errorMessage = `Please select a valid option: ${optionLabels}`;
            } else {
              processedValue = typeof validOption === 'string' ? validOption : validOption.value || validOption.label;
            }
          }
          break;
      }
    }

    if (!isValid) {
      return {
        type: 'validation_error',
        content: errorMessage,
        currentFieldIndex,
        timestamp: new Date().toISOString(),
      };
    }

    // Store the validated value
    newFormData[currentField.name] = processedValue;

    // Move to next field
    const nextFieldIndex = currentFieldIndex + 1;
    if (nextFieldIndex < fields.length) {
      const nextField = fields[nextFieldIndex];
      return {
        type: 'next_field',
        content: `Got it! ${this._getFieldPrompt(nextField)}`,
        nextFieldIndex,
        formData: newFormData,
        nextField,
        timestamp: new Date().toISOString(),
      };
    }

    // All fields complete
    return {
      type: 'form_complete',
      content: "Excellent! You've provided all the required information. Let me prepare your form submission.",
      formData: newFormData,
      timestamp: new Date().toISOString(),
    };
  },

  /**
   * Validate a single field value
   */
  validateFieldValue(field, value) {
    let isValid = true;
    let errorMessage = '';
    let processedValue = (value || '').toString().trim();

    // Check required
    if (field.required && !processedValue) {
      return {
        valid: false,
        message: `${field.label || field.name || 'This field'} is required. Please provide a value.`,
      };
    }

    if (processedValue) {
      const fieldType = field.field_type || field.type;

      switch (fieldType) {
        case 'EMAIL':
          if (!EMAIL_PATTERN.test(processedValue)) {
            isValid = false;
            errorMessage = 'Please enter a valid email address.';
          }
          break;
        case 'NUMBER':
          if (isNaN(parseFloat(processedValue))) {
            isValid = false;
            errorMessage = 'Please enter a valid number.';
          } else {
            processedValue = parseFloat(processedValue);
          }
          break;
        case 'PHONE':
          if (!PHONE_PATTERN.test(processedValue)) {
            isValid = false;
            errorMessage = 'Please enter a valid phone number.';
          }
          break;
        case 'CHECKBOX':
          processedValue = /^(yes|y|true|1|check|checked)$/i.test(processedValue);
          break;
        case 'SELECT':
        case 'DROPDOWN':
        case 'RADIO':
          if (field.options && field.options.length > 0) {
            const validOption = field.options.find(opt => {
              const optValue = typeof opt === 'string' ? opt : opt.value || opt.label;
              return optValue.toLowerCase() === processedValue.toLowerCase();
            });
            if (!validOption) {
              const optionLabels = field.options.map(opt =>
                typeof opt === 'string' ? opt : opt.label || opt.value
              ).join(', ');
              isValid = false;
              errorMessage = `Please select a valid option: ${optionLabels}`;
            } else {
              processedValue = typeof validOption === 'string' ? validOption : validOption.value || validOption.label;
            }
          }
          break;
      }
    }

    if (!isValid) {
      return {
        valid: false,
        message: errorMessage,
      };
    }

    return {
      valid: true,
      value: processedValue,
    };
  },

  /**
   * Find a field by name or label (for natural language editing)
   */
  findFieldByNameOrLabel(fields, searchTerm) {
    if (!fields || !searchTerm) return null;
    const searchLower = searchTerm.toLowerCase().trim();

    // Try exact match first
    let found = fields.find(f =>
      (f.name || '').toLowerCase() === searchLower ||
      (f.label || '').toLowerCase() === searchLower
    );

    if (found) return found;

    // Try partial match
    found = fields.find(f =>
      (f.name || '').toLowerCase().includes(searchLower) ||
      (f.label || '').toLowerCase().includes(searchLower) ||
      searchLower.includes((f.name || '').toLowerCase()) ||
      searchLower.includes((f.label || '').toLowerCase())
    );

    return found || null;
  },

  /**
   * Parse edit command from user message
   * Returns { isEditCommand: boolean, fieldName: string | null }
   */
  parseEditCommand(message, fields) {
    const messageLower = message.toLowerCase().trim();

    // Common edit patterns
    const editPatterns = [
      /^(?:edit|change|update|modify)\s+(?:the\s+)?(.+?)(?:\s+field)?$/i,
      /^(?:i want to\s+)?(?:edit|change|update|modify)\s+(?:the\s+)?(.+?)$/i,
      /^(.+?)\s+(?:is wrong|needs to be changed|should be|change it)$/i,
    ];

    for (const pattern of editPatterns) {
      const match = message.match(pattern);
      if (match) {
        const fieldSearch = match[1].trim();
        const field = this.findFieldByNameOrLabel(fields, fieldSearch);
        if (field) {
          return { isEditCommand: true, field, fieldName: fieldSearch };
        }
      }
    }

    // Check if message just contains a field name (user might just type the field name)
    const field = this.findFieldByNameOrLabel(fields, messageLower);
    if (field && messageLower.length < 50) { // Avoid matching long messages
      return { isEditCommand: true, field, fieldName: messageLower };
    }

    return { isEditCommand: false, field: null, fieldName: null };
  },

  /**
   * Submit form to backend
   */
  async submitForm(formId, formData) {
    try {
      const response = await api.post('/submissions/', {
        form: formId,
        status: 'SUBMITTED',
        data: formData,
      });
      return {
        success: true,
        submission: response.data,
        message: 'Form submitted successfully!',
      };
    } catch (error) {
      console.error('Failed to submit form:', error);
      return {
        success: false,
        message: error.response?.data?.detail || 'Failed to submit form. Please try again.',
        error: error,
      };
    }
  },

  /**
   * Get all forms (alias for fetchForms)
   */
  async getAllForms() {
    return this.fetchForms();
  },

  /**
   * Clear forms cache
   */
  clearCache() {
    this._formsCache = null;
    this._formsCacheTime = null;
    userProfileCache = null;
    profileCacheTime = null;
  },

  // ============================================
  // Chat History Methods
  // ============================================

  /**
   * Load chat history from backend
   * @returns {Promise<Object>} - Current session with messages
   */
  async loadChatHistory() {
    try {
      const response = await api.get('/ai/chat/current/');
      return {
        success: true,
        session: response.data,
        messages: response.data.messages || []
      };
    } catch (error) {
      console.error('Failed to load chat history:', error);
      return {
        success: false,
        session: null,
        messages: []
      };
    }
  },

  /**
   * Save a single message to chat history
   * @param {string} content - Message content
   * @param {string} messageType - 'USER' or 'ASSISTANT'
   * @param {Object} metadata - Optional metadata
   */
  async saveMessage(content, messageType = 'USER', metadata = {}) {
    try {
      await api.post('/ai/chat/add_message/', {
        content,
        message_type: messageType,
        metadata
      });
      return { success: true };
    } catch (error) {
      console.error('Failed to save message:', error);
      return { success: false };
    }
  },

  /**
   * Save multiple messages at once
   * @param {Array} messages - Array of message objects
   */
  async saveMessages(messages) {
    try {
      const formattedMessages = messages.map(msg => ({
        content: msg.content,
        message_type: msg.isUser ? 'USER' : 'ASSISTANT',
        metadata: msg.metadata || {}
      }));

      await api.post('/ai/chat/add_messages/', {
        messages: formattedMessages
      });
      return { success: true };
    } catch (error) {
      console.error('Failed to save messages:', error);
      return { success: false };
    }
  },

  /**
   * Clear chat history and start a new session
   */
  async clearChatHistory() {
    try {
      const response = await api.post('/ai/chat/clear/');
      return {
        success: true,
        sessionId: response.data.session_id
      };
    } catch (error) {
      console.error('Failed to clear chat history:', error);
      return { success: false };
    }
  },

  /**
   * Get all past chat sessions
   */
  async getChatSessions() {
    try {
      const response = await api.get('/ai/chat/history/');
      return {
        success: true,
        sessions: response.data
      };
    } catch (error) {
      console.error('Failed to get chat sessions:', error);
      return { success: false, sessions: [] };
    }
  },

  /**
   * Switch to a different chat session
   * @param {string} sessionId - Session ID to activate
   */
  async switchSession(sessionId) {
    try {
      const response = await api.post(`/ai/chat/${sessionId}/activate/`);
      return {
        success: true,
        session: response.data
      };
    } catch (error) {
      console.error('Failed to switch session:', error);
      return { success: false };
    }
  }
};

export default assistantService;
