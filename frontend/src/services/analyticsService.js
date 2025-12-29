/**
 * Analytics Service for Natural Language Query Analytics
 * Connects to the backend AI integration API for analytics queries
 */

import api from './api';

// Suggested queries for users
const SUGGESTED_QUERIES = [
  "How many leave requests were submitted last month?",
  "Show me pending forms in each department",
  "Which department has the most submissions?",
  "What's the average approval time?",
  "Show me the status breakdown of all forms",
  "How many expense claims were submitted?",
  "Show me submission trends over time"
];

// Welcome messages for analytics assistant
const welcomeMessages = [
  "Welcome to Analytics Query! I can help you explore your forms data using natural language.",
  "",
  "Try asking questions like:",
  "- \"How many leave requests were submitted last month?\"",
  "- \"Show me pending forms in HR department\"",
  "- \"Which department has the most submissions?\"",
  "- \"What's the average approval time?\"",
  "",
  "I'll analyze your data and show you the results in an easy-to-understand format."
];

// Simulate typing delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Analytics Service
 */
const analyticsService = {
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
   * Get suggested queries
   */
  getSuggestedQueries() {
    return SUGGESTED_QUERIES;
  },

  /**
   * Process an analytics query
   * @param {string} query - Natural language query
   * @param {object} context - Optional context
   * @param {Array} conversationHistory - Recent conversation messages for context
   */
  async processQuery(query, context = {}, conversationHistory = []) {
    // Add artificial delay for better UX
    await delay(300 + Math.random() * 300);

    // Note: Greetings, thanks, and help requests are now handled by backend AI
    // This allows multi-language support (Chinese, Malay, etc.)

    // Extract last few meaningful messages for context (user + assistant pairs)
    const recentHistory = conversationHistory
      .filter(msg => !msg.isAnalyticsResult || msg.summary || msg.interpretation)
      .slice(-6)  // Last 6 messages (about 3 exchanges)
      .map(msg => ({
        role: msg.isUser ? 'user' : 'assistant',
        content: msg.isUser ? msg.content : (msg.summary || msg.interpretation || msg.content || '')
      }))
      .filter(msg => msg.content && msg.content.trim().length > 0);  // Filter out empty messages

    try {
      const response = await api.post('/ai/query/', {
        query: query,
        context: context,
        conversation_history: recentHistory
      });

      return {
        type: 'analytics_result',
        content: response.data.interpretation,
        interpretation: response.data.interpretation,
        filters: response.data.filters || {},
        aggregation: response.data.aggregation,
        visualization: response.data.visualization,
        data: response.data.data || [],
        summary: response.data.summary,
        query_metadata: response.data.query_metadata || null,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Analytics query failed:', error);

      // Handle specific error responses
      if (error.response?.status === 403) {
        return {
          type: 'error',
          content: error.response.data?.error || 'You do not have permission to access analytics.',
          timestamp: new Date().toISOString(),
        };
      }

      if (error.response?.status === 429) {
        return {
          type: 'error',
          content: 'You\'re sending too many requests. Please wait a moment and try again.',
          timestamp: new Date().toISOString(),
        };
      }

      return {
        type: 'error',
        content: 'Sorry, I encountered an error processing your query. Please try again.',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  },

  /**
   * Format data for display
   * @param {object} result - Analytics result
   */
  formatResultForDisplay(result) {
    if (!result.data || result.data.length === 0) {
      return null;
    }

    // Return structured data based on visualization type
    switch (result.visualization) {
      case 'number':
        return {
          type: 'metric',
          data: result.data
        };
      case 'bar':
        return {
          type: 'bar_chart',
          data: result.data
        };
      case 'line':
        return {
          type: 'line_chart',
          data: result.data
        };
      case 'pie':
        return {
          type: 'pie_chart',
          data: result.data
        };
      case 'cards':
        return {
          type: 'stat_cards',
          data: result.data
        };
      default:
        return {
          type: 'table',
          data: result.data
        };
    }
  },

  // ============================================
  // Chat History Methods
  // ============================================

  /**
   * Load chat history from backend
   * @returns {Promise<object>} - Current session with messages
   */
  async loadChatHistory() {
    try {
      const response = await api.get('/ai/analytics-history/current/');
      return {
        success: true,
        session: response.data,
        messages: response.data.messages || []
      };
    } catch (error) {
      console.error('Failed to load analytics history:', error);
      return {
        success: false,
        session: null,
        messages: [],
        error: error.message
      };
    }
  },

  /**
   * Save a single message to the current session
   * @param {string} content - Message content
   * @param {string} messageType - 'USER' or 'ASSISTANT'
   * @param {object} metadata - Additional data (visualization, data, etc.)
   */
  async saveMessage(content, messageType = 'USER', metadata = {}) {
    try {
      const response = await api.post('/ai/analytics-history/add_message/', {
        content,
        message_type: messageType,
        metadata
      });
      return {
        success: true,
        message: response.data
      };
    } catch (error) {
      console.error('Failed to save analytics message:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Save multiple messages at once (batch save)
   * @param {Array} messages - Array of message objects
   */
  async saveMessages(messages) {
    try {
      const response = await api.post('/ai/analytics-history/add_messages/', {
        messages: messages.map(msg => ({
          content: msg.content,
          message_type: msg.messageType || msg.message_type || 'USER',
          metadata: msg.metadata || {}
        }))
      });
      return {
        success: true,
        createdCount: response.data.created_count
      };
    } catch (error) {
      console.error('Failed to save analytics messages:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Clear chat history and start a new session
   */
  async clearChatHistory() {
    try {
      const response = await api.post('/ai/analytics-history/clear/');
      return {
        success: true,
        sessionId: response.data.session_id
      };
    } catch (error) {
      console.error('Failed to clear analytics history:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Get all past analytics sessions
   */
  async getChatSessions() {
    try {
      const response = await api.get('/ai/analytics-history/history/');
      return {
        success: true,
        sessions: response.data
      };
    } catch (error) {
      console.error('Failed to get analytics sessions:', error);
      return {
        success: false,
        sessions: [],
        error: error.message
      };
    }
  },

  /**
   * Switch to a different session
   * @param {string} sessionId - Session ID to activate
   */
  async switchSession(sessionId) {
    try {
      const response = await api.post(`/ai/analytics-history/${sessionId}/activate/`);
      return {
        success: true,
        session: response.data
      };
    } catch (error) {
      console.error('Failed to switch analytics session:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
};

export default analyticsService;
