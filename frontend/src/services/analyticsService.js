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
   */
  async processQuery(query, context = {}) {
    // Add artificial delay for better UX
    await delay(500 + Math.random() * 500);

    try {
      const response = await api.post('/ai/query/', {
        query: query,
        context: context
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
  }
};

export default analyticsService;
