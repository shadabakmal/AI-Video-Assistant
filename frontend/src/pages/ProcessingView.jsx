import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getMediaDetail, askGrokQuestion, getChatHistory } from '../services/api';
import { ArrowLeft, Send, Bot, User, FileText, Loader2, MessageSquare } from 'lucide-react';

export default function ProcessingView() {
  const { id: mediaId } = useParams();
  const [mediaDetail, setMediaDetail] = useState(null);
  const [loadingMedia, setLoadingMedia] = useState(true);
  const [showTranscript, setShowTranscript] = useState(false);

  const [messages, setMessages] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [questionInput, setQuestionInput] = useState('');
  const [asking, setAsking] = useState(false);

  const chatEndRef = useRef(null);

  // Fetch Media detail & Chat history
  useEffect(() => {
    async function loadData() {
      if (!mediaId) return;
      setLoadingMedia(true);
      setLoadingHistory(true);
      try {
        const detail = await getMediaDetail(mediaId);
        setMediaDetail(detail);

        const history = await getChatHistory(mediaId);
        setMessages(history);
      } catch (err) {
        console.error('Failed to load media or history:', err);
      } finally {
        setLoadingMedia(false);
        setLoadingHistory(false);
      }
    }
    loadData();
  }, [mediaId]);

  // Scroll to bottom when messages update
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleAskQuestion = async (e) => {
    e.preventDefault();
    if (!questionInput.trim() || asking) return;

    const qText = questionInput.trim();
    setQuestionInput('');
    setAsking(true);

    // Optimistic user message update
    const tempUserMsg = {
      id: Date.now().toString(),
      role: 'user',
      content: qText,
      created_at: new Date().toISOString()
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const res = await askGrokQuestion(mediaId, qText);
      const assistantMsg = res.assistant_message;
      setMessages((prev) => [...prev.filter(m => m.id !== tempUserMsg.id), res.user_message, assistantMsg]);
    } catch (err) {
      console.error('Failed to ask question:', err);
      const errorMsg = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Error: ${err.response?.data?.detail || 'Failed to connect to Grok Q&A backend.'}`,
        created_at: new Date().toISOString()
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setAsking(false);
    }
  };

  if (loadingMedia) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-slate-400 text-xs gap-3">
        <Loader2 size={24} className="animate-spin text-indigo-400" />
        <span>Loading...</span>
      </div>
    );
  }

  if (!mediaDetail) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12 text-center text-slate-400">
        <p>Session not found.</p>
        <Link to="/dashboard" className="text-indigo-400 text-xs hover:underline mt-2 inline-block">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
      {/* Top Header */}
      <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
        <Link
          to="/dashboard"
          className="p-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-lg transition"
        >
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-lg font-bold text-white truncate max-w-2xl">
          {mediaDetail.title || 'Media Session'}
        </h1>
      </div>

      {/* Main Split Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[650px]">
        {/* LEFT COLUMN (7 cols): Summary & Transcript */}
        <div className="lg:col-span-7 space-y-6 flex flex-col">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 flex-1">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white">Summary</h2>
              <button
                onClick={() => setShowTranscript(!showTranscript)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition cursor-pointer"
              >
                <FileText size={14} />
                {showTranscript ? 'Hide transcript' : 'Transcript'}
              </button>
            </div>

            <div className="prose prose-invert max-w-none text-xs md:text-sm text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">
              {mediaDetail.summary || 'No summary generated.'}
            </div>

            {showTranscript && (
              <div className="mt-4 p-4 bg-slate-950 border border-slate-800 rounded-xl max-h-72 overflow-y-auto font-mono text-xs text-slate-400">
                <p className="whitespace-pre-wrap">{mediaDetail.transcript || 'No transcript available.'}</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN (5 cols): Q&A Chat Interface */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col h-[650px]">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-4">
            <MessageSquare size={18} className="text-indigo-400" />
            <h2 className="text-base font-bold text-white">Ask about this video</h2>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 text-xs">
            {loadingHistory ? (
              <div className="text-center py-8 text-slate-500 flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin text-indigo-400" /> Loading...
              </div>
            ) : messages.length === 0 ? (
              <div className="p-6 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
                <Bot size={28} className="mx-auto mb-2 text-indigo-400/60" />
                <p className="text-xs">Ask anything about this video.</p>
              </div>
            ) : (
              messages.map((msg, index) => {
                const isUser = msg.role === 'user' || msg.sender === 'user';
                return (
                  <div
                    key={msg.id || index}
                    className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    <div
                      className={`p-1.5 rounded-lg shrink-0 ${
                        isUser ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-indigo-400 border border-slate-700'
                      }`}
                    >
                      {isUser ? <User size={14} /> : <Bot size={14} />}
                    </div>

                    <div
                      className={`p-3 rounded-xl max-w-[85%] leading-relaxed ${
                        isUser
                          ? 'bg-indigo-600/90 text-white rounded-tr-none'
                          : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-tl-none font-sans'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content || msg.text}</p>
                    </div>
                  </div>
                );
              })
            )}

            {asking && (
              <div className="flex items-center gap-2.5 text-slate-400">
                <div className="p-1.5 rounded-lg bg-slate-800 text-indigo-400 border border-slate-700">
                  <Bot size={14} />
                </div>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl rounded-tl-none flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin text-indigo-400" />
                  <span>Thinking...</span>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Question Input Form */}
          <form onSubmit={handleAskQuestion} className="mt-4 pt-3 border-t border-slate-800 flex gap-2">
            <input
              type="text"
              value={questionInput}
              onChange={(e) => setQuestionInput(e.target.value)}
              placeholder="Ask a question..."
              disabled={asking}
              className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-xs text-white outline-none transition"
            />
            <button
              type="submit"
              disabled={asking || !questionInput.trim()}
              className="p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white rounded-xl transition cursor-pointer shrink-0"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}