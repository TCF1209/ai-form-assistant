/**
 * Assistant Service for Smart Assistant
 * Connects to real OpenAI-powered backend for AI form search and assistance
 */

import api from './api';

// Auto-fill field mappings - maps form field names to user profile fields
const AUTO_FILL_MAPPINGS = {
  // Name variations
  'name': 'name',
  'full_name': 'name',
  'fullname': 'name',
  'employee_name': 'name',
  'applicant_name': 'name',
  'your_name': 'name',
  'first_name': 'first_name',
  'firstname': 'first_name',
  'last_name': 'last_name',
  'lastname': 'last_name',

  // Email variations
  'email': 'email',
  'email_address': 'email',
  'e_mail': 'email',
  'your_email': 'email',

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

  // Phone variations
  'phone': 'phone',
  'phone_number': 'phone',
  'contact_number': 'phone',
  'mobile': 'phone',
  'telephone': 'phone',

  // Position variations
  'position': 'position',
  'job_title': 'position',
  'title': 'position',
  'role': 'position',
};

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
      const response = await api.post('/ai/assistant/search_forms/', { query });
      console.log('AI Search Response:', response.data); // Debug logging
      return {
        success: true,
        forms: response.data.forms || [],
        aiResponse: response.data.ai_response || '',
        confidence: response.data.confidence || 0,
        reasoning: response.data.reasoning || ''
      };
    } catch (error) {
      console.error('AI form search failed:', error);
      return {
        success: false,
        forms: [],
        aiResponse: 'Sorry, I had trouble searching for forms. Please try again.',
        confidence: 0
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
      const response = await api.get('/forms/');
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

      // Check direct mapping
      if (AUTO_FILL_MAPPINGS[fieldNameLower]) {
        const profileKey = AUTO_FILL_MAPPINGS[fieldNameLower];
        if (userProfile[profileKey]) {
          autoFilledData[field.name] = userProfile[profileKey];
        }
      } else {
        // Check if field name contains any of the mapping keys
        for (const [key, profileKey] of Object.entries(AUTO_FILL_MAPPINGS)) {
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

    // Check for greetings
    if (/^(hi|hello|hey|good morning|good afternoon|good evening)/i.test(messageLower)) {
      return {
        type: 'greeting',
        content: "Hello! I'm here to help you find and fill out forms. What would you like to do today?",
        timestamp: new Date().toISOString(),
      };
    }

    // Check for thanks
    if (/^(thank|thanks|thx|ty|appreciate)/i.test(messageLower)) {
      return {
        type: 'thanks',
        content: "You're welcome! Is there anything else I can help you with?",
        timestamp: new Date().toISOString(),
      };
    }

    // Check for goodbye
    if (/^(bye|goodbye|see you|exit|quit)/i.test(messageLower)) {
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
   */
  async startFormFilling(form) {
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
    const autoFilledData = await this.getAutoFilledFields(formWithFields.fields);
    const autoFilledCount = Object.keys(autoFilledData).length;
    const fieldsNeedingInput = this.getFieldsNeedingInput(formWithFields.fields, autoFilledData);

    // Build response message
    let message = `Great! I'll help you fill out the "${formWithFields.title || formWithFields.name}" form.\n\n`;

    if (autoFilledCount > 0) {
      message += `✅ I've auto-filled ${autoFilledCount} field(s) from your profile:\n`;
      for (const [fieldName, value] of Object.entries(autoFilledData)) {
        const field = formWithFields.fields.find(f => f.name === fieldName);
        message += `• ${field?.label || fieldName}: ${value}\n`;
      }
      message += '\nYou can edit these if needed.\n\n';
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
    const prompts = {
      'TEXT': `Please enter your ${field.label.toLowerCase()}.`,
      'SHORT_TEXT': `Please enter your ${field.label.toLowerCase()}.`,
      'LONG_TEXT': `Please provide details for ${field.label.toLowerCase()}.`,
      'EMAIL': `Please enter a valid email address for ${field.label.toLowerCase()}.`,
      'DATE': `Please select the ${field.label.toLowerCase()}.`,
      'NUMBER': `Please enter the ${field.label.toLowerCase()} (numbers only).`,
      'TEXTAREA': `Please provide details for ${field.label.toLowerCase()}.`,
      'SELECT': `Please choose an option for ${field.label.toLowerCase()}.`,
      'DROPDOWN': `Please choose an option for ${field.label.toLowerCase()}.`,
      'RADIO': `Please select one option for ${field.label.toLowerCase()}.`,
      'FILE': `Please upload your ${field.label.toLowerCase()}.`,
      'TIME': `Please select the ${field.label.toLowerCase()}.`,
      'PHONE': `Please enter a phone number for ${field.label.toLowerCase()}.`,
      'URL': `Please enter a URL for ${field.label.toLowerCase()}.`,
      'CHECKBOX': `Do you want to check ${field.label.toLowerCase()}? (yes/no)`,
      'MULTISELECT': `Please select one or more options for ${field.label.toLowerCase()}.`,
    };
    return prompts[fieldType] || `Please fill in the ${field.label.toLowerCase()}.`;
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
      errorMessage = `${currentField.label} is required. Please provide a value.`;
    } else if (processedValue) {
      const fieldType = currentField.field_type || currentField.type;

      switch (fieldType) {
        case 'EMAIL':
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(processedValue)) {
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
          const phoneRegex = /^[\d\s\-\+\(\)]+$/;
          if (!phoneRegex.test(processedValue)) {
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
