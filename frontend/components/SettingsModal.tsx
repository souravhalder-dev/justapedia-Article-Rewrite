"use client";

import React, { useState } from "react";
import { X, Settings, Globe, Key, Cpu, Sparkles, Check } from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  endpoint: string;
  onSaveEndpoint: (ep: string) => void;
  geminiApiKey: string;
  onSaveApiKey: (key: string) => void;
  useAi: boolean;
  onToggleAi: (val: boolean) => void;
  userInstructions: string;
  onSaveInstructions: (inst: string) => void;
}

export default function SettingsModal({
  isOpen,
  onClose,
  endpoint,
  onSaveEndpoint,
  geminiApiKey,
  onSaveApiKey,
  useAi,
  onToggleAi,
  userInstructions,
  onSaveInstructions,
}: SettingsModalProps) {
  const [currentEp, setCurrentEp] = useState(endpoint);
  const [currentKey, setCurrentKey] = useState(geminiApiKey);
  const [currentUseAi, setCurrentUseAi] = useState(useAi);
  const [currentInst, setCurrentInst] = useState(userInstructions);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveEndpoint(currentEp.trim());
    onSaveApiKey(currentKey.trim());
    onToggleAi(currentUseAi);
    onSaveInstructions(currentInst.trim());
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden text-slate-100">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-base text-white">Engine & Connection Settings</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSave} className="p-6 space-y-5 text-xs">
          {/* MediaWiki Endpoint */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-300 flex items-center space-x-1.5">
              <Globe className="w-3.5 h-3.5 text-blue-400" />
              <span>MediaWiki Action API Endpoint</span>
            </label>
            <input
              type="text"
              value={currentEp}
              onChange={(e) => setCurrentEp(e.target.value)}
              placeholder="https://justapedia.org/api.php"
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              required
            />
            <p className="text-[10px] text-slate-400">
              Default: <code className="text-slate-300">https://justapedia.org/api.php</code>. Compatible with any standard MediaWiki instance.
            </p>
          </div>

          {/* Engine Mode */}
          <div className="space-y-2">
            <label className="font-semibold text-slate-300 block">Processing Engine Selection</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setCurrentUseAi(false)}
                className={`p-3 rounded-lg border text-left transition ${
                  !currentUseAi
                    ? "bg-indigo-950/40 border-indigo-500 text-indigo-200"
                    : "bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800"
                }`}
              >
                <div className="flex items-center space-x-1.5 font-bold text-xs mb-1">
                  <Cpu className="w-4 h-4 text-indigo-400" />
                  <span>Deterministic Rules</span>
                </div>
                <p className="text-[10px] opacity-80 leading-normal">
                  Fast, 100% offline. Context-aware dictionaries for spelling, vocabulary & punctuation.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setCurrentUseAi(true)}
                className={`p-3 rounded-lg border text-left transition ${
                  currentUseAi
                    ? "bg-purple-950/40 border-purple-500 text-purple-200"
                    : "bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800"
                }`}
              >
                <div className="flex items-center space-x-1.5 font-bold text-xs mb-1">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span>AI Semantic Rewriter</span>
                </div>
                <p className="text-[10px] opacity-80 leading-normal">
                  Advanced sentence restructuring, flow improvement, and encyclopedic tone via Google Gemini.
                </p>
              </button>
            </div>
          </div>

          {/* Optional Gemini API Key */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-300 flex items-center space-x-1.5">
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <span>Google Gemini API Key (Optional)</span>
            </label>
            <input
              type="password"
              value={currentKey}
              onChange={(e) => setCurrentKey(e.target.value)}
              placeholder="Leave empty to use server GEMINI_API_KEY environment variable"
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <p className="text-[10px] text-slate-400">
              Only required when the AI Semantic Engine is enabled. Deterministic rules work 100% without any API key.
            </p>
          </div>

          {/* Optional Additional Guidance Instructions */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-300 block">
              Custom Editorial Guidelines / Tone Notes
            </label>
            <textarea
              rows={2}
              value={currentInst}
              onChange={(e) => setCurrentInst(e.target.value)}
              placeholder="e.g. Ensure strict adherence to Chicago Manual of Style for numbers and dates"
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* Footer buttons */}
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
              className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md flex items-center space-x-1.5 transition"
            >
              {savedSuccess ? <Check className="w-4 h-4 text-emerald-300" /> : null}
              <span>{savedSuccess ? "Saved!" : "Save Settings"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
