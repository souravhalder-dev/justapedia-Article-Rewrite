"use client";

import React, { useState } from "react";
import { Copy, Check, RotateCcw, Edit3, Lock } from "lucide-react";

interface SideBySideEditorProps {
  originalText: string;
  revisedText: string;
  onChangeRevised: (text: string) => void;
  onResetRevised: () => void;
}

export default function SideBySideEditor({
  originalText,
  revisedText,
  onChangeRevised,
  onResetRevised,
}: SideBySideEditorProps) {
  const [copiedOrig, setCopiedOrig] = useState(false);
  const [copiedRev, setCopiedRev] = useState(false);

  const handleCopy = (text: string, isOrig: boolean) => {
    navigator.clipboard.writeText(text);
    if (isOrig) {
      setCopiedOrig(true);
      setTimeout(() => setCopiedOrig(false), 2000);
    } else {
      setCopiedRev(true);
      setTimeout(() => setCopiedRev(false), 2000);
    }
  };

  const origWordCount = originalText.trim() ? originalText.trim().split(/\s+/).length : 0;
  const revWordCount = revisedText.trim() ? revisedText.trim().split(/\s+/).length : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[650px]">
      {/* Left Pane: Original Article */}
      <div className="flex flex-col bg-slate-900 rounded-lg border border-slate-800 overflow-hidden shadow-md">
        <div className="px-4 py-2.5 bg-slate-800/80 border-b border-slate-700/80 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center space-x-2">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold text-slate-200">Original Article (MediaWiki Source)</span>
          </div>
          <div className="flex items-center space-x-3 text-[11px] text-slate-400">
            <span>{origWordCount.toLocaleString()} words</span>
            <span>{originalText.length.toLocaleString()} chars</span>
            <button
              onClick={() => handleCopy(originalText, true)}
              className="p-1 hover:text-white transition flex items-center space-x-1"
              title="Copy original Wikitext"
            >
              {copiedOrig ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedOrig ? "Copied" : "Copy"}</span>
            </button>
          </div>
        </div>
        <textarea
          readOnly
          value={originalText}
          className="flex-1 p-4 font-mono text-xs bg-slate-950/80 text-slate-300 resize-none focus:outline-none leading-relaxed selection:bg-indigo-900"
          placeholder="Original Wikitext appears here after fetching..."
        />
      </div>

      {/* Right Pane: Proposed / Revised Article */}
      <div className="flex flex-col bg-slate-900 rounded-lg border border-slate-800 overflow-hidden shadow-md">
        <div className="px-4 py-2.5 bg-slate-800/80 border-b border-slate-700/80 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center space-x-2">
            <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-semibold text-indigo-300">Proposed American English Revision (Editable)</span>
          </div>
          <div className="flex items-center space-x-3 text-[11px] text-slate-400">
            <span>{revWordCount.toLocaleString()} words</span>
            <button
              onClick={onResetRevised}
              className="p-1 hover:text-rose-300 transition flex items-center space-x-1"
              title="Reset back to generated rewrite"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>Reset</span>
            </button>
            <button
              onClick={() => handleCopy(revisedText, false)}
              className="p-1 hover:text-white transition flex items-center space-x-1"
              title="Copy revised Wikitext"
            >
              {copiedRev ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedRev ? "Copied" : "Copy"}</span>
            </button>
          </div>
        </div>
        <textarea
          value={revisedText}
          onChange={(e) => onChangeRevised(e.target.value)}
          className="flex-1 p-4 font-mono text-xs bg-slate-950/90 text-indigo-100 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed selection:bg-indigo-800"
          placeholder="Revised American English Wikitext appears here after running rewrite..."
        />
      </div>
    </div>
  );
}
