import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getMediaDetail, askGrokQuestion, getChatHistory } from '../services/api';
import { ArrowLeft, Sparkles, Send, Bot, User, FileText, Loader2, PlayCircle, MessageSquare } from 'lucide-react';

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
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-slate-400 font-mono text-xs gap-3">
        <Loader2 size={24} className="animate-spin text-indigo-400" />
        <span>Loading Grok Analysis & Media Content...</span>
      </div>
    );
  }

  if (!mediaDetail) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12 text-center text-slate-400">
        <p>Media intelligence session not found.</p>
        <Link to="/dashboard" className="text-indigo-400 text-xs hover:underline mt-2 inline-block">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard"
            className="p-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-lg transition"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-lg md:text-xl font-bold text-white truncate max-w-2xl">
              {mediaDetail.title || 'Media Processing Analysis'}
            </h1>
            <p className="text-xs font-mono text-slate-400">
              Type: {mediaDetail.type} • Source: <a href={mediaDetail.source_url} target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline truncate inline-block max-w-xs">{mediaDetail.source_url}</a>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 bg-indigo-950/80 border border-indigo-800/60 rounded-full text-indigo-400 text-xs font-mono flex items-center gap-1.5">
            <Sparkles size={14} /> Grok RAG Active
          </span>
        </div>
      </div>

      {/* Main Split Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[650px]">
        {/* LEFT COLUMN (7 cols): Grok Summary & Transcript */}
        <div className="lg:col-span-7 space-y-6 flex flex-col">
          {/* Summary Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 flex-1">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles size={18} className="text-indigo-400" /> Grok AI Summary
              </h2>
              <button
                onClick={() => setShowTranscript(!showTranscript)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition cursor-pointer"
              >
                <FileText size={14} />
                {showTranscript ? 'Hide Transcript' : 'View Full Transcript'}
              </button>
            </div>

            <div className="prose prose-invert max-w-none text-xs md:text-sm text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">
              {mediaDetail.summary || 'No summary generated.'}
            </div>

            {/* Transcript Accordion / Modal display */}
            {showTranscript && (
              <div className="mt-4 p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2 max-h-72 overflow-y-auto font-mono text-xs text-slate-400">
                <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">
                  Full Video/Audio Transcript (Whisper Extracted):
                </div>
                <p className="whitespace-pre-wrap">{mediaDetail.transcript || 'No transcript text available.'}</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN (5 cols): RAG Q&A Chat Interface */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col h-[650px]">
          {/* Chat Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <MessageSquare size={18} className="text-indigo-400" /> Grok Context Q&A
            </h2>
            <span className="text-[10px] font-mono text-slate-500">MongoDB Persistent</span>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 text-xs">
            {loadingHistory ? (
              <div className="text-center py-8 text-slate-500 font-mono flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin text-indigo-400" /> Loading chat history...
              </div>
            ) : messages.length === 0 ? (
              <div className="p-6 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
                <Bot size={28} className="mx-auto mb-2 text-indigo-400/60" />
                <p className="font-semibold text-slate-400 text-xs">Ask anything about this video</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Grok will answer based on the full transcript context.
                </p>
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
                  <span>Grok is searching transcript context...</span>
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
              placeholder="Ask a question about this video..."
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
