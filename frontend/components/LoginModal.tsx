"use client";

import React, { useState } from "react";
import { X, User, Key, Globe, Shield, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  endpoint: string;
  onLogin: (username: string, password: string,endpoint: string) => Promise<{ success: boolean; username: string }>;
}

export default function LoginModal({ isOpen, onClose, endpoint, onLogin }: LoginModalProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [wikiEndpoint, setWikiEndpoint] = useState(endpoint);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successUser, setSuccessUser] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);
    try {
      const res = await onLogin(username.trim(), password, wikiEndpoint.trim());
      setSuccessUser(res.username);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || "Authentication failed. Check your username, password, or Bot Password.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-md w-full overflow-hidden text-slate-100">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <User className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-base text-white">MediaWiki Account Login</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {successUser ? (
            <div className="p-4 rounded-lg bg-emerald-950/60 border border-emerald-600/50 flex items-center space-x-3 text-emerald-300">
              <CheckCircle2 className="w-6 h-6 shrink-0" />
              <div>
                <p className="font-bold text-sm">Authenticated Successfully!</p>
                <p className="text-xs">Logged in as {successUser}. Closing modal...</p>
              </div>
            </div>
          ) : (
            <>
              {/* MediaWiki Endpoint */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-300 flex items-center space-x-1.5">
                  <Globe className="w-3.5 h-3.5 text-blue-400" />
                  <span>MediaWiki API Endpoint</span>
                </label>
                <input
                  type="text"
                  value={wikiEndpoint}
                  onChange={(e) => setWikiEndpoint(e.target.value)}
                  placeholder="https://justapedia.org/api.php"
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>

              {/* Username / Bot Username */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-300 block">
                  MediaWiki Username / Bot Name
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. MyUser or MyUser@LocalizationTool"
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>

              {/* Password / Bot Password */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-300 block">
                  Password or Bot Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your MediaWiki account or Bot Password"
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>

              {/* Tip info box */}
              <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/80 text-[11px] text-slate-400 space-y-1">
                <p className="font-semibold text-slate-300 flex items-center space-x-1">
                  <Shield className="w-3 h-3 text-emerald-400" />
                  <span>Recommended: MediaWiki Bot Passwords</span>
                </p>
                <p>
                  For enhanced security, generate a Bot Password under <em>Special:BotPasswords</em> on your wiki with &quot;High-volume editing&quot; or &quot;Edit existing pages&quot; permissions.
                </p>
              </div>

              {/* Error Message */}
              {errorMsg && (
                <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-700/50 flex items-start space-x-2 text-rose-300">
                  <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
                  <p className="text-xs">{errorMsg}</p>
                </div>
              )}

              {/* Action buttons */}
              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !username || !password}
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-semibold shadow-md flex items-center space-x-1.5 transition"
                >
                  {isLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isLoading ? "Authenticating..." : "Sign In"}</span>
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
