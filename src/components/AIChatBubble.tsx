import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  Bot,
  User,
  Loader2,
  ChevronDown,
  Zap,
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const SUGGESTED_QUESTIONS = [
  'How many issues are unresolved right now?',
  'Which category has the most complaints?',
  'What is the average resolution time?',
  'Show me the most critical complaints',
];

export const AIChatBubble: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        "👋 Hi! I'm **CivicPulse AI** — ask me anything about the live civic data, complaint stats, SLA performance, or how to use the platform.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    setShowSuggestions(false);

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text.trim() }),
      });

      const data = await res.json();

      const botMsg: Message = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: data.reply || "I couldn't find an answer right now. Try asking about complaint stats or platform features.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: '⚠️ Connection error. Please make sure the server is running.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const formatContent = (text: string) => {
    // Simple bold markdown rendering
    return text.split(/\*\*(.*?)\*\*/g).map((part, i) =>
      i % 2 === 1 ? (
        <strong key={i} className="font-bold text-slate-900">
          {part}
        </strong>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  return (
    <>
      {/* Floating Chat Bubble Button */}
      <button
        id="ai-chat-bubble-btn"
        onClick={() => setIsOpen((o) => !o)}
        className={`fixed bottom-6 right-6 z-[9999] w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 cursor-pointer group ${
          isOpen
            ? 'bg-slate-800 hover:bg-slate-700 rotate-0'
            : 'bg-gradient-to-br from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 hover:scale-110'
        }`}
        title="Ask CivicPulse AI"
        aria-label="Open AI Chat"
      >
        {isOpen ? (
          <X className="w-5 h-5 text-white" />
        ) : (
          <>
            <Sparkles className="w-6 h-6 text-white" />
            {/* Pulse ring */}
            <span className="absolute inset-0 rounded-full bg-indigo-400 opacity-30 animate-ping" />
          </>
        )}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div
          id="ai-chat-panel"
          className="fixed bottom-24 right-6 z-[9998] w-[360px] sm:w-[420px] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
          style={{ maxHeight: '560px' }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 shrink-0">
            <div className="w-9 h-9 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Sparkles className="w-4.5 h-4.5 text-white" />
            </div>
            <div className="flex-1">
              <div className="font-bold text-white text-sm leading-tight">CivicPulse AI</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                <span className="text-[10px] text-indigo-100 font-medium">Powered by Gemini • Live data</span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-xl hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar */}
                <div
                  className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold ${
                    msg.role === 'assistant'
                      ? 'bg-gradient-to-br from-indigo-500 to-violet-600'
                      : 'bg-slate-700'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <Zap className="w-3.5 h-3.5" />
                  ) : (
                    <User className="w-3.5 h-3.5" />
                  )}
                </div>

                {/* Bubble */}
                <div
                  className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                    msg.role === 'assistant'
                      ? 'bg-slate-50 border border-slate-100 text-slate-700 rounded-tl-sm'
                      : 'bg-indigo-600 text-white rounded-tr-sm'
                  }`}
                >
                  {formatContent(msg.content)}
                  <div
                    className={`text-[9px] mt-1.5 ${
                      msg.role === 'assistant' ? 'text-slate-400' : 'text-indigo-200'
                    }`}
                  >
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}

            {/* Suggested questions */}
            {showSuggestions && (
              <div className="space-y-1.5 pt-1">
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider px-1">
                  Try asking:
                </p>
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="w-full text-left px-3 py-2 rounded-xl bg-indigo-50 border border-indigo-100 text-xs text-indigo-700 font-medium hover:bg-indigo-100 transition-colors cursor-pointer"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Loading indicator */}
            {loading && (
              <div className="flex gap-2.5">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0">
                  <Zap className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="px-3.5 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl rounded-tl-sm">
                  <div className="flex gap-1 items-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-4 py-3 border-t border-slate-100 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage(input);
              }}
              className="flex gap-2 items-center"
            >
              <input
                ref={inputRef}
                id="ai-chat-input"
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about civic data..."
                className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-400 transition-colors"
                disabled={loading}
              />
              <button
                id="ai-chat-send-btn"
                type="submit"
                disabled={!input.trim() || loading}
                className="w-9 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:cursor-not-allowed flex items-center justify-center transition-colors cursor-pointer shrink-0"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                ) : (
                  <Send className="w-4 h-4 text-white" />
                )}
              </button>
            </form>
            <p className="text-[9px] text-slate-400 text-center mt-2">
              Gemini AI · Live SQLite data · CivicPulse 2026
            </p>
          </div>
        </div>
      )}
    </>
  );
};
