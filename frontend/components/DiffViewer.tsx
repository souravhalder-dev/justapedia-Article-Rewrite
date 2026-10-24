"use client";

import React, { useState } from "react";
import { GitCompare, Columns, AlignLeft } from "lucide-react";

interface WordDiffChunk {
  type: "equal" | "delete" | "insert";
  text: string;
}

interface AlignedDiffRow {
  type: "equal" | "replace" | "delete" | "insert";
  orig_line_num: number | null;
  rev_line_num: number | null;
  orig_text: string;
  rev_text: string;
  word_diff?: {
    orig: WordDiffChunk[];
    rev: WordDiffChunk[];
  } | null;
}

interface DiffViewerProps {
  diffRows: AlignedDiffRow[];
  unifiedDiff?: string;
}

export default function DiffViewer({ diffRows, unifiedDiff }: DiffViewerProps) {
  const [viewMode, setViewMode] = useState<"split" | "unified">("split");

  if (!diffRows || diffRows.length === 0) {
    return (
      <div className="p-12 text-center text-slate-400 bg-slate-900 rounded-lg border border-slate-800">
        <GitCompare className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
        <p className="text-sm">No diff available yet. Fetch an article and run a rewrite or audit to inspect changes.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden shadow-md flex flex-col h-[650px]">
      {/* Diff Toolbar */}
      <div className="px-4 py-2.5 bg-slate-800/80 border-b border-slate-700/80 flex items-center justify-between text-xs text-slate-300">
        <div className="flex items-center space-x-2">
          <GitCompare className="w-4 h-4 text-indigo-400" />
          <span className="font-semibold text-slate-200">Wikitext Diff Comparison</span>
          <span className="text-[11px] text-slate-400">({diffRows.length} lines compared)</span>
        </div>
        <div className="flex items-center space-x-1 bg-slate-900 p-0.5 rounded border border-slate-700 text-[11px]">
          <button
            onClick={() => setViewMode("split")}
            className={`px-2 py-1 rounded flex items-center space-x-1 transition ${
              viewMode === "split" ? "bg-indigo-600 text-white font-medium" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Columns className="w-3 h-3" />
            <span>Side-by-Side</span>
          </button>
          <button
            onClick={() => setViewMode("unified")}
            className={`px-2 py-1 rounded flex items-center space-x-1 transition ${
              viewMode === "unified" ? "bg-indigo-600 text-white font-medium" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <AlignLeft className="w-3 h-3" />
            <span>Unified Diff</span>
          </button>
        </div>
      </div>

      {/* Diff Content */}
      <div className="flex-1 overflow-auto font-mono text-xs p-2 bg-slate-950">
        {viewMode === "unified" ? (
          <pre className="text-slate-300 p-2 leading-relaxed selection:bg-indigo-900">
            {unifiedDiff || "Unified diff not computed."}
          </pre>
        ) : (
          <table className="w-full border-collapse">
            <tbody>
              {diffRows.map((row, idx) => {
                const isChanged = row.type !== "equal";
                return (
                  <tr
                    key={idx}
                    className={`border-b border-slate-900/60 transition ${
                      row.type === "replace"
                        ? "bg-amber-950/20"
                        : row.type === "delete"
                        ? "bg-rose-950/30"
                        : row.type === "insert"
                        ? "bg-emerald-950/30"
                        : ""
                    }`}
                  >
                    {/* Orig Line # */}
                    <td className="w-10 text-right pr-2 select-none text-slate-600 text-[10px] py-0.5 border-r border-slate-800">
                      {row.orig_line_num ?? ""}
                    </td>
                    {/* Orig Text */}
                    <td className="w-1/2 px-2 py-0.5 align-top text-slate-300 border-r border-slate-800 break-words whitespace-pre-wrap">
                      {row.word_diff ? (
                        row.word_diff.orig.map((chunk, cIdx) => (
                          <span
                            key={cIdx}
                            className={
                              chunk.type === "delete"
                                ? "bg-rose-900/60 text-rose-200 line-through px-0.5 rounded font-semibold"
                                : ""
                            }
                          >
                            {chunk.text}
                          </span>
                        ))
                      ) : (
                        <span
                          className={
                            row.type === "delete" ? "bg-rose-900/50 text-rose-200 line-through px-0.5 rounded" : ""
                          }
                        >
                          {row.orig_text}
                        </span>
                      )}
                    </td>

                    {/* Rev Line # */}
                    <td className="w-10 text-right pr-2 select-none text-slate-600 text-[10px] py-0.5 border-r border-slate-800">
                      {row.rev_line_num ?? ""}
                    </td>
                    {/* Rev Text */}
                    <td className="w-1/2 px-2 py-0.5 align-top text-indigo-200 break-words whitespace-pre-wrap">
                      {row.word_diff ? (
                        row.word_diff.rev.map((chunk, cIdx) => (
                          <span
                            key={cIdx}
                            className={
                              chunk.type === "insert"
                                ? "bg-emerald-900/70 text-emerald-200 px-0.5 rounded font-bold underline"
                                : ""
                            }
                          >
                            {chunk.text}
                          </span>
                        ))
                      ) : (
                        <span
                          className={
                            row.type === "insert" ? "bg-emerald-900/50 text-emerald-200 px-0.5 rounded font-bold" : ""
                          }
                        >
                          {row.rev_text}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
