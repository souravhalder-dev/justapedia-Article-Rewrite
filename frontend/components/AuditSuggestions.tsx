"use client";

import React, { useState } from "react";
import { Check, X, CheckCheck, XCircle, ArrowRight, Shield, Sparkles, Filter } from "lucide-react";

export interface FindingItem {
  id: string;
  original: string;
  replacement: string;
  category: string;
  confidence: number;
  explanation: string;
  source: string;
  line: number;
  char_offset: number;
  context: string;
  accepted?: boolean;
}

interface AuditSuggestionsProps {
  findings: FindingItem[];
  onToggleAccept: (id: string) => void;
  onAcceptAll: () => void;
  onRejectAll: () => void;
  onApplyToDraft: () => void;
}

export default function AuditSuggestions({
  findings,
  onToggleAccept,
  onAcceptAll,
  onRejectAll,
  onApplyToDraft,
}: AuditSuggestionsProps) {
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const categories = ["all", "spelling", "vocabulary", "punctuation", "style"];

  const filteredFindings = findings.filter(
    (f) => filterCategory === "all" || f.category.toLowerCase() === filterCategory.toLowerCase()
  );

  const acceptedCount = findings.filter((f) => f.accepted !== false).length;

  if (findings.length === 0) {
    return (
      <div className="p-12 text-center text-slate-400 bg-slate-900 rounded-lg border border-slate-800">
        <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-40 text-emerald-400" />
        <p className="text-sm font-medium text-slate-300">No suggestions or inconsistencies detected.</p>
        <p className="text-xs text-slate-400 mt-1">Run an audit or rewrite to generate American English suggestions.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden shadow-md flex flex-col h-[650px]">
      {/* Header & Batch Controls */}
      <div className="px-4 py-3 bg-slate-800/80 border-b border-slate-700/80 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-slate-200">Consistency Findings</span>
          <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono text-[11px] border border-indigo-500/30">
            {findings.length} Total
          </span>
          <span className="text-slate-400 text-[11px]">
            ({acceptedCount} accepted)
          </span>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center space-x-1 bg-slate-900 p-0.5 rounded border border-slate-700 text-[11px]">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-2 py-1 rounded capitalize transition ${
                filterCategory === cat
                  ? "bg-indigo-600 text-white font-medium"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Batch Actions */}
        <div className="flex items-center space-x-2">
          <button
            onClick={onAcceptAll}
            className="flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 text-[11px] transition"
          >
            <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Accept All</span>
          </button>
          <button
            onClick={onRejectAll}
            className="flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-rose-300 border border-slate-700 text-[11px] transition"
          >
            <XCircle className="w-3.5 h-3.5 text-rose-400" />
            <span>Reject All</span>
          </button>
          <button
            onClick={onApplyToDraft}
            className="flex items-center space-x-1 px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[11px] shadow transition"
          >
            <span>Apply to Draft</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Findings List */}
      <div className="flex-1 overflow-auto p-4 space-y-3 bg-slate-950/60">
        {filteredFindings.map((finding) => {
          const isAccepted = finding.accepted !== false;
          return (
            <div
              key={finding.id}
              className={`p-3.5 rounded-lg border transition ${
                isAccepted
                  ? "bg-slate-900 border-slate-700/80 shadow-sm"
                  : "bg-slate-900/40 border-slate-800 opacity-60"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1.5 flex-1">
                  {/* Category, Confidence & Source badges */}
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                        finding.category === "spelling"
                          ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                          : finding.category === "vocabulary"
                          ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                          : finding.category === "punctuation"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          : "bg-teal-500/20 text-teal-300 border border-teal-500/30"
                      }`}
                    >
                      {finding.category}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {(finding.confidence * 100).toFixed(0)}% confidence
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                      {finding.source}
                    </span>
                    {finding.line > 0 && (
                      <span className="text-[10px] text-slate-400">Line {finding.line}</span>
                    )}
                  </div>

                  {/* Original -> Replacement */}
                  <div className="flex items-center space-x-2 text-sm font-medium">
                    <span className="text-rose-300 line-through font-mono">{finding.original}</span>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                    <span className="text-emerald-300 font-mono font-bold">{finding.replacement}</span>
                  </div>

                  {/* Explanation */}
                  <p className="text-xs text-slate-300 leading-normal">{finding.explanation}</p>

                  {/* Surrounding Context */}
                  {finding.context && (
                    <p className="text-[11px] text-slate-400 italic bg-slate-950 p-2 rounded border border-slate-800/80 font-mono">
                      &ldquo;{finding.context}&rdquo;
                    </p>
                  )}
                </div>

                {/* Accept / Reject Toggle Button */}
                <button
                  onClick={() => onToggleAccept(finding.id)}
                  title={isAccepted ? "Click to reject change" : "Click to accept change"}
                  className={`p-2 rounded-lg border transition flex items-center justify-center shrink-0 ${
                    isAccepted
                      ? "bg-emerald-950/60 border-emerald-600/50 text-emerald-300 hover:bg-rose-950/40 hover:text-rose-300 hover:border-rose-700/50"
                      : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-emerald-950/40 hover:text-emerald-300 hover:border-emerald-700/50"
                  }`}
                >
                  {isAccepted ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
