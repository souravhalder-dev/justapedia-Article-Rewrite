"use client";

import React, { useState } from "react";
import { X, Save, AlertTriangle, CheckCircle, ShieldCheck, RefreshCw, ExternalLink } from "lucide-react";

interface SaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  expectedRevid: number | null;
  basetimestamp: string | null;
  user: { logged_in: boolean; username: string | null } | null;
  onSave: (summary: string, isDryRun: boolean) => Promise<{ success: boolean; new_revid?: number; is_dry_run?: boolean; message?: string }>;
  endpoint: string;
}

export default function SaveModal({
  isOpen,
  onClose,
  title,
  expectedRevid,
  basetimestamp,
  user,
  onSave,
  endpoint,
}: SaveModalProps) {
  const [summary, setSummary] = useState("Converted article prose to American English (consistent spelling, vocabulary, and punctuation)");
  const [isDryRun, setIsDryRun] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ success: boolean; new_revid?: number; is_dry_run?: boolean; message?: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExecuteSave = async () => {
    setIsSaving(true);
    setErrorMsg(null);
    setSaveResult(null);
    try {
      const result = await onSave(summary, isDryRun);
      setSaveResult(result);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save article revision to wiki.");
    } finally {
      setIsSaving(false);
    }
  };

  const wikiArticleUrl = `${endpoint.replace(/\/api\.php$/, "")}/${encodeURIComponent(title.replace(/ /g, "_"))}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden text-slate-100">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Save className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-base text-white">Save Changes to MediaWiki</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 text-xs">
          {saveResult ? (
            <div className="p-4 rounded-lg bg-emerald-950/60 border border-emerald-600/50 space-y-3 text-emerald-200">
              <div className="flex items-center space-x-2 text-sm font-bold text-emerald-300">
                <CheckCircle className="w-5 h-5" />
                <span>{saveResult.is_dry_run ? "Test Run Succeeded" : "Article Successfully Updated!"}</span>
              </div>
              <p className="text-xs">
                {saveResult.is_dry_run
                  ? saveResult.message || "Dry-run completed successfully. No live changes were made to the wiki."
                  : `Revision ID #${saveResult.new_revid} has been published to '${title}'.`}
              </p>
              {!saveResult.is_dry_run && (
                <a
                  href={wikiArticleUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center space-x-1.5 text-xs font-semibold text-emerald-300 hover:text-emerald-100 underline mt-2"
                >
                  <span>View Published Page on Wiki</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          ) : (
            <>
              {/* Target info card */}
              <div className="p-3 rounded-lg bg-slate-800/80 border border-slate-700 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Target Page:</span>
                  <span className="font-bold text-white text-sm">{title}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Base Revision: #{expectedRevid ?? "Unknown"}</span>
                  <span>Timestamp: {basetimestamp ? new Date(basetimestamp).toLocaleTimeString() : "N/A"}</span>
                </div>
              </div>

              {/* Attribution Warning */}
              <div className="p-3 rounded-lg bg-indigo-950/40 border border-indigo-700/40 flex items-start space-x-2 text-indigo-200">
                <ShieldCheck className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-indigo-300">User Attribution Guarantee</p>
                  <p className="text-[11px] text-indigo-300/80 mt-0.5">
                    {user?.logged_in
                      ? `Edits will be committed and signed strictly under your authenticated MediaWiki account: "${user.username}".`
                      : "You are not logged in. You can perform a Dry-Run test, or log in to commit live edits."}
                  </p>
                </div>
              </div>

              {/* Edit Summary Input */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-300 block">
                  MediaWiki Edit Summary <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="e.g. Converted article prose to American English"
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <p className="text-[10px] text-slate-400">This will be permanently recorded in the MediaWiki page history.</p>
              </div>

              {/* Dry Run Toggle */}
              <label className="flex items-center space-x-2.5 p-2 rounded bg-slate-800/60 border border-slate-700 cursor-pointer hover:bg-slate-800 transition">
                <input
                  type="checkbox"
                  checked={isDryRun}
                  onChange={(e) => setIsDryRun(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <div>
                  <span className="font-semibold text-slate-200">Test Mode (Dry Run)</span>
                  <p className="text-[11px] text-slate-400">Validate tokens, syntax, and conflict checks without writing to the live wiki.</p>
                </div>
              </label>

              {/* Error Alert */}
              {errorMsg && (
                <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-700/50 flex items-start space-x-2 text-rose-300">
                  <AlertTriangle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
                  <p className="text-xs leading-normal">{errorMsg}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-800/80 border-t border-slate-700 flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium transition"
          >
            {saveResult ? "Close" : "Cancel"}
          </button>
          {!saveResult && (
            <button
              onClick={handleExecuteSave}
              disabled={isSaving || (!isDryRun && !user?.logged_in) || !summary.trim()}
              className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-semibold shadow-md flex items-center space-x-1.5 transition"
            >
              {isSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>{isSaving ? "Saving..." : isDryRun ? "Execute Dry Run" : "Confirm & Save Revision"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
