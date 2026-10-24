"use client";

import React from "react";
import { CheckCircle2, AlertTriangle, AlertOctagon, Info } from "lucide-react";

interface ValidationWarning {
  severity: "error" | "warning" | "info";
  category: string;
  message: string;
  details: string;
}

interface ValidationData {
  is_valid: boolean;
  warnings: ValidationWarning[];
  stats: Record<string, number>;
}

interface ValidationBannerProps {
  validation: ValidationData | null;
}

export default function ValidationBanner({ validation }: ValidationBannerProps) {
  if (!validation) return null;

  const { is_valid, warnings, stats } = validation;
  const errors = warnings.filter((w) => w.severity === "error");
  const warnList = warnings.filter((w) => w.severity === "warning");

  if (is_valid && warnings.length === 0) {
    return (
      <div className="bg-emerald-950/40 border-b border-emerald-800/40 px-4 py-2 text-xs flex items-center justify-between text-emerald-300">
        <div className="flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-medium">
            Markup Integrity Verified: All templates, wikilinks, citations, and structural tags are 100% preserved.
          </span>
        </div>
        <div className="flex items-center space-x-4 text-[11px] text-emerald-400/80 font-mono">
          <span>Templates: {stats?.revised_templates ?? 0}</span>
          <span>Wikilinks: {stats?.revised_wikilinks ?? 0}</span>
          <span>Citations: {stats?.revised_references ?? 0}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`border-b px-4 py-2 text-xs ${
        errors.length > 0
          ? "bg-rose-950/60 border-rose-800/50 text-rose-200"
          : "bg-amber-950/50 border-amber-800/40 text-amber-200"
      }`}
    >
      <div className="max-w-7xl mx-auto space-y-1">
        <div className="flex items-center space-x-2 font-semibold">
          {errors.length > 0 ? (
            <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          )}
          <span>
            {errors.length > 0
              ? `Syntax Error Detected (${errors.length}): Review before saving`
              : `Wikitext Validation Notices (${warnings.length})`}
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1 text-[11px]">
          {warnings.map((w, idx) => (
            <div
              key={idx}
              className={`p-1.5 rounded flex items-start space-x-2 ${
                w.severity === "error"
                  ? "bg-rose-900/40 text-rose-300"
                  : w.severity === "warning"
                  ? "bg-amber-900/40 text-amber-300"
                  : "bg-blue-900/30 text-blue-300"
              }`}
            >
              <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">{w.message}</p>
                <p className="opacity-80 text-[10px]">{w.details}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
