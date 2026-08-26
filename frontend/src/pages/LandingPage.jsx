import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser, registerUser } from '../services/api';
import { Video, Sparkles, ShieldCheck, ArrowRight, Bot, Database, Zap } from 'lucide-react';

export default function LandingPage({ onAuthSuccess }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        await registerUser(email, password);
        // Automatically login after successful registration
        const loginData = await loginUser(email, password);
        localStorage.setItem('token', loginData.access_token);
        if (onAuthSuccess) await onAuthSuccess();
        navigate('/dashboard');
      } else {
        const loginData = await loginUser(email, password);
        localStorage.setItem('token', loginData.access_token);
        if (onAuthSuccess) await onAuthSuccess();
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Auth error:', err);
      setError(err.response?.data?.detail || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col justify-center items-center px-6 py-12">
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        {/* Hero Banner Text */}
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-950/60 border border-indigo-800/60 rounded-full text-indigo-400 text-xs font-mono">
            <Sparkles size={14} /> Full-Stack AI Video Intelligence
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white leading-tight">
            Transcribe, Summarize & Chat with any <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Video</span>
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Powered by Grok AI, OpenAI Whisper, MongoDB, and direct Supabase file uploads. Experience high-speed meeting intelligence and RAG-based context Q&A.
          </p>

          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
              <Bot size={20} className="text-indigo-400 mb-1" />
              <div className="text-xs font-semibold text-white">Grok Models</div>
              <div className="text-[10px] text-slate-500">xAI API / OpenRouter</div>
            </div>
            <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
              <Database size={20} className="text-cyan-400 mb-1" />
              <div className="text-xs font-semibold text-white">MongoDB</div>
              <div className="text-[10px] text-slate-500">Motor Async Driver</div>
            </div>
            <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
              <Zap size={20} className="text-emerald-400 mb-1" />
              <div className="text-xs font-semibold text-white">Direct Upload</div>
              <div className="text-[10px] text-slate-500">Supabase Storage</div>
            </div>
          </div>
        </div>

        {/* Auth Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-8 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
            <h2 className="text-xl font-bold text-white">
              {isSignUp ? 'Create your account' : 'Welcome back'}
            </h2>
            <button
              onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition cursor-pointer"
            >
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1.5">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg text-sm text-white outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1.5">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg text-sm text-white outline-none transition"
              />
            </div>

            {error && (
              <div className="text-xs text-red-400 bg-red-950/40 p-3 rounded-lg border border-red-800/60">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white rounded-lg font-bold text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/20"
            >
              {loading ? (
                'Processing...'
              ) : (
                <>
                  {isSignUp ? 'Create Account' : 'Sign In'} <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-[11px] text-slate-500 font-mono">
            FastAPI Auth • JWT Bearer Token Secured
          </div>
        </div>
      </div>
    </div>
  );
}
