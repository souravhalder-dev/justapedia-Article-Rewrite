"use client";

import React from "react";
import { BookOpen, Globe, User, ShieldCheck, Cpu, Key, LogOut } from "lucide-react";

interface NavbarProps {
  endpoint: string;
  user: { logged_in: boolean; username: string | null; rights?: string[] } | null;
  onOpenLogin: () => void;
  onOpenSettings: () => void;
  onLogout: () => void;
  aiConfigured: boolean;
  useAi: boolean;
  onToggleAi: () => void;
}

export default function Navbar({
  endpoint,
  user,
  onOpenLogin,
  onOpenSettings,
  onLogout,
  aiConfigured,
  useAi,
  onToggleAi,
}: NavbarProps) {
  const shortEndpoint = endpoint.replace(/^https?:\/\//, "").replace(/\/api\.php$/, "");

  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Branding */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-bold text-lg text-white leading-tight">
                American English Localization Tool
              </h1>
              <span className="text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30">
                MediaWiki
              </span>
            </div>
            <p className="text-xs text-slate-400">Context-Aware Wikitext & Prose Engine</p>
          </div>
        </div>

        {/* Right: Controls & Status */}
        <div className="flex items-center space-x-3">
          {/* Endpoint Badge */}
          <button
            onClick={onOpenSettings}
            title="Configure MediaWiki Endpoint & Settings"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-slate-800/80 hover:bg-slate-700/80 text-xs text-slate-300 border border-slate-700 transition"
          >
            <Globe className="w-3.5 h-3.5 text-blue-400" />
            <span className="font-mono">{shortEndpoint}</span>
          </button>

          {/* AI Engine Status Toggle */}
          <button
            onClick={onToggleAi}
            title={useAi ? "AI Semantic Engine Active (Gemini)" : "Deterministic Rules Engine Active"}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition ${
              useAi
                ? "bg-purple-950/40 border-purple-600/40 text-purple-300 hover:bg-purple-900/40"
                : "bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700/80"
            }`}
          >
            <Cpu className={`w-3.5 h-3.5 ${useAi ? "text-purple-400" : "text-slate-400"}`} />
            <span>{useAi ? "AI + Rules" : "Deterministic Rules"}</span>
            {useAi && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            )}
          </button>

          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            title="API Keys & Engine Settings"
            className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 transition"
          >
            <Key className="w-4 h-4" />
          </button>

          {/* User Auth Pill */}
          {user?.logged_in ? (
            <div className="flex items-center space-x-2 bg-slate-800/90 border border-emerald-500/30 px-3 py-1.5 rounded-md text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <div className="flex flex-col">
                <span className="font-medium text-emerald-300">{user.username}</span>
                <span className="text-[10px] text-slate-400">Authenticated</span>
              </div>
              <button
                onClick={onLogout}
                title="Log Out"
                className="ml-2 p-1 text-slate-400 hover:text-rose-400 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenLogin}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition"
            >
              <User className="w-3.5 h-3.5" />
              <span>Connect Wiki Account</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
