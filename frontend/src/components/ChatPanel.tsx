import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../api/client';

interface ChatPanelProps {
  sessionId: number;
}

interface Source {
  url: string;
  title: string;
}

interface Message {
  role: 'ai' | 'user';
  content: string;
  sources?: Source[];
}

// Render text with markdown links: [text](url)
function renderWithLinks(text: string) {
  const parts = text.split(/(\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, i) => {
    const match = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (match) {
      return (
        <a
          key={i}
          href={match[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="underline font-medium hover:opacity-80 transition-opacity"
          style={{ color: 'var(--sky)' }}
        >
          {match[1]}
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export default function ChatPanel({ sessionId }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        const data = await api.startChat({ session_id: sessionId });
        if (cancelled) return;
        setThreadId(data.thread_id);
        setMessages([{ role: 'ai', content: data.welcome_message }]);
        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to start chat.');
          setLoading(false);
        }
      }
    }
    init();
    return () => { cancelled = true; };
  }, [sessionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || !threadId || sending) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setSending(true);

    try {
      const data = await api.sendChatMessage({ thread_id: threadId, message: text });
      setMessages(prev => [
        ...prev,
        { role: 'ai', content: data.response, sources: data.sources?.length ? data.sources : undefined },
      ]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        { role: 'ai', content: `Sorry, I encountered an error: ${err instanceof Error ? err.message : 'Unknown error'}` },
      ]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }, [input, threadId, sending]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] rounded-2xl p-8"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin mb-4"
          style={{ borderColor: 'var(--forest)', borderTopColor: 'transparent' }} />
        <p style={{ color: 'var(--muted)' }}>Starting your tutor session…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] rounded-2xl p-8 text-center"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <span className="text-4xl mb-4">⚠️</span>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col rounded-2xl overflow-hidden"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', height: 'calc(100vh - 180px)', minHeight: '500px' }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3.5 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, var(--forest), var(--forest-light))' }}>
          <svg className="w-4 h-4" fill="none" stroke="#fdf8f0" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-bold" style={{ color: 'var(--forest)', fontFamily: "'Playfair Display', serif" }}>AI Tutor</p>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>Ask me anything about this topic</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
            {/* Avatar */}
            {msg.role === 'ai' ? (
              <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5"
                style={{ background: 'linear-gradient(135deg, var(--forest), var(--forest-light))' }}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="#fdf8f0" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
            ) : (
              <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5 text-xs font-bold"
                style={{ background: 'var(--gold)', color: '#fff' }}>
                U
              </div>
            )}

            <div className={`max-w-[75%] space-y-2 ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
              {/* Bubble */}
              <div
                className="rounded-2xl px-4 py-3 text-sm leading-relaxed"
                style={msg.role === 'ai'
                  ? { background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', borderTopLeftRadius: '4px' }
                  : { background: 'var(--forest)', color: '#fdf8f0', borderTopRightRadius: '4px' }
                }
              >
                {renderWithLinks(msg.content)}
              </div>

              {/* Sources chips */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="flex flex-wrap gap-1.5 px-1">
                  {msg.sources.map((src, si) => (
                    <a
                      key={si}
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full transition-all hover:-translate-y-0.5"
                      style={{ background: 'rgba(30,58,47,0.08)', border: '1px solid rgba(30,58,47,0.2)', color: 'var(--forest)' }}
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      {src.title || new URL(src.url).hostname}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {sending && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, var(--forest), var(--forest-light))' }}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="#fdf8f0" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div className="rounded-2xl px-4 py-3 flex items-center gap-1"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderTopLeftRadius: '4px' }}>
              {[0, 1, 2].map(n => (
                <span key={n} className="w-1.5 h-1.5 rounded-full animate-bounce"
                  style={{ background: 'var(--muted)', animationDelay: `${n * 150}ms` }} />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-4 py-3" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="flex items-end gap-2 rounded-xl px-3 py-2"
          style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question…"
            rows={1}
            disabled={sending || !threadId}
            className="flex-1 resize-none bg-transparent text-sm outline-none leading-relaxed"
            style={{ color: 'var(--text)', maxHeight: '120px' }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || sending || !threadId}
            className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-40"
            style={{ background: input.trim() ? 'var(--forest)' : 'var(--border)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke={input.trim() ? '#fdf8f0' : 'var(--muted)'} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <p className="text-xs mt-1.5 text-center" style={{ color: 'var(--muted)' }}>
          Press Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
