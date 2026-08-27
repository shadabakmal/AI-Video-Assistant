import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser, registerUser } from '../services/api';
import { Video, ArrowRight } from 'lucide-react';

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
      <div className="w-full max-w-sm">
        {/* Mark */}
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-indigo-600/20 border border-indigo-500/40 rounded-2xl text-indigo-400 mb-4">
            <Video size={26} />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            {isSignUp ? 'Create your account' : 'Sign in to AI Video Assistant'}
          </h1>
        </div>

        {/* Auth Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-8 shadow-2xl backdrop-blur-xl">
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
        </div>

        <div className="mt-6 text-center text-sm text-slate-400">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
            className="text-indigo-400 hover:text-indigo-300 font-medium transition cursor-pointer"
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </div>
      </div>
    </div>
  );
}