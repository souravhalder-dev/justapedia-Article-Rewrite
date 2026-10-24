"use client";

import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import ArticleHeader from "@/components/ArticleHeader";
import ControlsBar, { SectionItem, REWRITE_MODES } from "@/components/ControlsBar";
import ValidationBanner from "@/components/ValidationBanner";
import SideBySideEditor from "@/components/SideBySideEditor";
import DiffViewer from "@/components/DiffViewer";
import AuditSuggestions, { FindingItem } from "@/components/AuditSuggestions";
import WikiPreview from "@/components/WikiPreview";
import SaveModal from "@/components/SaveModal";
import LoginModal from "@/components/LoginModal";
import SettingsModal from "@/components/SettingsModal";
import { Edit3, GitCompare, CheckSquare, Eye, Sparkles, BookOpen, AlertCircle } from "lucide-react";

export default function Home() {
  // Connection and Authentication
  const [endpoint, setEndpoint] = useState<string>("https://justapedia.org/api.php");
  const [user, setUser] = useState<{ logged_in: boolean; username: string | null; rights?: string[] } | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // AI Configuration
  const [useAi, setUseAi] = useState<boolean>(false);
  const [geminiApiKey, setGeminiApiKey] = useState<string>("");
  const [userInstructions, setUserInstructions] = useState<string>("");
  const [aiConfigured, setAiConfigured] = useState<boolean>(false);

  // Article State
  const [articleMeta, setArticleMeta] = useState<any | null>(null);
  const [originalWikitext, setOriginalWikitext] = useState<string>("");
  const [revisedWikitext, setRevisedWikitext] = useState<string>("");
  const [generatedWikitext, setGeneratedWikitext] = useState<string>("");

  // Transformation and Scope
  const [mode, setMode] = useState<string>("american_conversion");
  const [sectionIndex, setSectionIndex] = useState<number | null>(null);
  const [sections, setSections] = useState<SectionItem[]>([]);

  // Findings, Diff and Validation
  const [findings, setFindings] = useState<FindingItem[]>([]);
  const [diffRows, setDiffRows] = useState<any[]>([]);
  const [unifiedDiff, setUnifiedDiff] = useState<string>("");
  const [validation, setValidation] = useState<any | null>(null);

  // HTML Preview
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [previewCategories, setPreviewCategories] = useState<string[]>([]);
  const [isPreviewLoading, setIsPreviewLoading] = useState<boolean>(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<"editor" | "diff" | "audit" | "preview">("editor");

  // Loading States and Notifications
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  // Modals
  const [loginModalOpen, setLoginModalOpen] = useState<boolean>(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState<boolean>(false);
  const [saveModalOpen, setSaveModalOpen] = useState<boolean>(false);

  // Check health and initial session on mount
  useEffect(() => {
    async function checkHealthAndUser() {
      try {
        const hRes = await fetch("/api/health");
        if (hRes.ok) {
          const hData = await hRes.json();
          setAiConfigured(Boolean(hData.ai_engine_configured));
        }

        const sid = localStorage.getItem("mw_session_id");
        if (sid) {
          setSessionId(sid);
          const uRes = await fetch("/api/wiki/user", {
            headers: { "X-Session-Id": sid },
          });
          if (uRes.ok) {
            const uData = await uRes.json();
            setUser(uData);
          }
        }
      } catch (err) {
        console.error("Health check error:", err);
      }
    }
    checkHealthAndUser();

    // Auto-fetch sample article on start
    handleFetch("Perfume (novel)");
  }, []);

  const showToast = (type: "success" | "error" | "info", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Fetch article
  const handleFetch = async (titleOrUrl: string) => {
    setIsFetching(true);
    setNotification(null);
    try {
      const res = await fetch("/api/wiki/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title_or_url: titleOrUrl, endpoint }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Failed to fetch article from wiki.");
      }

      setArticleMeta({
        pageid: data.pageid,
        title: data.title,
        original_requested_title: data.original_requested_title,
        is_redirect: data.is_redirect,
        redirect_note: data.redirect_note,
        revid: data.revid,
        timestamp: data.timestamp,
        last_user: data.last_user,
        size: data.size,
        is_protected: data.is_protected,
      });

      setOriginalWikitext(data.wikitext);
      setRevisedWikitext(data.wikitext);
      setGeneratedWikitext(data.wikitext);
      setDiffRows([]);
      setUnifiedDiff("");
      setPreviewHtml("");

      // Run background audit to populate sections
      try {
        const auditRes = await fetch("/api/audit/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wikitext: data.wikitext }),
        });
        if (auditRes.ok) {
          const auditData = await auditRes.json();
          setSections(auditData.sections || []);
          setFindings(auditData.findings || []);
        }
      } catch (e) {
        console.error("Section extraction error:", e);
      }

      showToast("success", `Retrieved '${data.title}' (Revision #${data.revid}).`);
    } catch (err: any) {
      showToast("error", err.message || "Failed to fetch article.");
    } finally {
      setIsFetching(false);
    }
  };

  // Execute Rewrite Mode
  const handleStartRewrite = async () => {
    if (!originalWikitext.trim()) {
      showToast("error", "Please fetch an article first.");
      return;
    }

    setIsProcessing(true);
    try {
      const res = await fetch("/api/rewrite/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wikitext: originalWikitext,
          mode,
          section_index: sectionIndex,
          use_ai: useAi,
          gemini_api_key: geminiApiKey || undefined,
          user_instructions: userInstructions || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Rewrite processing failed.");
      }

      setRevisedWikitext(data.revised_wikitext);
      setGeneratedWikitext(data.revised_wikitext);
      setFindings(data.findings || []);
      setDiffRows(data.diff || []);
      setUnifiedDiff(data.unified_diff || "");
      setValidation(data.validation || null);

      showToast(
        "success",
        `Completed '${REWRITE_MODES.find((m) => m.id === mode)?.title}' (${data.engine_used}).`
      );

      // Auto-switch to diff if modifications were made
      if (data.diff && data.diff.length > 0) {
        setActiveTab("diff");
      }
    } catch (err: any) {
      showToast("error", err.message || "Rewrite error occurred.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Run Audit Only
  const handleStartAudit = async () => {
    if (!originalWikitext.trim()) {
      showToast("error", "Please fetch an article first.");
      return;
    }

    setIsProcessing(true);
    try {
      const res = await fetch("/api/audit/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wikitext: revisedWikitext || originalWikitext,
          section_index: sectionIndex,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Audit execution failed.");
      }

      setFindings(data.findings || []);
      setActiveTab("audit");
      showToast("info", `Audit found ${data.total_issues} potential American English adjustments.`);
    } catch (err: any) {
      showToast("error", err.message || "Audit error occurred.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Toggle Finding Accept / Reject
  const handleToggleFinding = (id: string) => {
    setFindings((prev) =>
      prev.map((f) => (f.id === id ? { ...f, accepted: f.accepted === false ? true : false } : f))
    );
  };

  const handleAcceptAll = () => {
    setFindings((prev) => prev.map((f) => ({ ...f, accepted: true })));
  };

  const handleRejectAll = () => {
    setFindings((prev) => prev.map((f) => ({ ...f, accepted: false })));
  };

  // Apply Accepted Suggestions to Draft
  const handleApplyAcceptedSuggestions = async () => {
    const acceptedIds = findings.filter((f) => f.accepted !== false).map((f) => f.id);
    setIsProcessing(true);
    try {
      const res = await fetch("/api/rewrite/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wikitext: originalWikitext,
          mode: "american_conversion",
          section_index: sectionIndex,
          use_ai: false,
          accepted_finding_ids: acceptedIds,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to apply accepted suggestions.");

      setRevisedWikitext(data.revised_wikitext);
      setGeneratedWikitext(data.revised_wikitext);
      setDiffRows(data.diff || []);
      setUnifiedDiff(data.unified_diff || "");
      setValidation(data.validation || null);
      setActiveTab("diff");
      showToast("success", `Applied ${acceptedIds.length} accepted American English suggestions.`);
    } catch (err: any) {
      showToast("error", err.message || "Failed to apply suggestions.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Render HTML preview
  const handleOpenPreview = async () => {
    setActiveTab("preview");
    if (!articleMeta) return;

    setIsPreviewLoading(true);
    try {
      const res = await fetch("/api/wiki/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: articleMeta.title,
          wikitext: revisedWikitext || originalWikitext,
          endpoint,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "HTML preview generation failed.");

      setPreviewHtml(data.html || "");
      setPreviewCategories(data.categories || []);
    } catch (err: any) {
      showToast("error", err.message || "Preview render failed.");
    } finally {
      setIsPreviewLoading(false);
    }
  };

  // Discard draft
  const handleDiscardDraft = () => {
    setRevisedWikitext(originalWikitext);
    setDiffRows([]);
    setUnifiedDiff("");
    setValidation(null);
    showToast("info", "Draft discarded. Restored original article.");
  };

  // Handle Login
  const handleLogin = async (username: string, password: string, ep: string) => {
    const res = await fetch("/api/wiki/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, endpoint: ep }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Login failed.");

    const sid = data.session_id;
    if (sid) {
      localStorage.setItem("mw_session_id", sid);
      setSessionId(sid);
    }
    setUser({ logged_in: true, username: data.username, rights: data.rights });
    setEndpoint(ep);
    showToast("success", `Logged in as ${data.username}`);
    return data;
  };

  // Handle Logout
  const handleLogout = async () => {
    if (sessionId) {
      await fetch("/api/wiki/logout", {
        method: "POST",
        headers: { "X-Session-Id": sessionId },
      });
      localStorage.removeItem("mw_session_id");
    }
    setUser(null);
    setSessionId(null);
    showToast("info", "Logged out from MediaWiki.");
  };

  // Handle Save
  const handleSaveToWiki = async (summary: string, isDryRun: boolean) => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (sessionId) headers["X-Session-Id"] = sessionId;

    const res = await fetch("/api/wiki/save", {
      method: "POST",
      headers,
      body: JSON.stringify({
        title: articleMeta.title,
        wikitext: revisedWikitext,
        summary,
        basetimestamp: articleMeta.timestamp,
        expected_revid: articleMeta.revid,
        is_dry_run: isDryRun,
        endpoint,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Save operation failed.");

    if (!isDryRun && data.new_revid) {
      setArticleMeta((prev: any) => ({ ...prev, revid: data.new_revid, timestamp: data.new_timestamp }));
      setOriginalWikitext(revisedWikitext);
    }
    return data;
  };

  const hasChanges = revisedWikitext !== originalWikitext && originalWikitext.length > 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-900 selection:text-white">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-xl border text-xs flex items-center space-x-2 transition-all duration-300 ${
            notification.type === "success"
              ? "bg-emerald-950/90 border-emerald-500/50 text-emerald-200"
              : notification.type === "error"
              ? "bg-rose-950/90 border-rose-500/50 text-rose-200"
              : "bg-blue-950/90 border-blue-500/50 text-blue-200"
          }`}
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{notification.message}</span>
        </div>
      )}

      {/* Navbar */}
      <Navbar
        endpoint={endpoint}
        user={user}
        onOpenLogin={() => setLoginModalOpen(true)}
        onOpenSettings={() => setSettingsModalOpen(true)}
        onLogout={handleLogout}
        aiConfigured={aiConfigured}
        useAi={useAi}
        onToggleAi={() => setUseAi(!useAi)}
      />

      {/* Article Retrieval & Metadata Bar */}
      <ArticleHeader
        onFetch={handleFetch}
        isLoading={isFetching}
        articleMeta={articleMeta}
      />

      {/* Main Rewrite Controls Toolbar */}
      <ControlsBar
        mode={mode}
        onSelectMode={(m) => setMode(m)}
        sectionIndex={sectionIndex}
        onSelectSection={(idx) => setSectionIndex(idx)}
        sections={sections}
        onStartRewrite={handleStartRewrite}
        onStartAudit={handleStartAudit}
        onDiscardDraft={handleDiscardDraft}
        onOpenPreview={handleOpenPreview}
        onOpenSave={() => setSaveModalOpen(true)}
        isProcessing={isProcessing}
        hasChanges={hasChanges}
        canSave={Boolean(user?.logged_in)}
      />

      {/* Wikitext Structural Validation Warnings Banner */}
      <ValidationBanner validation={validation} />

      {/* Main Content Area with Navigation Tabs */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-4">
        {/* Workspace Tab Nav */}
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-2 text-xs font-semibold">
          <button
            onClick={() => setActiveTab("editor")}
            className={`flex items-center space-x-2 px-4 py-2 rounded-t-lg transition border-b-2 ${
              activeTab === "editor"
                ? "border-indigo-500 text-indigo-400 bg-slate-900/80"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Edit3 className="w-4 h-4" />
            <span>Side-by-Side Editor</span>
          </button>

          <button
            onClick={() => setActiveTab("diff")}
            className={`flex items-center space-x-2 px-4 py-2 rounded-t-lg transition border-b-2 ${
              activeTab === "diff"
                ? "border-indigo-500 text-indigo-400 bg-slate-900/80"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <GitCompare className="w-4 h-4" />
            <span>Visual Diff Comparison</span>
            {diffRows.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("audit")}
            className={`flex items-center space-x-2 px-4 py-2 rounded-t-lg transition border-b-2 ${
              activeTab === "audit"
                ? "border-indigo-500 text-indigo-400 bg-slate-900/80"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            <span>Consistency Audit & Suggestions</span>
            {findings.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-indigo-500/30 text-indigo-300 font-mono text-[10px]">
                {findings.length}
              </span>
            )}
          </button>

          <button
            onClick={handleOpenPreview}
            className={`flex items-center space-x-2 px-4 py-2 rounded-t-lg transition border-b-2 ${
              activeTab === "preview"
                ? "border-indigo-500 text-indigo-400 bg-slate-900/80"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>Live MediaWiki HTML Preview</span>
          </button>
        </div>

        {/* Tab Views */}
        <div>
          {activeTab === "editor" && (
            <SideBySideEditor
              originalText={originalWikitext}
              revisedText={revisedWikitext}
              onChangeRevised={(text) => setRevisedWikitext(text)}
              onResetRevised={() => setRevisedWikitext(generatedWikitext)}
            />
          )}

          {activeTab === "diff" && (
            <DiffViewer diffRows={diffRows} unifiedDiff={unifiedDiff} />
          )}

          {activeTab === "audit" && (
            <AuditSuggestions
              findings={findings}
              onToggleAccept={handleToggleFinding}
              onAcceptAll={handleAcceptAll}
              onRejectAll={handleRejectAll}
              onApplyToDraft={handleApplyAcceptedSuggestions}
            />
          )}

          {activeTab === "preview" && (
            <WikiPreview
              html={previewHtml}
              title={articleMeta?.title || "Article Preview"}
              categories={previewCategories}
              isLoading={isPreviewLoading}
            />
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900/60 py-4 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>
            MediaWiki American English Article Localization Tool &bull; Powered by Python FastAPI AST Engine
          </p>
          <div className="flex items-center space-x-4 text-slate-400">
            <span>Target: <span className="font-mono text-slate-300">{endpoint}</span></span>
            <span>Mode: <span className="text-slate-300">{useAi ? "AI + Rules" : "Deterministic"}</span></span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <LoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        endpoint={endpoint}
        onLogin={handleLogin}
      />

      <SettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        endpoint={endpoint}
        onSaveEndpoint={(ep) => setEndpoint(ep)}
        geminiApiKey={geminiApiKey}
        onSaveApiKey={(key) => setGeminiApiKey(key)}
        useAi={useAi}
        onToggleAi={(val) => setUseAi(val)}
        userInstructions={userInstructions}
        onSaveInstructions={(inst) => setUserInstructions(inst)}
      />

      <SaveModal
        isOpen={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        title={articleMeta?.title || "Article"}
        expectedRevid={articleMeta?.revid || null}
        basetimestamp={articleMeta?.timestamp || null}
        user={user}
        onSave={handleSaveToWiki}
        endpoint={endpoint}
      />
    </div>
  );
}
