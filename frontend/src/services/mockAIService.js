/**
 * Mock AI Service for Smart Assistant
 * Provides conversational chat functionality with form recommendations
 * This will be replaced with actual OpenAI integration in Step 3
 */

// Mock form database that matches the system's forms
const mockForms = [
  {
    id: 'form-leave-medical',
    name: 'Medical Leave Application',
    description: 'Apply for medical leave with supporting documentation. Required fields include dates, reason, and medical certificate upload.',
    keywords: ['medical', 'sick', 'health', 'doctor', 'hospital', 'illness', 'unwell', 'mc'],
    category: 'leave',
    fields: [
      { name: 'employee_name', label: 'Employee Name', type: 'TEXT', required: true },
      { name: 'start_date', label: 'Start Date', type: 'DATE', required: true },
      { name: 'end_date', label: 'End Date', type: 'DATE', required: true },
      { name: 'reason', label: 'Reason for Leave', type: 'TEXTAREA', required: true },
      { name: 'medical_certificate', label: 'Medical Certificate', type: 'FILE', required: true },
    ]
  },
  {
    id: 'form-leave-annual',
    name: 'Annual Leave Application',
    description: 'Request annual leave or vacation days. Plan your time off and submit for manager approval.',
    keywords: ['annual', 'vacation', 'holiday', 'time off', 'rest', 'leave'],
    category: 'leave',
    fields: [
      { name: 'employee_name', label: 'Employee Name', type: 'TEXT', required: true },
      { name: 'start_date', label: 'Start Date', type: 'DATE', required: true },
      { name: 'end_date', label: 'End Date', type: 'DATE', required: true },
      { name: 'days_requested', label: 'Number of Days', type: 'NUMBER', required: true },
      { name: 'reason', label: 'Purpose of Leave', type: 'TEXTAREA', required: false },
    ]
  },
  {
    id: 'form-leave-emergency',
    name: 'Emergency Leave Application',
    description: 'For urgent and unforeseen circumstances requiring immediate time off work.',
    keywords: ['emergency', 'urgent', 'family', 'death', 'accident', 'crisis'],
    category: 'leave',
    fields: [
      { name: 'employee_name', label: 'Employee Name', type: 'TEXT', required: true },
      { name: 'start_date', label: 'Start Date', type: 'DATE', required: true },
      { name: 'end_date', label: 'End Date', type: 'DATE', required: true },
      { name: 'emergency_type', label: 'Type of Emergency', type: 'SELECT', required: true, options: ['Family Emergency', 'Medical Emergency', 'Personal Emergency', 'Other'] },
      { name: 'description', label: 'Brief Description', type: 'TEXTAREA', required: true },
    ]
  },
  {
    id: 'form-expense-travel',
    name: 'Travel Expense Claim',
    description: 'Submit claims for business travel expenses including transportation, accommodation, and meals.',
    keywords: ['travel', 'expense', 'claim', 'trip', 'business trip', 'reimbursement', 'transportation'],
    category: 'expense',
    fields: [
      { name: 'employee_name', label: 'Employee Name', type: 'TEXT', required: true },
      { name: 'travel_date', label: 'Travel Date', type: 'DATE', required: true },
      { name: 'destination', label: 'Destination', type: 'TEXT', required: true },
      { name: 'purpose', label: 'Purpose of Travel', type: 'TEXTAREA', required: true },
      { name: 'total_amount', label: 'Total Amount (RM)', type: 'NUMBER', required: true },
      { name: 'receipts', label: 'Upload Receipts', type: 'FILE', required: true },
    ]
  },
  {
    id: 'form-expense-general',
    name: 'General Expense Reimbursement',
    description: 'Claim reimbursement for work-related expenses such as supplies, equipment, or subscriptions.',
    keywords: ['expense', 'reimbursement', 'claim', 'purchase', 'buy', 'money', 'cost'],
    category: 'expense',
    fields: [
      { name: 'employee_name', label: 'Employee Name', type: 'TEXT', required: true },
      { name: 'expense_date', label: 'Date of Expense', type: 'DATE', required: true },
      { name: 'category', label: 'Expense Category', type: 'SELECT', required: true, options: ['Office Supplies', 'Equipment', 'Software/Subscriptions', 'Training', 'Other'] },
      { name: 'description', label: 'Description', type: 'TEXTAREA', required: true },
      { name: 'amount', label: 'Amount (RM)', type: 'NUMBER', required: true },
      { name: 'receipt', label: 'Receipt/Invoice', type: 'FILE', required: true },
    ]
  },
  {
    id: 'form-request-equipment',
    name: 'Equipment Request Form',
    description: 'Request new equipment or replacement of existing office equipment such as laptops, monitors, or peripherals.',
    keywords: ['equipment', 'laptop', 'computer', 'monitor', 'keyboard', 'mouse', 'hardware', 'device'],
    category: 'request',
    fields: [
      { name: 'employee_name', label: 'Employee Name', type: 'TEXT', required: true },
      { name: 'department', label: 'Department', type: 'TEXT', required: true },
      { name: 'equipment_type', label: 'Equipment Type', type: 'SELECT', required: true, options: ['Laptop', 'Desktop', 'Monitor', 'Keyboard', 'Mouse', 'Headset', 'Other'] },
      { name: 'reason', label: 'Reason for Request', type: 'TEXTAREA', required: true },
      { name: 'urgency', label: 'Urgency Level', type: 'RADIO', required: true, options: ['Low', 'Medium', 'High'] },
    ]
  },
  {
    id: 'form-request-training',
    name: 'Training Request Form',
    description: 'Apply for professional training, courses, or certifications to enhance your skills.',
    keywords: ['training', 'course', 'learn', 'certification', 'skill', 'workshop', 'seminar', 'education'],
    category: 'request',
    fields: [
      { name: 'employee_name', label: 'Employee Name', type: 'TEXT', required: true },
      { name: 'training_name', label: 'Training/Course Name', type: 'TEXT', required: true },
      { name: 'provider', label: 'Training Provider', type: 'TEXT', required: true },
      { name: 'start_date', label: 'Start Date', type: 'DATE', required: true },
      { name: 'end_date', label: 'End Date', type: 'DATE', required: true },
      { name: 'cost', label: 'Estimated Cost (RM)', type: 'NUMBER', required: true },
      { name: 'benefits', label: 'Expected Benefits', type: 'TEXTAREA', required: true },
    ]
  },
  {
    id: 'form-request-overtime',
    name: 'Overtime Request Form',
    description: 'Submit requests for overtime work with justification and expected hours.',
    keywords: ['overtime', 'ot', 'extra hours', 'work late', 'additional hours'],
    category: 'request',
    fields: [
      { name: 'employee_name', label: 'Employee Name', type: 'TEXT', required: true },
      { name: 'date', label: 'Date', type: 'DATE', required: true },
      { name: 'start_time', label: 'Start Time', type: 'TIME', required: true },
      { name: 'end_time', label: 'End Time', type: 'TIME', required: true },
      { name: 'reason', label: 'Reason for Overtime', type: 'TEXTAREA', required: true },
    ]
  },
];

// Welcome messages
const welcomeMessages = [
  "Welcome to the Smart Form Assistant! I'm here to help you quickly find and complete forms.",
  "I can help you with:",
  "• Finding the right form for your needs",
  "• Guiding you through the form filling process",
  "• Answering questions about form requirements",
  "",
  "Try saying something like:",
  "• \"I want to apply for medical leave\"",
  "• \"I need to submit an expense claim\"",
  "• \"Show me all leave forms\""
];

// AI response templates
const responseTemplates = {
  formFound: (form) => `I found a form that might help you:\n\n**${form.name}**\n\n${form.description}\n\nIs this the form you're looking for?`,
  multipleFormsFound: (forms) => `I found ${forms.length} forms that might match your needs. Let me show you the most relevant one first.`,
  noFormFound: "I couldn't find a specific form matching your request. Would you like me to show you all available forms?",
  showAllForms: "Here are all the available forms you can access:",
  fillAssist: (form, fieldIndex, field) => {
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
    };
    return prompts[field.type] || `Please fill in the ${field.label.toLowerCase()}.`;
  },
  confirmFill: (form) => `Great! I'll help you fill out the "${form.name}" form step by step. Let's begin!`,
  fieldComplete: "Got it! Moving on to the next question.",
  allFieldsComplete: "Excellent! You've provided all the required information. Let me prepare your form submission.",
  greeting: "Hello! How can I help you today? I can help you find forms, submit requests, or answer questions about our form system.",
  thanks: "You're welcome! Is there anything else I can help you with?",
  goodbye: "Goodbye! Feel free to come back anytime you need help with forms.",
};

// Helper function to calculate relevance score
const calculateRelevance = (query, form) => {
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/);

  let score = 0;

  // Check keywords
  form.keywords.forEach(keyword => {
    if (queryLower.includes(keyword)) {
      score += 10;
    }
    queryWords.forEach(word => {
      if (keyword.includes(word) || word.includes(keyword)) {
        score += 5;
      }
    });
  });

  // Check form name
  if (form.name.toLowerCase().includes(queryLower)) {
    score += 15;
  }
  queryWords.forEach(word => {
    if (form.name.toLowerCase().includes(word)) {
      score += 3;
    }
  });

  // Check description
  queryWords.forEach(word => {
    if (form.description.toLowerCase().includes(word)) {
      score += 2;
    }
  });

  return score;
};

// Simulate typing delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Mock AI Service
 */
const mockAIService = {
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
   * Process user message and return AI response
   * @param {string} message - User's message
   * @param {object} context - Conversation context (current form, filling state, etc.)
   */
  async processMessage(message, context = {}) {
    // Simulate AI processing delay (300-800ms)
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

    // If in form filling mode
    if (context.fillingForm && context.currentForm && context.currentFieldIndex !== undefined) {
      return this.processFormFillingResponse(message, context);
    }

    // Check for "show all forms" request
    if (/show\s*(all|me)?\s*forms?|list\s*forms?|available\s*forms?|what\s*forms?/i.test(messageLower)) {
      return {
        type: 'form_list',
        content: responseTemplates.showAllForms,
        forms: mockForms,
        timestamp: new Date().toISOString(),
      };
    }

    // Search for matching forms
    const scoredForms = mockForms.map(form => ({
      ...form,
      score: calculateRelevance(message, form)
    })).filter(form => form.score > 0).sort((a, b) => b.score - a.score);

    if (scoredForms.length > 0) {
      const bestMatch = scoredForms[0];
      const alternatives = scoredForms.slice(1, 4); // Get up to 3 alternatives

      return {
        type: 'form_recommendation',
        content: scoredForms.length > 1
          ? responseTemplates.multipleFormsFound(scoredForms)
          : responseTemplates.formFound(bestMatch),
        recommendedForm: bestMatch,
        alternatives: alternatives,
        timestamp: new Date().toISOString(),
      };
    }

    // No match found
    return {
      type: 'no_match',
      content: responseTemplates.noFormFound,
      timestamp: new Date().toISOString(),
    };
  },

  /**
   * Process response during form filling mode
   */
  async processFormFillingResponse(message, context) {
    const { currentForm, currentFieldIndex, formData } = context;
    const currentField = currentForm.fields[currentFieldIndex];

    // Validate and store the response
    const newFormData = { ...formData };

    // Basic validation based on field type
    let isValid = true;
    let errorMessage = '';

    if (currentField.required && !message.trim()) {
      isValid = false;
      errorMessage = `${currentField.label} is required. Please provide a value.`;
    } else if (currentField.type === 'EMAIL' && message.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(message.trim())) {
        isValid = false;
        errorMessage = 'Please enter a valid email address.';
      }
    } else if (currentField.type === 'NUMBER' && message.trim()) {
      if (isNaN(parseFloat(message))) {
        isValid = false;
        errorMessage = 'Please enter a valid number.';
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

    // Store the value
    newFormData[currentField.name] = message.trim();

    // Check if there are more fields
    const nextFieldIndex = currentFieldIndex + 1;
    if (nextFieldIndex < currentForm.fields.length) {
      const nextField = currentForm.fields[nextFieldIndex];
      return {
        type: 'next_field',
        content: responseTemplates.fieldComplete + '\n\n' + responseTemplates.fillAssist(currentForm, nextFieldIndex, nextField),
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

    const firstField = form.fields[0];
    return {
      type: 'start_filling',
      content: responseTemplates.confirmFill(form) + '\n\n' + responseTemplates.fillAssist(form, 0, firstField),
      form,
      currentFieldIndex: 0,
      currentField: firstField,
      timestamp: new Date().toISOString(),
    };
  },

  /**
   * Get all available forms
   */
  getAllForms() {
    return mockForms;
  },

  /**
   * Get form by ID
   */
  getFormById(id) {
    return mockForms.find(form => form.id === id);
  },

  /**
   * Search forms by query
   */
  searchForms(query) {
    return mockForms
      .map(form => ({
        ...form,
        score: calculateRelevance(query, form)
      }))
      .filter(form => form.score > 0)
      .sort((a, b) => b.score - a.score);
  }
};

export default mockAIService;
