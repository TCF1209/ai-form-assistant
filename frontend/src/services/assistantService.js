/**
 * Assistant Service for Smart Assistant
 * Connects to real backend for forms while using mock AI for conversations
 * Will be upgraded to use OpenAI when API key is available
 */

import api from './api';

// Keyword mappings for form recommendations (mock AI logic)
const KEYWORD_MAPPINGS = {
  leave: ['leave', 'time off', 'vacation', 'holiday', 'absence', 'day off', 'off work'],
  medical: ['medical', 'sick', 'health', 'doctor', 'hospital', 'illness', 'unwell', 'mc', 'clinic'],
  annual: ['annual', 'vacation', 'holiday', 'rest', 'break'],
  emergency: ['emergency', 'urgent', 'family', 'death', 'accident', 'crisis', 'immediate'],
  expense: ['expense', 'claim', 'reimbursement', 'money', 'cost', 'payment', 'receipt'],
  travel: ['travel', 'trip', 'business trip', 'transportation', 'flight', 'hotel', 'accommodation'],
  equipment: ['equipment', 'laptop', 'computer', 'monitor', 'keyboard', 'mouse', 'hardware', 'device', 'phone'],
  training: ['training', 'course', 'learn', 'certification', 'skill', 'workshop', 'seminar', 'education'],
  overtime: ['overtime', 'ot', 'extra hours', 'work late', 'additional hours'],
  request: ['request', 'apply', 'application', 'submit', 'need', 'want'],
};

// Welcome messages
const welcomeMessages = [
  "Welcome to the Smart Form Assistant! I'm here to help you quickly find and complete forms.",
  "I can help you with:",
  "- Finding the right form for your needs",
  "- Guiding you through the form filling process",
  "- Answering questions about form requirements",
  "",
  "Try saying something like:",
  "- \"I want to apply for medical leave\"",
  "- \"I need to submit an expense claim\"",
  "- \"Show me all available forms\""
];

// AI response templates
const responseTemplates = {
  formFound: (form) => `I found a form that might help you:\n\n**${form.name}**\n\n${form.description || 'No description available.'}\n\nIs this the form you're looking for?`,
  multipleFormsFound: (count) => `I found ${count} forms that might match your needs. Let me show you the most relevant one first.`,
  noFormFound: "I couldn't find a specific form matching your request. Would you like me to show you all available forms?",
  showAllForms: "Here are all the available forms you can access:",
  fillAssist: (form, field) => {
    const prompts = {
      'TEXT': `Please enter your ${field.label.toLowerCase()}.`,
      'EMAIL': `Please enter a valid email address for ${field.label.toLowerCase()}.`,
      'DATE': `Please select the ${field.label.toLowerCase()}.`,
      'NUMBER': `Please enter the ${field.label.toLowerCase()} (numbers only).`,
      'TEXTAREA': `Please provide details for ${field.label.toLowerCase()}.`,
      'SELECT': `Please choose an option for ${field.label.toLowerCase()}.`,
      'RADIO': `Please select one option for ${field.label.toLowerCase()}.`,
      'FILE': `Please upload your ${field.label.toLowerCase()}.`,
      'TIME': `Please select the ${field.label.toLowerCase()}.`,
      'PHONE': `Please enter a phone number for ${field.label.toLowerCase()}.`,
      'URL': `Please enter a URL for ${field.label.toLowerCase()}.`,
      'CHECKBOX': `Do you want to check ${field.label.toLowerCase()}? (yes/no)`,
      'MULTISELECT': `Please select one or more options for ${field.label.toLowerCase()}.`,
    };
    return prompts[field.field_type] || `Please fill in the ${field.label.toLowerCase()}.`;
  },
  confirmFill: (form) => `Great! I'll help you fill out the "${form.name}" form step by step. Let's begin!`,
  fieldComplete: "Got it! Moving on to the next question.",
  allFieldsComplete: "Excellent! You've provided all the required information. Let me prepare your form submission.",
  greeting: "Hello! How can I help you today? I can help you find forms, submit requests, or answer questions about our form system.",
  thanks: "You're welcome! Is there anything else I can help you with?",
  goodbye: "Goodbye! Feel free to come back anytime you need help with forms.",
  error: "I'm sorry, I encountered an error. Please try again.",
  noForms: "There are no forms available at the moment. Please contact your administrator.",
};

// Simulate typing delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Calculate relevance score between query and form
 */
const calculateRelevance = (query, form) => {
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/);

  let score = 0;

  // Check against keyword mappings
  Object.entries(KEYWORD_MAPPINGS).forEach(([category, keywords]) => {
    keywords.forEach(keyword => {
      if (queryLower.includes(keyword)) {
        // Check if form name or description contains the category
        const formText = `${form.name} ${form.description || ''}`.toLowerCase();
        if (formText.includes(category) || formText.includes(keyword)) {
          score += 15;
        }
      }
    });
  });

  // Check form name directly
  queryWords.forEach(word => {
    if (word.length > 2) { // Skip short words
      if (form.name.toLowerCase().includes(word)) {
        score += 10;
      }
      if (form.description && form.description.toLowerCase().includes(word)) {
        score += 5;
      }
      if (form.code && form.code.toLowerCase().includes(word)) {
        score += 3;
      }
    }
  });

  return score;
};

/**
 * Assistant Service - connects to real backend
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
   * Fetch all available forms from backend
   * Only fetches ACTIVE forms (as per backend logic for USER role)
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
      // Handle both array and paginated response
      const forms = response.data.results || response.data;

      // Transform forms to include fields info
      const formsWithFields = await Promise.all(
        forms.map(async (form) => {
          try {
            // Fetch fields for each form
            const fieldsResponse = await api.get(`/forms/${form.id}/fields/`);
            const fields = fieldsResponse.data || [];

            return {
              ...form,
              fields: fields.sort((a, b) => a.order - b.order),
            };
          } catch (err) {
            console.error(`Failed to fetch fields for form ${form.id}:`, err);
            return {
              ...form,
              fields: [],
            };
          }
        })
      );

      // Cache the result
      this._formsCache = formsWithFields;
      this._formsCacheTime = Date.now();

      return formsWithFields;
    } catch (error) {
      console.error('Failed to fetch forms:', error);
      // Return cached data if available, even if expired
      if (this._formsCache) {
        return this._formsCache;
      }
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
   * Process user message and return AI response
   * Uses mock AI logic for now (keyword matching)
   * @param {string} message - User's message
   * @param {object} context - Conversation context
   */
  async processMessage(message, context = {}) {
    // Simulate AI processing delay
    await delay(300 + Math.random() * 500);

    const messageLower = message.toLowerCase().trim();

    // Check for greetings
    if (/^(hi|hello|hey|good morning|good afternoon|good evening)/i.test(messageLower)) {
      return {
        type: 'text',
        content: responseTemplates.greeting,
        timestamp: new Date().toISOString(),
      };
    }

    // Check for thanks
    if (/^(thank|thanks|thx|ty|appreciate)/i.test(messageLower)) {
      return {
        type: 'text',
        content: responseTemplates.thanks,
        timestamp: new Date().toISOString(),
      };
    }

    // Check for goodbye
    if (/^(bye|goodbye|see you|exit|quit)/i.test(messageLower)) {
      return {
        type: 'text',
        content: responseTemplates.goodbye,
        timestamp: new Date().toISOString(),
      };
    }

    // If in form filling mode, process field response
    if (context.fillingForm && context.currentForm && context.currentFieldIndex !== undefined) {
      return this.processFormFillingResponse(message, context);
    }

    // Fetch forms from backend
    let forms;
    try {
      forms = await this.fetchForms();
    } catch (error) {
      return {
        type: 'error',
        content: responseTemplates.error + ' Unable to fetch forms.',
        timestamp: new Date().toISOString(),
      };
    }

    if (!forms || forms.length === 0) {
      return {
        type: 'no_forms',
        content: responseTemplates.noForms,
        timestamp: new Date().toISOString(),
      };
    }

    // Check for "show all forms" request
    if (/show\s*(all|me)?\s*forms?|list\s*forms?|available\s*forms?|what\s*forms?/i.test(messageLower)) {
      return {
        type: 'form_list',
        content: responseTemplates.showAllForms,
        forms: forms,
        timestamp: new Date().toISOString(),
      };
    }

    // Search for matching forms using keyword matching
    const scoredForms = forms.map(form => ({
      ...form,
      score: calculateRelevance(message, form)
    })).filter(form => form.score > 0).sort((a, b) => b.score - a.score);

    if (scoredForms.length > 0) {
      const bestMatch = scoredForms[0];
      const alternatives = scoredForms.slice(1, 4); // Up to 3 alternatives

      return {
        type: 'form_recommendation',
        content: scoredForms.length > 1
          ? responseTemplates.multipleFormsFound(scoredForms.length)
          : responseTemplates.formFound(bestMatch),
        recommendedForm: bestMatch,
        alternatives: alternatives,
        timestamp: new Date().toISOString(),
      };
    }

    // No match found - show all forms
    return {
      type: 'no_match',
      content: responseTemplates.noFormFound,
      forms: forms,
      timestamp: new Date().toISOString(),
    };
  },

  /**
   * Process response during form filling mode
   */
  async processFormFillingResponse(message, context) {
    const { currentForm, currentFieldIndex, formData } = context;
    const currentField = currentForm.fields[currentFieldIndex];

    // Store the response
    const newFormData = { ...formData };

    // Basic validation based on field type
    let isValid = true;
    let errorMessage = '';
    let processedValue = message.trim();

    if (currentField.required && !processedValue) {
      isValid = false;
      errorMessage = `${currentField.label} is required. Please provide a value.`;
    } else if (processedValue) {
      switch (currentField.field_type) {
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
          // Convert yes/no to boolean
          processedValue = /^(yes|y|true|1|check|checked)$/i.test(processedValue);
          break;
        case 'SELECT':
        case 'RADIO':
          // Validate against options if available
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

    // Find next required field or any remaining field
    const nextFieldIndex = currentFieldIndex + 1;
    if (nextFieldIndex < currentForm.fields.length) {
      const nextField = currentForm.fields[nextFieldIndex];
      return {
        type: 'next_field',
        content: responseTemplates.fieldComplete + '\n\n' + responseTemplates.fillAssist(currentForm, nextField),
        nextFieldIndex,
        formData: newFormData,
        nextField,
        timestamp: new Date().toISOString(),
      };
    }

    // All fields complete
    return {
      type: 'form_complete',
      content: responseTemplates.allFieldsComplete,
      formData: newFormData,
      timestamp: new Date().toISOString(),
    };
  },

  /**
   * Start form filling process
   */
  async startFormFilling(form) {
    await delay(300 + Math.random() * 300);

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

    const firstField = formWithFields.fields[0];
    return {
      type: 'start_filling',
      content: responseTemplates.confirmFill(formWithFields) + '\n\n' + responseTemplates.fillAssist(formWithFields, firstField),
      form: formWithFields,
      currentFieldIndex: 0,
      currentField: firstField,
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
   * Save form as draft
   */
  async saveDraft(formId, formData) {
    try {
      const response = await api.post('/submissions/', {
        form: formId,
        status: 'DRAFT',
        data: formData,
      });
      return {
        success: true,
        submission: response.data,
        message: 'Draft saved successfully!',
      };
    } catch (error) {
      console.error('Failed to save draft:', error);
      return {
        success: false,
        message: error.response?.data?.detail || 'Failed to save draft. Please try again.',
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
   * Search forms by query
   */
  async searchForms(query) {
    const forms = await this.fetchForms();
    return forms
      .map(form => ({
        ...form,
        score: calculateRelevance(query, form)
      }))
      .filter(form => form.score > 0)
      .sort((a, b) => b.score - a.score);
  },

  /**
   * Clear forms cache
   */
  clearCache() {
    this._formsCache = null;
    this._formsCacheTime = null;
  }
};

export default assistantService;
