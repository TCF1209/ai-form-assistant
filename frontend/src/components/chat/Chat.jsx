import React from 'react';

// Full class names so Tailwind keeps them in the build
const AVATAR_COLORS = {
  violet: 'from-violet-500 to-purple-600',
  emerald: 'from-emerald-500 to-teal-600',
};

const SparklesIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
  </svg>
);

const BotAvatar = ({ accent }) => (
  <div
    className={`flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br ${AVATAR_COLORS[accent]} flex items-center justify-center mr-3 shadow-md text-white`}
  >
    <SparklesIcon />
  </div>
);

const userInitial = (user) => (user?.first_name?.[0] || user?.username?.[0] || 'U').toUpperCase();

/**
 * Renders **bold** segments of a message as <strong>. Everything stays plain React text,
 * so content from the model or the user is never interpreted as HTML.
 */
export const RichText = ({ text }) =>
  String(text ?? '')
    .split(/(\*\*[^*]+\*\*)/g)
    .map((part, i) =>
      part.startsWith('**') && part.endsWith('**') && part.length > 4 ? (
        <strong key={i}>{part.slice(2, -2)}</strong>
      ) : (
        <React.Fragment key={i}>{part}</React.Fragment>
      )
    );

export const ChatMessage = ({ message, isUser, user, accent = 'violet' }) => (
  <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
    {!isUser && <BotAvatar accent={accent} />}
    <div
      className={`max-w-[70%] px-4 py-3 rounded-2xl ${
        isUser ? 'bg-sky-500 text-white rounded-br-md' : 'bg-white text-slate-800 shadow-md rounded-bl-md'
      }`}
    >
      <div className="whitespace-pre-wrap text-sm">
        <RichText text={message.content} />
      </div>
      <div className={`text-xs mt-1 ${isUser ? 'text-sky-100' : 'text-slate-400'}`}>
        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>
    {isUser && (
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center ml-3 shadow-md">
        <span className="text-white text-sm font-bold">{userInitial(user)}</span>
      </div>
    )}
  </div>
);

export const TypingIndicator = ({ accent = 'violet' }) => (
  <div className="flex justify-start mb-4">
    <BotAvatar accent={accent} />
    <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-md shadow-md">
      <div className="flex gap-1">
        {[0, 150, 300].map((delay) => (
          <div
            key={delay}
            className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
            style={{ animationDelay: `${delay}ms` }}
          ></div>
        ))}
      </div>
    </div>
  </div>
);
