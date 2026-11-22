import React, { useState } from 'react';
import {
  Box,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  ShieldAlert,
  ShieldCheck,
  User,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { useAuthStore } from '../state/useAuthStore';

interface AccessGateProps {
  theme?: 'dark' | 'light';
}

export const AccessGate: React.FC<AccessGateProps> = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [key, setKey] = useState('');
  const [showKey, setShowKey] = useState(false);

  const { login, isLoading, statusMessage, error, clearError } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    await login(name, email, key);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-slate-950 text-slate-100 relative overflow-hidden font-sans selection:bg-blue-500 selection:text-white">
      {/* Background CAD Blueprint Grid & Lighting */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.15]"
        style={{
          backgroundImage: `
            linear-gradient(to right, #3b82f6 1px, transparent 1px),
            linear-gradient(to bottom, #3b82f6 1px, transparent 1px)
          `,
          backgroundSize: '36px 36px',
        }}
      />
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="relative w-full max-w-md z-10">
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl backdrop-blur-xl p-7 sm:p-8">

          {/* Header & Logo */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-lg shadow-blue-500/25 mb-3.5 ring-4 ring-blue-500/10">
              <Box className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
              EG SIMULATOR <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 font-medium">v4.0</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              3D Engineering Drawing Simulator
            </p>
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-slate-800/80 text-slate-300 border border-slate-700/60">
              <Lock className="w-3 h-3 text-blue-400" />
              <span>Protected Project Access</span>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-red-950/60 border border-red-800/60 text-red-200 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
              <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{error}</div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Full Name */}
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-400 mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (error) clearError();
                  }}
                  placeholder="e.g. Ritesh"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700/80 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-400 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) clearError();
                  }}
                  placeholder="e.g. abc@gmail.com"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700/80 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Special Unique Key */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-400">
                  Special Access Key
                </label>
                <span className="text-[10px] text-blue-400 font-medium">Provided by Owner</span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type={showKey ? 'text' : 'password'}
                  required
                  value={key}
                  onChange={(e) => {
                    setKey(e.target.value);
                    if (error) clearError();
                  }}
                  placeholder="Enter the unique secret key"
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700/80 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
                  tabIndex={-1}
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-sm shadow-lg shadow-blue-600/30 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>{statusMessage || 'Verifying...'}</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verify Key & Enter Project</span>
                </>
              )}
            </button>
          </form>

          {/* Footer info & Formspree notice */}
          <div className="mt-5 pt-4 border-t border-slate-800/80 text-center text-[11px] text-slate-400 space-y-2">
            <p className="flex items-center justify-center gap-1.5 text-slate-400">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>All access attempts are securely recorded to owner via Formspree</span>
            </p>
          </div>

        </div>

        {/* Bottom copyright / syllabus mark */}
        <div className="text-center mt-4 text-[11px] text-slate-500">
          Build with AI by AP & KP
        </div>
      </div>
    </div>
  );
};

