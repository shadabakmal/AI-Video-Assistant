import React, { useState, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Loader2 } from 'lucide-react';
import { askChatQuestion, getChatHistory } from '../services/api';

export default function MeetingChat({ meetingId }) {
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (meetingId) {
      getChatHistory(meetingId)
        .then(history => setMessages(history))
        .catch(err => console.error('Failed to load chat history:', err));
    }
  }, [meetingId]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!question.trim() || isLoading) return;

    const userText = question.trim();
    setQuestion('');

    const tempUserMsg = {
      id: Date.now().toString(),
      sender: 'user',
      text: userText,
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, tempUserMsg]);
    setIsLoading(true);

    try {
      const res = await askChatQuestion(meetingId, userText);
      setMessages(prev => [...prev, res.assistant_message]);
    } catch (e) {
      console.error('Chat error:', e);
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: 'assistant',
          text: 'Error querying meeting RAG engine. Please try again.',
          created_at: new Date().toISOString()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="card-glass" style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '1.25rem' }}>
      <div style={{ paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyBetween: 'space-between' }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-light)' }}>
          <Sparkles size={16} /> CHAT WITH YOUR MEETING (RAG)
        </h3>
      </div>

      {/* Message History */}
      <div style={{ flex: 1, overflowY: 'auto', maxHeight: '420px', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem', paddingRight: '0.25rem' }}>
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
            <Bot size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
            <p style={{ fontSize: '0.8rem' }}>Ask any question grounded in the video transcript context.</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                gap: '0.65rem',
                alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%'
              }}
            >
              {msg.sender === 'assistant' && (
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Bot size={16} color="#fff" />
                </div>
              )}
              <div
                style={{
                  background: msg.sender === 'user' ? 'linear-gradient(135deg, var(--accent), #5b21b6)' : 'var(--bg)',
                  border: `1px solid ${msg.sender === 'user' ? 'transparent' : 'var(--border)'}`,
                  color: msg.sender === 'user' ? '#fff' : 'var(--text)',
                  borderRadius: '10px',
                  padding: '0.65rem 0.85rem',
                  fontSize: '0.825rem',
                  lineHeight: '1.5'
                }}
              >
                {msg.text}
              </div>
              {msg.sender === 'user' && (
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--surface-active)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid var(--border)' }}>
                  <User size={14} color="var(--text-muted)" />
                </div>
              )}
            </div>
          ))
        )}

        {isLoading && (
          <div style={{ display: 'flex', gap: '0.65rem', alignSelf: 'flex-start' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bot size={16} color="#fff" />
            </div>
            <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.65rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <Loader2 className="spin" size={14} style={{ animation: 'spin 1.5s linear infinite' }} /> Thinking...
            </div>
          </div>
        )}
      </div>

      {/* Input Box */}
      <form onSubmit={handleSend} style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          type="text"
          placeholder="Ask a question about this meeting..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          style={{
            flex: 1,
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '0.65rem 0.85rem',
            color: 'var(--text)',
            fontSize: '0.825rem',
            fontFamily: 'inherit',
            outline: 'none'
          }}
        />
        <button
          type="submit"
          className="btn-primary"
          disabled={isLoading || !question.trim()}
          style={{ padding: '0.65rem 1rem' }}
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}
