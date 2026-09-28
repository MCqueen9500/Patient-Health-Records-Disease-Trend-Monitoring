'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { MessageCircle, X, Send, User, Bot, Sparkles } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const QUICK_PROMPTS: Record<string, string[]> = {
  PATIENT: ['What does my diagnosis mean?', 'Explain my medication', 'Healthy diet tips'],
  DOCTOR:  ['Check drug interactions', 'Summarize a condition', 'Dosage guidelines'],
  ADMIN:   ['Explain k-anonymity', 'Interpret outbreak data', 'Disease risk levels'],
};

export default function FloatingChatbot() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (!user) return null;

  const assistantName =
    user.role === 'PATIENT' ? 'Health Guide' :
    user.role === 'DOCTOR'  ? 'Clinical Assistant' :
    'Analytics Assistant';

  const sendMessage = async (userText: string) => {
    if (!userText.trim() || isLoading) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: userText };
    const assistantId = (Date.now() + 1).toString();

    setMessages(prev => [...prev, userMsg, { id: assistantId, role: 'assistant', content: '' }]);
    setInput('');
    setIsLoading(true);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ messages: history }),
        signal: ctrl.signal,
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      if (!res.body) throw new Error('No response body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        // Update assistant message in real-time
        setMessages(prev =>
          prev.map(m => m.id === assistantId ? { ...m, content: accumulated } : m)
        );
      }

      // Flush remaining bytes
      accumulated += decoder.decode();
      setMessages(prev =>
        prev.map(m => m.id === assistantId ? { ...m, content: accumulated } : m)
      );
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantId
            ? { ...m, content: '⚠️ Sorry, I couldn\'t connect to the AI. Please try again.' }
            : m
        )
      );
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* ── Chat Panel ─────────────────────────────────────────────── */}
      {isOpen && (
        <div
          className="w-80 sm:w-96 mb-4 rounded-2xl shadow-green border border-green-200 overflow-hidden flex flex-col animate-fade-in bg-white"
          style={{ height: 520, maxHeight: '80vh' }}
        >
          {/* Header */}
          <div className="bg-primary px-4 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-white font-bold text-sm leading-tight">{assistantName}</p>
                <p className="text-green-200 text-xs">Powered by AI · HLTH01</p>
              </div>
            </div>
            <button
              onClick={() => { setIsOpen(false); abortRef.current?.abort(); }}
              className="h-8 w-8 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <X className="h-4 w-4 text-white" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-green-50/30">
            {/* Welcome state */}
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center gap-4 py-6">
                <div className="h-16 w-16 rounded-2xl bg-green-100 flex items-center justify-center">
                  <Bot className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-bold text-green-900">
                    Hello{user.name ? `, ${user.name.split(' ')[0]}` : ''}! 👋
                  </p>
                  <p className="text-xs text-green-600 mt-1">How can I assist you today?</p>
                </div>

                {/* Quick prompts */}
                <div className="grid grid-cols-1 gap-2 w-full">
                  {(QUICK_PROMPTS[user.role] ?? []).map(q => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      className="text-left text-xs bg-white border border-green-200 text-green-700 rounded-xl px-3 py-2.5 hover:bg-green-50 hover:border-primary transition-colors font-medium"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Chat messages */}
            {messages.map(m => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex items-start gap-2 max-w-[85%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  {/* Avatar */}
                  <div className={`flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center text-white text-xs
                    ${m.role === 'user' ? 'bg-primary' : 'bg-green-700'}`}>
                    {m.role === 'user' ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
                  </div>

                  {/* Bubble */}
                  <div className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed
                    ${m.role === 'user'
                      ? 'bg-primary text-white rounded-tr-sm'
                      : 'bg-white border border-green-100 text-green-900 rounded-tl-sm shadow-sm'
                    }`}
                  >
                    {m.content === '' && m.role === 'assistant' ? (
                      /* Typing indicator */
                      <span className="flex items-center gap-1 h-4">
                        {[0, 150, 300].map(delay => (
                          <span
                            key={delay}
                            className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"
                            style={{ animationDelay: `${delay}ms` }}
                          />
                        ))}
                      </span>
                    ) : (
                      m.content
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input bar */}
          <div className="p-3 bg-white border-t border-green-100 flex-shrink-0">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Type your message…"
                disabled={isLoading}
                className="flex-1 rounded-xl border border-green-200 bg-green-50 px-3.5 py-2 text-sm text-green-900
                  placeholder-green-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                  disabled:opacity-60 transition-all"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="h-10 w-10 rounded-xl bg-primary hover:bg-primary-700 text-white flex items-center justify-center
                  disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 flex-shrink-0"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Toggle Button ──────────────────────────────────────────── */}
      <button
        onClick={() => setIsOpen(o => !o)}
        className="h-14 w-14 rounded-2xl bg-primary hover:bg-primary-700 text-white flex items-center justify-center
          shadow-green pulse-green transition-all active:scale-95"
        aria-label="Toggle AI assistant"
      >
        {isOpen
          ? <X className="h-6 w-6" />
          : <MessageCircle className="h-6 w-6" />
        }
      </button>
    </div>
  );
}
