"use client";

import React from "react";
import { Play, Sparkles, CheckSquare, RotateCcw, Eye, Save, AlertCircle } from "lucide-react";

export interface SectionItem {
  index: number;
  title: string;
  level: number;
  is_lead?: boolean;
}

interface ControlsBarProps {
  mode: string;
  onSelectMode: (mode: string) => void;
  sectionIndex: number | null;
  onSelectSection: (index: number | null) => void;
  sections: SectionItem[];
  onStartRewrite: () => void;
  onStartAudit: () => void;
  onDiscardDraft: () => void;
  onOpenPreview: () => void;
  onOpenSave: () => void;
  isProcessing: boolean;
  hasChanges: boolean;
  canSave: boolean;
}

export const REWRITE_MODES = [
  {
    id: "american_conversion",
    title: "1. American English Conversion",
    desc: "Convert non-American spelling & vocabulary to American English while retaining meaning",
  },
  {
    id: "proofreading",
    title: "2. American English Proofreading",
    desc: "Correct spelling, grammar, punctuation (serial commas, quote style), and vocabulary",
  },
  {
    id: "full_improvement",
    title: "3. Full Article Improvement",
    desc: "Improve readability, structure, and clarity using encyclopedic American English",
  },
  {
    id: "lead_improvement",
    title: "4. Lead Section Improvement",
    desc: "Refine and polish the opening lead paragraphs",
  },
  {
    id: "short_desc_improvement",
    title: "5. Short Description Improvement",
    desc: "Create or improve concise, MOS-compliant {{Short description}}",
  },
  {
    id: "section_rewrite",
    title: "6. Section Rewrite",
    desc: "Rewrite a specific selected section only",
  },
  {
    id: "consistency_audit",
    title: "7. American English Consistency Audit",
    desc: "Scan and identify all non-American spelling, vocabulary, and style inconsistencies",
  },
  {
    id: "reference_review",
    title: "8. Citation and Reference Review",
    desc: "Audit references and dates without altering factual claims",
  },
];

export default function ControlsBar({
  mode,
  onSelectMode,
  sectionIndex,
  onSelectSection,
  sections,
  onStartRewrite,
  onStartAudit,
  onDiscardDraft,
  onOpenPreview,
  onOpenSave,
  isProcessing,
  hasChanges,
  canSave,
}: ControlsBarProps) {
  return (
    <div className="bg-slate-900/80 border-b border-slate-800 p-4">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        {/* Left: Mode & Section Selectors */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Mode Selector */}
          <div className="flex flex-col">
            <label className="text-[11px] font-semibold text-slate-400 mb-1 uppercase tracking-wider">
              Rewrite Mode
            </label>
            <select
              value={mode}
              onChange={(e) => onSelectMode(e.target.value)}
              disabled={isProcessing}
              className="bg-slate-800 border border-slate-700 text-slate-100 text-xs rounded-lg px-3 py-2 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              {REWRITE_MODES.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          </div>

          {/* Section Selector */}
          <div className="flex flex-col">
            <label className="text-[11px] font-semibold text-slate-400 mb-1 uppercase tracking-wider">
              Target Scope
            </label>
            <select
              value={sectionIndex === null ? "all" : String(sectionIndex)}
              onChange={(e) => {
                const val = e.target.value;
                onSelectSection(val === "all" ? null : parseInt(val, 10));
              }}
              disabled={isProcessing || mode === "lead_improvement"}
              className="bg-slate-800 border border-slate-700 text-slate-100 text-xs rounded-lg px-3 py-2 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="all">Entire Article (All Sections)</option>
              {sections.map((sec) => (
                <option key={sec.index} value={String(sec.index)}>
                  {sec.is_lead ? "★ Lead Section" : `${"–".repeat(Math.max(1, sec.level - 1))} ${sec.title}`}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right: Execution & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Run Audit */}
          <button
            onClick={onStartAudit}
            disabled={isProcessing}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition disabled:opacity-50"
          >
            <CheckSquare className="w-4 h-4 text-sky-400" />
            <span>Audit Only</span>
          </button>

          {/* Start Rewrite */}
          <button
            onClick={onStartRewrite}
            disabled={isProcessing}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4 text-indigo-200" />
            <span>{isProcessing ? "Processing..." : "Start Rewrite"}</span>
          </button>

          {/* Discard Draft */}
          {hasChanges && (
            <button
              onClick={onDiscardDraft}
              disabled={isProcessing}
              title="Discard proposed changes and restore original article"
              className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 text-xs font-medium transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Discard</span>
            </button>
          )}

          {/* Live Preview Button */}
          <button
            onClick={onOpenPreview}
            disabled={isProcessing}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition"
          >
            <Eye className="w-4 h-4 text-emerald-400" />
            <span>Preview HTML</span>
          </button>

          {/* Save to Wiki */}
          <button
            onClick={onOpenSave}
            disabled={!hasChanges || isProcessing}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white text-xs font-semibold shadow-md transition"
          >
            <Save className="w-4 h-4" />
            <span>Save to Wiki</span>
          </button>
        </div>
      </div>
    </div>
  );
}
