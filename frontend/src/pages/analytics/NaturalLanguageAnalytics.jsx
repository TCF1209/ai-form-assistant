import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import analyticsService from '../../services/analyticsService';

// Icons
const SendIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
  </svg>
);

const ChartBarIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const DocumentIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const ClockIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const TrendUpIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

// Message component
const ChatMessage = ({ message, isUser }) => {
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center mr-3">
          <ChartBarIcon />
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
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-300 flex items-center justify-center ml-3">
          <span className="text-slate-600 text-sm font-bold">U</span>
        </div>
      )}
    </div>
  );
};

// Typing indicator component
const TypingIndicator = () => (
  <div className="flex justify-start mb-4">
    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center mr-3">
      <ChartBarIcon />
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

// Metric Card component
const MetricCard = ({ label, value, unit, trend, icon }) => {
  const getIcon = () => {
    switch (icon) {
      case 'document':
        return <DocumentIcon />;
      case 'clock':
        return <ClockIcon />;
      case 'check':
        return <CheckIcon />;
      default:
        return <ChartBarIcon />;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 border border-slate-200">
      <div className="flex items-center justify-between mb-2">
        <span className="text-slate-500 text-sm">{label}</span>
        <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center text-sky-500">
          {getIcon()}
        </div>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold text-slate-800">
          {unit === '$' ? `$${value.toLocaleString()}` : value}
        </span>
        {unit && unit !== '$' && <span className="text-slate-500 text-sm">{unit}</span>}
      </div>
      {trend && (
        <div className="flex items-center gap-1 mt-2 text-emerald-500 text-sm">
          <TrendUpIcon />
          <span>{trend}</span>
        </div>
      )}
    </div>
  );
};

// Bar Chart component (simple implementation)
const BarChart = ({ data }) => {
  const maxValue = Math.max(...data.map(d => d.submissions || d.pending || d.value || d.count || 0));

  // Helper to get the label from item - check various possible field names
  const getLabel = (item) => {
    return item.form_name || item.name || item.form || item.department ||
           item.label || item.month || item.status || item.user ||
           item.category || item.type || 'Unknown';
  };

  // Helper to get the value from item
  const getValue = (item) => {
    return item.submissions || item.pending || item.value || item.count || 0;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 border border-slate-200">
      <div className="space-y-3">
        {data.map((item, index) => {
          const value = getValue(item);
          const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
          const label = getLabel(item);
          return (
            <div key={index} className="flex items-center gap-3">
              <div className="w-32 text-sm text-slate-600 truncate" title={label}>
                {label}
              </div>
              <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-sky-500 rounded-full transition-all duration-500"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <div className="w-12 text-sm font-medium text-slate-700 text-right">
                {value}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Status/Pie data display (as horizontal bars for simplicity)
const StatusBreakdown = ({ data }) => {
  const colors = {
    'Submitted': 'bg-blue-500',
    'Approved': 'bg-emerald-500',
    'Rejected': 'bg-red-500',
    'Pending': 'bg-amber-500'
  };

  const total = data.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="bg-white rounded-lg shadow-md p-4 border border-slate-200">
      <div className="flex h-4 rounded-full overflow-hidden mb-4">
        {data.map((item, index) => (
          <div
            key={index}
            className={`${colors[item.status] || 'bg-slate-400'}`}
            style={{ width: `${(item.count / total) * 100}%` }}
            title={`${item.status}: ${item.count}`}
          />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {data.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${colors[item.status] || 'bg-slate-400'}`} />
            <span className="text-sm text-slate-600">{item.status}</span>
            <span className="text-sm font-medium text-slate-800 ml-auto">{item.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Analytics Result Card component
const AnalyticsResultCard = ({ result }) => {
  const renderVisualization = () => {
    if (!result.data || result.data.length === 0) {
      return null;
    }

    switch (result.visualization) {
      case 'number':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {result.data.map((item, index) => (
              <MetricCard
                key={index}
                label={item.label}
                value={item.value}
                unit={item.unit}
                trend={item.trend}
                icon={item.icon}
              />
            ))}
          </div>
        );

      case 'bar':
      case 'line':
        return (
          <div>
            <BarChart data={result.data} />
          </div>
        );

      case 'pie':
        return (
          <div>
            <StatusBreakdown data={result.data} />
          </div>
        );

      case 'cards':
        return (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {result.data.map((item, index) => (
              <MetricCard
                key={index}
                label={item.label}
                value={item.value}
                icon={item.icon}
              />
            ))}
          </div>
        );

      default:
        // Table view
        return (
          <div className="bg-white rounded-lg shadow-md border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {Object.keys(result.data[0] || {}).map((key) => (
                    <th key={key} className="px-4 py-2 text-left text-slate-600 font-medium capitalize">
                      {key.replace(/_/g, ' ')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.data.map((row, index) => (
                  <tr key={index} className="border-t border-slate-100">
                    {Object.values(row).map((value, vIndex) => (
                      <td key={vIndex} className="px-4 py-2 text-slate-700">
                        {typeof value === 'number' ? value.toLocaleString() : String(value)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
    }
  };

  // Check if we have data to show visualization
  const hasVisualization = result.data && result.data.length > 0 && result.visualization !== 'text';

  return (
    <div className="mb-4">
      {/* AI Avatar Row - Now shows summary instead of interpretation */}
      <div className="flex justify-start mb-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center mr-3">
          <ChartBarIcon />
        </div>
        <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-md shadow-md max-w-[70%]">
          <div className="text-sm text-slate-800 whitespace-pre-wrap">
            {result.summary || result.interpretation || "Here are your results."}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {new Date(result.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>

      {/* Visualization - Only show if we have data */}
      {hasVisualization && (
        <div className="ml-11">
          {renderVisualization()}
        </div>
      )}
    </div>
  );
};

// Suggested Query Chips
const SuggestedQueries = ({ queries, onSelect }) => {
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {queries.slice(0, 4).map((query, index) => (
        <button
          key={index}
          onClick={() => onSelect(query)}
          className="px-3 py-1.5 bg-white border border-slate-200 rounded-full text-sm text-slate-600 hover:bg-sky-50 hover:border-sky-300 hover:text-sky-600 transition-colors"
        >
          {query}
        </button>
      ))}
    </div>
  );
};

// Main Natural Language Analytics component
const NaturalLanguageAnalytics = () => {
  const { user } = useAuth();
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  // Load chat history on mount
  useEffect(() => {
    const loadHistory = async () => {
      setIsLoadingHistory(true);
      const result = await analyticsService.loadChatHistory();

      if (result.success && result.messages && result.messages.length > 0) {
        // Convert backend messages to frontend format
        const loadedMessages = result.messages.map(msg => {
          const baseMessage = {
            content: msg.content,
            isUser: msg.message_type === 'USER',
            timestamp: msg.created_at
          };

          // Check if this is an analytics result (has visualization data in metadata)
          if (msg.metadata && msg.metadata.visualization) {
            return {
              ...baseMessage,
              isAnalyticsResult: true,
              visualization: msg.metadata.visualization,
              data: msg.metadata.data || [],
              summary: msg.metadata.summary,
              interpretation: msg.metadata.interpretation
            };
          }

          return baseMessage;
        });
        setMessages(loadedMessages);
        setShowSuggestions(false); // Hide suggestions if there's history
      } else {
        // No history, show welcome message
        const welcomeMessage = analyticsService.getWelcomeMessage();
        setMessages([{ ...welcomeMessage, isUser: false }]);
        // Save welcome message to backend (fire and forget)
        analyticsService.saveMessage(welcomeMessage.content, 'ASSISTANT');
      }
      setIsLoadingHistory(false);
    };

    loadHistory();
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Add message to chat and save to backend
  const addMessage = (message, metadata = {}) => {
    setMessages(prev => [...prev, message]);

    // Save to backend (fire and forget - don't wait)
    analyticsService.saveMessage(
      message.content,
      message.isUser ? 'USER' : 'ASSISTANT',
      metadata
    );
  };

  // Clear chat history
  const handleClearChat = async () => {
    const result = await analyticsService.clearChatHistory();
    if (result.success) {
      // Reset to welcome message
      const welcomeMessage = analyticsService.getWelcomeMessage();
      setMessages([{ ...welcomeMessage, isUser: false }]);
      setShowSuggestions(true);
      // Save welcome message to new session
      analyticsService.saveMessage(welcomeMessage.content, 'ASSISTANT');
    }
  };

  // Handle send message
  const handleSendMessage = async (query = null) => {
    const messageText = query || inputValue.trim();
    if (!messageText) return;

    const userMessage = {
      content: messageText,
      isUser: true,
      timestamp: new Date().toISOString()
    };

    addMessage(userMessage);
    setInputValue('');
    setShowSuggestions(false);

    setIsTyping(true);

    try {
      const response = await analyticsService.processQuery(messageText);

      setIsTyping(false);

      if (response.type === 'error' || response.type === 'text') {
        // Simple text message (errors, greetings, help, etc.)
        addMessage({
          content: response.content,
          isUser: false,
          timestamp: response.timestamp
        });
      } else {
        // Add analytics result as a special message type
        const analyticsResult = { ...response, isUser: false, isAnalyticsResult: true };
        setMessages(prev => [...prev, analyticsResult]);

        // Save analytics result to backend with visualization metadata
        analyticsService.saveMessage(
          response.summary || response.interpretation || response.content,
          'ASSISTANT',
          {
            visualization: response.visualization,
            data: response.data,
            summary: response.summary,
            interpretation: response.interpretation,
            filters: response.filters,
            aggregation: response.aggregation
          }
        );
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

  // Handle key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Handle suggested query click
  const handleSuggestedQuery = (query) => {
    handleSendMessage(query);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* Header - Fixed at top */}
      <div className="flex-shrink-0 bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center">
              <ChartBarIcon />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800">Analytics Query</h1>
              <p className="text-sm text-slate-500">
                Ask questions about your forms data in natural language
                {user?.role === 'ADMIN' && ' (All Departments)'}
                {user?.role === 'MANAGER' && user?.department && ` (${user.department.name} Department)`}
              </p>
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
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            <span className="ml-3 text-slate-500">Loading chat history...</span>
          </div>
        ) : (
          messages.map((message, index) => (
            message.isAnalyticsResult ? (
              <AnalyticsResultCard key={index} result={message} />
            ) : (
              <ChatMessage key={index} message={message} isUser={message.isUser} />
            )
          ))
        )}

        {/* Typing indicator */}
        {isTyping && <TypingIndicator />}

        {/* Suggested queries */}
        {showSuggestions && messages.length === 1 && (
          <div className="mt-4">
            <p className="text-sm text-slate-500 mb-2">Try one of these:</p>
            <SuggestedQueries
              queries={analyticsService.getSuggestedQueries()}
              onSelect={handleSuggestedQuery}
            />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - Fixed at bottom */}
      <div className="flex-shrink-0 bg-white border-t border-slate-200 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask a question about your data..."
              className="w-full px-4 py-3 border border-slate-300 rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          <button
            onClick={() => handleSendMessage()}
            disabled={!inputValue.trim()}
            className="p-3 bg-emerald-500 text-white rounded-full hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <SendIcon />
          </button>
        </div>
        <p className="text-xs text-slate-400 text-center mt-2">
          Press Enter to send your query
        </p>
      </div>
    </div>
  );
};

export default NaturalLanguageAnalytics;
