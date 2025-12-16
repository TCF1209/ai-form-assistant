import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import assistantService from '../../services/assistantService';
import { validateAssistantMessage, getAssistantSuggestions } from '../../utils/inputValidation';

// Icons
const SendIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
  </svg>
);

const MicrophoneIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const XIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const AIIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

// Sparkles icon for AI avatar
const SparklesIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
  </svg>
);

// Helper to get user initials
const getUserInitials = (user) => {
  if (!user) return 'U';
  const firstName = user.first_name || '';
  const lastName = user.last_name || '';
  if (firstName && lastName) {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  }
  if (firstName) return firstName[0].toUpperCase();
  if (user.username) return user.username[0].toUpperCase();
  return 'U';
};

// Helper to get consistent color based on user name
const getUserColor = (user) => {
  if (!user) return 'bg-slate-400';
  const colors = [
    'bg-rose-500', 'bg-pink-500', 'bg-fuchsia-500', 'bg-purple-500',
    'bg-violet-500', 'bg-indigo-500', 'bg-blue-500', 'bg-cyan-500',
    'bg-teal-500', 'bg-emerald-500', 'bg-green-500', 'bg-amber-500'
  ];
  const name = user.username || user.first_name || 'user';
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

const FormIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const EditIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

// Message component
const ChatMessage = ({ message, isUser, user }) => {
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mr-3 shadow-md text-white">
          <SparklesIcon />
        </div>
      )}
      <div
        className={`max-w-[70%] px-4 py-3 rounded-2xl ${
          isUser
            ? 'bg-sky-500 text-white rounded-br-md'
            : 'bg-white text-slate-800 shadow-md rounded-bl-md'
        }`}
      >
        <div className="whitespace-pre-wrap text-sm">{message.content}</div>
        <div className={`text-xs mt-1 ${isUser ? 'text-sky-100' : 'text-slate-400'}`}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center ml-3 shadow-md">
          <span className="text-white text-sm font-bold">{getUserInitials(user)}</span>
        </div>
      )}
    </div>
  );
};

// Form recommendation card component
const FormRecommendationCard = ({ form, onYes, onNo, onFillManually, onFillWithAI, showFillOptions }) => {
  return (
    <div className="bg-white rounded-lg shadow-lg border border-slate-200 p-4 max-w-md mb-4">
      <div className="flex items-start mb-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-sky-100 flex items-center justify-center mr-3">
          <FormIcon />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-slate-800 text-base">{form.name}</h3>
          <p className="text-sm text-slate-600 mt-1">{form.description || 'No description available.'}</p>
          {form.department_name && (
            <p className="text-xs text-sky-600 mt-1">Department: {form.department_name}</p>
          )}
        </div>
      </div>

      {!showFillOptions ? (
        <div className="flex gap-2 mt-4">
          <button
            onClick={onYes}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors font-medium"
          >
            <CheckIcon />
            YES
          </button>
          <button
            onClick={onNo}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
          >
            <XIcon />
            NO, SHOW OTHERS
          </button>
        </div>
      ) : (
        <div className="mt-4">
          <p className="text-sm text-slate-600 mb-3">How would you like to fill this form?</p>
          <div className="flex gap-2">
            <button
              onClick={onFillManually}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-sky-500 text-sky-500 rounded-lg hover:bg-sky-50 transition-colors font-medium"
            >
              <EditIcon />
              Fill Manually
            </button>
            <button
              onClick={onFillWithAI}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors font-medium"
            >
              <AIIcon />
              Fill with AI
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Form list component
const FormListCard = ({ forms, onSelectForm, loading }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg border border-slate-200 p-4 max-w-md mb-4">
        <h3 className="font-bold text-slate-800 mb-3">Loading Forms...</h3>
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
        </div>
      </div>
    );
  }

  if (!forms || forms.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg border border-slate-200 p-4 max-w-md mb-4">
        <h3 className="font-bold text-slate-800 mb-3">No Forms Available</h3>
        <p className="text-sm text-slate-500">There are no forms available at the moment.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg border border-slate-200 p-4 max-w-md mb-4">
      <h3 className="font-bold text-slate-800 mb-3">Available Forms ({forms.length})</h3>
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {forms.map(form => (
          <button
            key={form.id}
            onClick={() => onSelectForm(form)}
            className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-sky-300 hover:bg-sky-50 transition-colors"
          >
            <div className="font-medium text-slate-800 text-sm">{form.name}</div>
            <div className="text-xs text-slate-500 mt-1 line-clamp-2">{form.description || 'No description'}</div>
            {form.department_name && (
              <div className="text-xs text-sky-600 mt-1">{form.department_name}</div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

// AI Form Filling component
const FormFillingCard = ({ form, currentField, onSubmitField, onCancel }) => {
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmitField(inputValue);
    setInputValue('');
  };

  const renderFieldInput = () => {
    const field = currentField;
    const fieldType = field.field_type || field.type; // Support both backend (field_type) and mock (type)
    const commonClasses = "w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500";

    // Helper to get option value/label
    const getOptionValue = (option) => typeof option === 'string' ? option : (option.value || option.label || option);
    const getOptionLabel = (option) => typeof option === 'string' ? option : (option.label || option.value || option);

    switch (fieldType) {
      case 'SELECT':
        return (
          <select
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className={commonClasses}
          >
            <option value="">Select an option</option>
            {field.options?.map((option, idx) => (
              <option key={idx} value={getOptionValue(option)}>{getOptionLabel(option)}</option>
            ))}
          </select>
        );
      case 'RADIO':
        return (
          <div className="space-y-2">
            {field.options?.map((option, idx) => (
              <label key={idx} className="flex items-center">
                <input
                  type="radio"
                  name={field.name}
                  value={getOptionValue(option)}
                  checked={inputValue === getOptionValue(option)}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="h-4 w-4 text-sky-600 focus:ring-sky-500 border-slate-300"
                />
                <span className="ml-2 text-sm text-slate-700">{getOptionLabel(option)}</span>
              </label>
            ))}
          </div>
        );
      case 'MULTISELECT':
        return (
          <select
            multiple
            value={inputValue ? inputValue.split(',') : []}
            onChange={(e) => {
              const values = Array.from(e.target.selectedOptions, opt => opt.value);
              setInputValue(values.join(','));
            }}
            className={commonClasses}
            size={Math.min(field.options?.length || 4, 4)}
          >
            {field.options?.map((option, idx) => (
              <option key={idx} value={getOptionValue(option)}>{getOptionLabel(option)}</option>
            ))}
          </select>
        );
      case 'TEXTAREA':
        return (
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            rows={3}
            className={commonClasses}
            placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
          />
        );
      case 'DATE':
        return (
          <input
            type="date"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className={commonClasses}
          />
        );
      case 'TIME':
        return (
          <input
            type="time"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className={commonClasses}
          />
        );
      case 'DATETIME':
        return (
          <input
            type="datetime-local"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className={commonClasses}
          />
        );
      case 'NUMBER':
        return (
          <input
            type="number"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className={commonClasses}
            placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
          />
        );
      case 'EMAIL':
        return (
          <input
            type="email"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className={commonClasses}
            placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
          />
        );
      case 'PHONE':
        return (
          <input
            type="tel"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className={commonClasses}
            placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
          />
        );
      case 'URL':
        return (
          <input
            type="url"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className={commonClasses}
            placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
          />
        );
      case 'CHECKBOX':
        return (
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={inputValue === 'true' || inputValue === true}
              onChange={(e) => setInputValue(e.target.checked ? 'true' : 'false')}
              className="h-4 w-4 text-sky-600 focus:ring-sky-500 border-slate-300 rounded"
            />
            <span className="ml-2 text-sm text-slate-700">{field.placeholder || 'Yes'}</span>
          </div>
        );
      case 'FILE':
        return (
          <div>
            <input
              type="file"
              onChange={(e) => setInputValue(e.target.files[0]?.name || '')}
              className={commonClasses}
            />
            <p className="text-xs text-slate-500 mt-1">
              Note: File upload is handled separately during form submission
            </p>
          </div>
        );
      case 'RATING':
        return (
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map(rating => (
              <button
                key={rating}
                type="button"
                onClick={() => setInputValue(rating.toString())}
                className={`w-10 h-10 rounded-full border-2 transition-colors ${
                  parseInt(inputValue) >= rating
                    ? 'bg-yellow-400 border-yellow-500 text-yellow-800'
                    : 'bg-white border-slate-300 hover:border-slate-400 text-slate-400'
                }`}
              >
                ★
              </button>
            ))}
          </div>
        );
      default:
        return (
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className={commonClasses}
            placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
          />
        );
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg border border-sky-200 p-4 max-w-md mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center">
            <AIIcon />
          </div>
          <span className="font-medium text-slate-800">AI Form Assistant</span>
        </div>
        <button
          onClick={onCancel}
          className="text-slate-400 hover:text-slate-600"
        >
          <XIcon />
        </button>
      </div>

      <div className="mb-3">
        <div className="text-xs text-sky-600 font-medium mb-1">
          Filling: {form.name}
        </div>
        <label className="block text-sm font-medium text-slate-700">
          {currentField.label}
          {currentField.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      </div>

      <form onSubmit={handleSubmit}>
        {renderFieldInput()}
        <div className="flex gap-2 mt-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors"
          >
            Next
          </button>
        </div>
      </form>
    </div>
  );
};

// Form completion summary component
const FormCompletionCard = ({ form, formData, onSubmit, onEdit, isSubmitting }) => {
  // Helper to display field value
  const displayValue = (field, value) => {
    if (value === undefined || value === null || value === '') return '-';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (value === 'true') return 'Yes';
    if (value === 'false') return 'No';
    return String(value);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg border border-emerald-200 p-4 max-w-md mb-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
          <CheckIcon />
        </div>
        <span className="font-medium text-emerald-700">Form Ready to Submit</span>
      </div>

      <h3 className="font-bold text-slate-800 mb-3">{form.name}</h3>

      <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
        {form.fields.map(field => (
          <div key={field.name || field.id} className="text-sm">
            <span className="text-slate-500">{field.label}:</span>
            <span className="ml-2 text-slate-800">{displayValue(field, formData[field.name])}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          onClick={onEdit}
          disabled={isSubmitting}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          <EditIcon />
          Edit
        </button>
        <button
          onClick={onSubmit}
          disabled={isSubmitting}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Submitting...
            </>
          ) : (
            <>
              <CheckIcon />
              Submit Form
            </>
          )}
        </button>
      </div>
    </div>
  );
};

// Typing indicator component
const TypingIndicator = () => (
  <div className="flex justify-start mb-4">
    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mr-3 shadow-md text-white">
      <SparklesIcon />
    </div>
    <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-md shadow-md">
      <div className="flex gap-1">
        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
      </div>
    </div>
  </div>
);

// Main Smart Assistant component
const SmartAssistant = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // Form recommendation state
  const [currentRecommendation, setCurrentRecommendation] = useState(null);
  const [alternatives, setAlternatives] = useState([]);
  const [showFillOptions, setShowFillOptions] = useState(false);
  const [showFormList, setShowFormList] = useState(false);
  const [formListData, setFormListData] = useState([]);

  // AI form filling state
  const [isFillingForm, setIsFillingForm] = useState(false);
  const [currentForm, setCurrentForm] = useState(null);
  const [currentFieldIndex, setCurrentFieldIndex] = useState(0);
  const [formData, setFormData] = useState({});
  const [showCompletionSummary, setShowCompletionSummary] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formsLoading, setFormsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  // Load chat history on mount
  useEffect(() => {
    const loadHistory = async () => {
      setIsLoadingHistory(true);
      const result = await assistantService.loadChatHistory();

      if (result.success && result.messages && result.messages.length > 0) {
        // Convert backend messages to frontend format
        const loadedMessages = result.messages.map(msg => ({
          content: msg.content,
          isUser: msg.message_type === 'USER',
          timestamp: msg.created_at,
          metadata: msg.metadata
        }));
        setMessages(loadedMessages);
      } else {
        // No history, show welcome message
        const welcomeMessage = assistantService.getWelcomeMessage();
        setMessages([{ ...welcomeMessage, isUser: false }]);
        // Save welcome message to backend
        assistantService.saveMessage(welcomeMessage.content, 'ASSISTANT');
      }
      setIsLoadingHistory(false);
    };

    loadHistory();
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping, currentRecommendation, isFillingForm, showCompletionSummary]);

  // Handle form recommendation confirmation
  const handleYesClick = () => {
    setShowFillOptions(true);
    addMessage({
      content: "Great! This is the form I need.",
      isUser: true,
      timestamp: new Date().toISOString()
    });
    setTimeout(() => {
      addMessage({
        content: "Perfect! Would you like to fill the form manually (I'll take you to the form page) or would you prefer me to help you fill it through our conversation?",
        isUser: false,
        timestamp: new Date().toISOString()
      });
    }, 500);
  };

  // Handle form recommendation rejection
  const handleNoClick = async () => {
    setShowFillOptions(false);
    addMessage({
      content: "No, show me other forms",
      isUser: true,
      timestamp: new Date().toISOString()
    });

    if (alternatives.length > 0) {
      const nextForm = alternatives[0];
      const remainingAlternatives = alternatives.slice(1);
      setCurrentRecommendation(nextForm);
      setAlternatives(remainingAlternatives);

      setTimeout(() => {
        addMessage({
          content: `Here's another option:\n\n**${nextForm.name}**\n\n${nextForm.description || 'No description available.'}\n\nIs this the form you're looking for?`,
          isUser: false,
          timestamp: new Date().toISOString()
        });
      }, 500);
    } else {
      setCurrentRecommendation(null);
      setShowFormList(true);
      setFormsLoading(true);

      setTimeout(() => {
        addMessage({
          content: "I've shown all matching forms. Here's a list of all available forms you can choose from:",
          isUser: false,
          timestamp: new Date().toISOString()
        });
      }, 500);

      try {
        const allForms = await assistantService.getAllForms();
        setFormListData(allForms);
      } catch (error) {
        console.error('Failed to fetch forms:', error);
        setFormListData([]);
        addMessage({
          content: "Sorry, I couldn't load the forms. Please try again.",
          isUser: false,
          timestamp: new Date().toISOString()
        });
      } finally {
        setFormsLoading(false);
      }
    }
  };

  // Handle fill manually
  const handleFillManually = () => {
    if (currentRecommendation) {
      addMessage({
        content: "I'll fill it manually",
        isUser: true,
        timestamp: new Date().toISOString()
      });

      setTimeout(() => {
        addMessage({
          content: `Taking you to the ${currentRecommendation.name} form page. You can complete the form there.`,
          isUser: false,
          timestamp: new Date().toISOString()
        });

        // Navigate to the actual form submission page
        setTimeout(() => {
          navigate(`/forms/${currentRecommendation.id}/submit`);
        }, 1000);
      }, 500);
    }
    resetRecommendationState();
  };

  // State for fields needing input (excluding auto-filled fields)
  const [fieldsNeedingInput, setFieldsNeedingInput] = useState([]);

  // Handle fill with AI
  const handleFillWithAI = async () => {
    if (currentRecommendation) {
      addMessage({
        content: "Help me fill it with AI",
        isUser: true,
        timestamp: new Date().toISOString()
      });

      setIsTyping(true);
      const response = await assistantService.startFormFilling(currentRecommendation);
      setIsTyping(false);

      if (response.type === 'error') {
        addMessage({
          content: response.content,
          isUser: false,
          timestamp: response.timestamp
        });
        return;
      }

      addMessage({
        content: response.content,
        isUser: false,
        timestamp: response.timestamp
      });

      // Use the form from response which has fields loaded
      const formToUse = response.form || currentRecommendation;
      setCurrentForm(formToUse);

      // Handle auto-filled data
      const autoFilledData = response.autoFilledData || {};
      const fieldsToFill = response.fieldsNeedingInput || formToUse.fields || [];

      setFormData(autoFilledData);
      setFieldsNeedingInput(fieldsToFill);
      setCurrentFieldIndex(0);

      // Only enter filling mode if there are fields that need input
      if (fieldsToFill.length > 0) {
        setIsFillingForm(true);
      } else {
        // All fields auto-filled, show completion summary
        setShowCompletionSummary(true);
      }

      resetRecommendationState();
    }
  };

  // Handle form field submission during AI filling
  const handleFieldSubmit = async (value) => {
    // Use fieldsNeedingInput if available, otherwise fall back to all fields
    const fieldsToUse = fieldsNeedingInput.length > 0 ? fieldsNeedingInput : currentForm.fields;
    const currentField = fieldsToUse[currentFieldIndex];

    addMessage({
      content: value || '(empty)',
      isUser: true,
      timestamp: new Date().toISOString()
    });

    setIsTyping(true);
    const response = await assistantService.processFormFillingResponse(value, {
      fillingForm: true,
      currentForm,
      currentFieldIndex,
      formData,
      fieldsNeedingInput: fieldsToUse
    });
    setIsTyping(false);

    if (response.type === 'validation_error') {
      addMessage({
        content: response.content,
        isUser: false,
        timestamp: response.timestamp
      });
    } else if (response.type === 'next_field') {
      setFormData(response.formData);
      setCurrentFieldIndex(response.nextFieldIndex);
      addMessage({
        content: response.content,
        isUser: false,
        timestamp: response.timestamp
      });
    } else if (response.type === 'form_complete') {
      setFormData(response.formData);
      setIsFillingForm(false);
      setShowCompletionSummary(true);
      addMessage({
        content: response.content,
        isUser: false,
        timestamp: response.timestamp
      });
    }
  };

  // Handle cancel form filling
  const handleCancelFilling = () => {
    setIsFillingForm(false);
    setCurrentForm(null);
    setCurrentFieldIndex(0);
    setFormData({});
    addMessage({
      content: "Form filling cancelled. How else can I help you?",
      isUser: false,
      timestamp: new Date().toISOString()
    });
  };

  // Handle form submission
  const handleFormSubmit = async () => {
    addMessage({
      content: "Submitting form...",
      isUser: true,
      timestamp: new Date().toISOString()
    });

    setShowCompletionSummary(false);
    setIsSubmitting(true);

    try {
      const result = await assistantService.submitForm(currentForm.id, formData);

      if (result.success) {
        addMessage({
          content: `Your ${currentForm.name} has been submitted successfully! Submission number: ${result.submission?.submission_number || 'N/A'}\n\nYou can track its status in "My Submissions". Is there anything else I can help you with?`,
          isUser: false,
          timestamp: new Date().toISOString()
        });
        setCurrentForm(null);
        setFormData({});
      } else {
        addMessage({
          content: `Sorry, there was an error submitting your form: ${result.message}\n\nWould you like to try again?`,
          isUser: false,
          timestamp: new Date().toISOString()
        });
        // Show completion summary again so user can retry
        setShowCompletionSummary(true);
      }
    } catch (error) {
      console.error('Form submission error:', error);
      addMessage({
        content: "Sorry, there was an unexpected error submitting your form. Please try again or fill the form manually.",
        isUser: false,
        timestamp: new Date().toISOString()
      });
      setShowCompletionSummary(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle edit form
  const handleEditForm = () => {
    setShowCompletionSummary(false);
    setIsFillingForm(true);
    setCurrentFieldIndex(0);
    addMessage({
      content: "Let's go through the form again. Starting from the beginning.",
      isUser: false,
      timestamp: new Date().toISOString()
    });
  };

  // Handle form selection from list
  const handleSelectForm = (form) => {
    setShowFormList(false);
    setCurrentRecommendation(form);
    setShowFillOptions(false);
    addMessage({
      content: `I want to use: ${form.name}`,
      isUser: true,
      timestamp: new Date().toISOString()
    });

    setTimeout(() => {
      addMessage({
        content: `You selected **${form.name}**.\n\n${form.description}\n\nIs this the correct form?`,
        isUser: false,
        timestamp: new Date().toISOString()
      });
    }, 500);
  };

  // Reset recommendation state
  const resetRecommendationState = () => {
    setCurrentRecommendation(null);
    setAlternatives([]);
    setShowFillOptions(false);
    setShowFormList(false);
  };

  // Add message to chat and save to backend
  const addMessage = (message, saveToBackend = true) => {
    setMessages(prev => [...prev, message]);

    // Save to backend (fire and forget - don't wait)
    if (saveToBackend) {
      assistantService.saveMessage(
        message.content,
        message.isUser ? 'USER' : 'ASSISTANT',
        message.metadata || {}
      );
    }
  };

  // Clear chat history
  const handleClearChat = async () => {
    const result = await assistantService.clearChatHistory();
    if (result.success) {
      // Reset to welcome message
      const welcomeMessage = assistantService.getWelcomeMessage();
      setMessages([{ ...welcomeMessage, isUser: false }]);
      // Save welcome message to new session
      assistantService.saveMessage(welcomeMessage.content, 'ASSISTANT');
      // Reset all states
      resetRecommendationState();
      setIsFillingForm(false);
      setCurrentForm(null);
      setFormData({});
      setShowCompletionSummary(false);
    }
  };

  // Handle send message
  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const messageText = inputValue.trim();

    // Validate input before processing
    const validation = validateAssistantMessage(messageText);

    if (!validation.valid) {
      // Show user's message first
      addMessage({
        content: messageText,
        isUser: true,
        timestamp: new Date().toISOString()
      });
      setInputValue('');

      // Show validation error as AI response
      addMessage({
        content: validation.error,
        isUser: false,
        timestamp: new Date().toISOString()
      });
      return;
    }

    const userMessage = {
      content: messageText,
      isUser: true,
      timestamp: new Date().toISOString()
    };

    addMessage(userMessage);
    setInputValue('');
    resetRecommendationState();

    setIsTyping(true);

    try {
      const response = await assistantService.processMessage(messageText, {
        fillingForm: isFillingForm,
        currentForm,
        currentFieldIndex,
        formData
      });

      setIsTyping(false);

      addMessage({
        content: response.content,
        isUser: false,
        timestamp: response.timestamp
      });

      // Handle different response types
      if (response.type === 'form_recommendation') {
        setCurrentRecommendation(response.recommendedForm);
        setAlternatives(response.alternatives || []);
      } else if (response.type === 'form_list') {
        setShowFormList(true);
        setFormListData(response.forms);
      } else if (response.type === 'no_match') {
        setShowFormList(true);
        setFormListData(response.forms || []);
      } else if (response.type === 'no_forms' || response.type === 'error') {
        // No forms available or error - don't show form list
        setShowFormList(false);
      }
    } catch (error) {
      setIsTyping(false);
      addMessage({
        content: "I'm sorry, I encountered an error. Please try again.",
        isUser: false,
        timestamp: new Date().toISOString()
      });
    }
  };

  // Handle voice input (placeholder for future implementation)
  const handleVoiceInput = () => {
    setIsListening(!isListening);
    // Voice input implementation would go here
    // For now, just toggle the state as a visual indicator
    if (!isListening) {
      setTimeout(() => {
        setIsListening(false);
        addMessage({
          content: "Voice input feature coming soon! Please type your message for now.",
          isUser: false,
          timestamp: new Date().toISOString()
        });
      }, 2000);
    }
  };

  // Handle key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* Header - Fixed at top */}
      <div className="flex-shrink-0 bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md text-white">
              <SparklesIcon />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800">Smart Form Assistant</h1>
              <p className="text-sm text-slate-500">I help you find and complete forms quickly</p>
            </div>
          </div>
          {/* Clear Chat Button */}
          <button
            onClick={handleClearChat}
            className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1"
            title="Start new chat"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            New Chat
          </button>
        </div>
      </div>

      {/* Chat Messages Area - Scrollable */}
      <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
        {/* Loading history indicator */}
        {isLoadingHistory ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
            <span className="ml-3 text-slate-500">Loading chat history...</span>
          </div>
        ) : (
          messages.map((message, index) => (
            <ChatMessage key={index} message={message} isUser={message.isUser} user={user} />
          ))
        )}

        {/* Typing indicator */}
        {isTyping && <TypingIndicator />}

        {/* Form recommendation card */}
        {currentRecommendation && !isFillingForm && !showCompletionSummary && (
          <div className="flex justify-start mb-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center mr-3 invisible">
              <span className="text-white text-sm font-bold">AI</span>
            </div>
            <FormRecommendationCard
              form={currentRecommendation}
              onYes={handleYesClick}
              onNo={handleNoClick}
              onFillManually={handleFillManually}
              onFillWithAI={handleFillWithAI}
              showFillOptions={showFillOptions}
            />
          </div>
        )}

        {/* Form list */}
        {showFormList && (
          <div className="flex justify-start mb-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center mr-3 invisible">
              <span className="text-white text-sm font-bold">AI</span>
            </div>
            <FormListCard forms={formListData} onSelectForm={handleSelectForm} loading={formsLoading} />
          </div>
        )}

        {/* AI Form filling card */}
        {isFillingForm && currentForm && (
          <div className="flex justify-start mb-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center mr-3 invisible">
              <span className="text-white text-sm font-bold">AI</span>
            </div>
            <FormFillingCard
              form={currentForm}
              currentField={(fieldsNeedingInput.length > 0 ? fieldsNeedingInput : currentForm.fields)[currentFieldIndex]}
              onSubmitField={handleFieldSubmit}
              onCancel={handleCancelFilling}
            />
          </div>
        )}

        {/* Form completion summary */}
        {showCompletionSummary && currentForm && (
          <div className="flex justify-start mb-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center mr-3 invisible">
              <span className="text-white text-sm font-bold">AI</span>
            </div>
            <FormCompletionCard
              form={currentForm}
              formData={formData}
              onSubmit={handleFormSubmit}
              onEdit={handleEditForm}
            />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - Fixed at bottom */}
      <div className="flex-shrink-0 bg-white border-t border-slate-200 px-6 py-4">
        {/* Quick suggestions - show only when starting fresh */}
        {messages.length <= 1 && !isFillingForm && (
          <div className="mb-3">
            <p className="text-xs text-slate-500 mb-2">Quick suggestions:</p>
            <div className="flex flex-wrap gap-2">
              {getAssistantSuggestions().slice(0, 4).map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setInputValue(suggestion);
                    inputRef.current?.focus();
                  }}
                  className="px-3 py-1.5 text-sm bg-sky-50 text-sky-700 rounded-full hover:bg-sky-100 transition-colors border border-sky-200"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="w-full px-4 py-3 border border-slate-300 rounded-full focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 pr-12"
              disabled={isFillingForm}
            />
            <button
              onClick={handleVoiceInput}
              className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-2 rounded-full transition-colors ${
                isListening ? 'bg-red-100 text-red-500' : 'text-slate-400 hover:text-slate-600'
              }`}
              title="Voice input (coming soon)"
            >
              <MicrophoneIcon />
            </button>
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isFillingForm}
            className="p-3 bg-sky-500 text-white rounded-full hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <SendIcon />
          </button>
        </div>
        <p className="text-xs text-slate-400 text-center mt-2">
          Press Enter to send or click the microphone for voice input
        </p>
      </div>
    </div>
  );
};

export default SmartAssistant;
