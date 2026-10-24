"use client";

import React from "react";
import { Eye, ExternalLink, Tag } from "lucide-react";

interface WikiPreviewProps {
  html: string;
  title: string;
  categories: string[];
  isLoading: boolean;
}

export default function WikiPreview({ html, title, categories, isLoading }: WikiPreviewProps) {
  if (isLoading) {
    return (
      <div className="p-16 text-center text-slate-400 bg-slate-900 rounded-lg border border-slate-800">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-sm font-medium text-slate-300">Rendering live MediaWiki preview via action=parse...</p>
      </div>
    );
  }

  if (!html) {
    return (
      <div className="p-12 text-center text-slate-400 bg-slate-900 rounded-lg border border-slate-800">
        <Eye className="w-8 h-8 mx-auto mb-2 opacity-40 text-indigo-400" />
        <p className="text-sm font-medium text-slate-300">No HTML preview generated yet.</p>
        <p className="text-xs text-slate-400 mt-1">Click &ldquo;Preview HTML&rdquo; in the toolbar to render MediaWiki output.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden shadow-md flex flex-col h-[650px]">
      {/* Header */}
      <div className="px-4 py-2.5 bg-slate-800/80 border-b border-slate-700/80 flex items-center justify-between text-xs text-slate-300">
        <div className="flex items-center space-x-2">
          <Eye className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold text-slate-200">MediaWiki HTML Live Preview</span>
          <span className="text-[11px] text-slate-400">({title})</span>
        </div>
        <div className="flex items-center space-x-2 text-[11px] text-slate-400">
          <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
            Rendered from Wiki Engine
          </span>
        </div>
      </div>

      {/* Rendered HTML Container */}
      <div className="flex-1 overflow-auto p-6 bg-white text-slate-900 prose prose-slate max-w-none prose-headings:text-slate-900 prose-a:text-blue-600 prose-table:border">
        <div dangerouslySetInnerHTML={{ __html: html }} />

        {/* Categories footer */}
        {categories.length > 0 && (
          <div className="mt-8 pt-4 border-t border-slate-300 text-xs text-slate-600 flex items-center flex-wrap gap-1.5">
            <span className="font-semibold flex items-center space-x-1 text-slate-700 mr-2">
              <Tag className="w-3.5 h-3.5" />
              <span>Categories:</span>
            </span>
            {categories.map((cat, idx) => (
              <span
                key={idx}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded border border-slate-300 transition"
              >
                {cat}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
