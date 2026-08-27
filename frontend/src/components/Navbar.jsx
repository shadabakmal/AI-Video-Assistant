import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Video, LogOut, LayoutDashboard, Sparkles } from 'lucide-react';

export default function Navbar({ user, onLogout }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    if (onLogout) onLogout();
    navigate('/');
  };

  return (
    <nav className="w-full bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
      <Link to={user ? "/dashboard" : "/"} className="flex items-center gap-3 decoration-none">
        <div className="p-2 bg-indigo-600/20 border border-indigo-500/40 rounded-xl text-indigo-400">
          <Video size={24} />
        </div>
        <div>
          <span className="font-extrabold text-lg text-white tracking-wide flex items-center gap-1.5">
            AI Video Assistant 
          </span>
        </div>
      </Link>

      <div className="flex items-center gap-4">
        {user ? (
          <>
            <Link
              to="/dashboard"
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-medium transition"
            >
              <LayoutDashboard size={16} />
              Dashboard
            </Link>
            <span className="text-xs text-slate-400 font-mono bg-slate-800/60 px-3 py-1.5 rounded-md border border-slate-700">
              {user.email}
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/60 rounded-lg text-sm font-medium transition cursor-pointer"
            >
              <LogOut size={16} />
              Logout
            </button>
          </>
        ) : null}
      </div>
    </nav>
  );
}