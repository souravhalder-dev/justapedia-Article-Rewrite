"use client";

import React, { useState } from "react";
import { Search, Loader2, ArrowRight, ShieldAlert, FileText, Calendar, UserCheck } from "lucide-react";

interface ArticleMeta {
  pageid: number;
  title: string;
  original_requested_title?: string;
  is_redirect: boolean;
  redirect_note?: string | null;
  revid: number;
  timestamp: string;
  last_user: string;
  size: number;
  is_protected: boolean;
}

interface ArticleHeaderProps {
  onFetch: (titleOrUrl: string) => void;
  isLoading: boolean;
  articleMeta: ArticleMeta | null;
}

export default function ArticleHeader({
  onFetch,
  isLoading,
  articleMeta,
}: ArticleHeaderProps) {
  const [inputVal, setInputVal] = useState("Perfume (novel)");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputVal.trim()) {
      onFetch(inputVal.trim());
    }
  };

  const sampleArticles = [
    "Perfume (novel)",
    "Picture! Picture!",
    "Konocti Unified School District"
  ];

  return (
    <div className="bg-slate-900 border-b border-slate-800 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
        {/* Search input form */}
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 items-stretch">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Enter MediaWiki article title or full URL (e.g. Perfume (novel) or https://justapedia.org/wiki/...)"
              className="w-full pl-11 pr-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm shadow-inner"
              disabled={isLoading}
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !inputVal.trim()}
            className="px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-sm flex items-center justify-center space-x-2 shadow-md transition"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Retrieving...</span>
              </>
            ) : (
              <>
                <span>Fetch Article</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick sample buttons */}
        <div className="flex items-center space-x-2 text-xs text-slate-400">
          <span className="font-medium text-slate-300">Quick Samples:</span>
          {sampleArticles.map((sample) => (
            <button
              key={sample}
              type="button"
              onClick={() => {
                setInputVal(sample);
                onFetch(sample);
              }}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            >
              {sample}
            </button>
          ))}
        </div>

        {/* Article Metadata Card */}
        {articleMeta && (
          <div className="mt-4 p-4 rounded-lg bg-slate-800/60 border border-slate-700 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center space-x-3">
              <FileText className="w-5 h-5 text-indigo-400" />
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-base font-bold text-white">{articleMeta.title}</h2>
                  {articleMeta.is_redirect && (
                    <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded text-[10px] font-semibold">
                      Redirect Resolved
                    </span>
                  )}
                  {articleMeta.is_protected ? (
                    <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded text-[10px] font-semibold flex items-center space-x-1">
                      <ShieldAlert className="w-3 h-3" />
                      <span>Protected</span>
                    </span>
                  ) : (
                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] font-semibold">
                      Editable
                    </span>
                  )}
                </div>
                {articleMeta.redirect_note && (
                  <p className="text-amber-400/90 text-[11px] mt-0.5">{articleMeta.redirect_note}</p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-6 text-slate-400">
              <div className="flex items-center space-x-1.5">
                <span className="text-slate-400">Rev ID:</span>
                <span className="font-mono text-slate-200">{articleMeta.revid}</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-200">{new Date(articleMeta.timestamp).toLocaleString()}</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-200">{articleMeta.last_user}</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="text-slate-400">Size:</span>
                <span className="font-mono text-slate-200">{(articleMeta.size / 1024).toFixed(1)} KB</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
