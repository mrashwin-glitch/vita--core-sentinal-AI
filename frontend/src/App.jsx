import React, { useState, useEffect } from 'react';
import { Activity, Mail, Lock, User, LogIn, ArrowRight } from 'lucide-react';
import Dashboard from './components/Dashboard';

const BACKEND_URL = 'http://localhost:5000';

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLogin, setIsLogin] = useState(true); // Toggle login vs register
  const [loading, setLoading] = useState(true);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check local storage for session
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    setError(null);

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    const body = isLogin ? { email, password } : { name, email, password };

    try {
      const response = await fetch(`${BACKEND_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      // Save token and user details
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setEmail('');
    setPassword('');
    setName('');
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-200">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  // Render dashboard if authenticated
  if (token && user) {
    return (
      <Dashboard 
        backendUrl={BACKEND_URL} 
        onLogout={handleLogout} 
      />
    );
  }

  // Render Login / Register form
  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 overflow-hidden">
      {/* Decorative background grid and neon blobs */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30" />
      <div className="absolute top-1/4 left-1/4 h-72 w-72 rounded-full bg-emerald-500/5 blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 h-72 w-72 rounded-full bg-cyan-500/5 blur-3xl" />

      {/* Floating green bioluminescent particles background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="particle" style={{ left: '8%', width: '8px', height: '8px', animationDelay: '0s', animationDuration: '7s' }} />
        <div className="particle" style={{ left: '18%', width: '12px', height: '12px', animationDelay: '1.5s', animationDuration: '9s' }} />
        <div className="particle" style={{ left: '32%', width: '6px', height: '6px', animationDelay: '3.5s', animationDuration: '6s' }} />
        <div className="particle" style={{ left: '48%', width: '10px', height: '10px', animationDelay: '0.8s', animationDuration: '8s' }} />
        <div className="particle" style={{ left: '62%', width: '14px', height: '14px', animationDelay: '4.2s', animationDuration: '10s' }} />
        <div className="particle" style={{ left: '76%', width: '8px', height: '8px', animationDelay: '2.1s', animationDuration: '7s' }} />
        <div className="particle" style={{ left: '88%', width: '12px', height: '12px', animationDelay: '5.3s', animationDuration: '9s' }} />
        <div className="particle" style={{ left: '12%', width: '10px', height: '10px', animationDelay: '2.8s', animationDuration: '8.5s' }} />
        <div className="particle" style={{ left: '44%', width: '8px', height: '8px', animationDelay: '4.9s', animationDuration: '7.5s' }} />
        <div className="particle" style={{ left: '72%', width: '12px', height: '12px', animationDelay: '1.2s', animationDuration: '9.5s' }} />
      </div>

      {/* Main card */}
      <div className="w-full max-w-md rounded-2xl border border-slate-900 bg-slate-950/60 p-8 shadow-2xl backdrop-blur-xl space-y-6 relative z-10">
        
        {/* Brand header */}
        <div className="text-center space-y-2">
          <div className="mx-auto h-12 w-12 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/10">
            <Activity className="h-6 w-6 text-slate-950" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight bg-gradient-to-r from-slate-150 via-slate-200 to-emerald-400 bg-clip-text text-transparent">
              VITA-CORE SENTINEL AI
            </h2>
            <p className="text-5xs font-mono text-emerald-500 uppercase tracking-widest mt-1">Mycelial Optical Bio-Sensor Ingestion</p>
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
            <div className="space-y-1.5">
              <label className="text-2xs font-bold text-slate-500 uppercase tracking-wider block">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  required
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950/80 py-2 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-650 focus:border-emerald-500/50 focus:outline-none transition-colors"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-2xs font-bold text-slate-500 uppercase tracking-wider block">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
              <input
                type="email"
                required
                placeholder="farmer@vitacore.ai"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-950/80 py-2 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-650 focus:border-emerald-500/50 focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-2xs font-bold text-slate-500 uppercase tracking-wider block">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-950/80 py-2 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-650 focus:border-emerald-500/50 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {error && (
            <p className="text-xs font-semibold text-red-400 text-center bg-red-950/15 border border-red-900/20 py-2 rounded-lg">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 py-2.5 text-sm font-semibold text-slate-950 hover:bg-emerald-450 hover:shadow-lg hover:shadow-emerald-500/10 active:scale-98 transition-all"
          >
            <LogIn className="h-4 w-4" />
            {isLogin ? 'Sign In to Portal' : 'Register Sentinel Account'}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        {/* Toggle link */}
        <div className="text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
            }}
            className="text-xs text-slate-400 hover:text-emerald-450 transition-colors"
          >
            {isLogin ? "Don't have an account? Register" : 'Already registered? Sign In'}
          </button>
        </div>
      </div>
    </div>
  );
}
