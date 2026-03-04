"use client";

import { startTransition, useDeferredValue, useEffect, useState } from "react";
import type { FormEvent } from "react";
import type {
  AnalyzeResponse,
  ProviderHealthStatus,
  ProviderPreference
} from "@/lib/types";

type SubmitState = "idle" | "loading" | "success" | "error";

const demoText =
  "Paste a paragraph, article excerpt, or admissions essay here. Signal Draft compares multiple detector providers, normalizes the scores, and shows whether they agree or conflict.";

export function DetectorShell() {
  const [text, setText] = useState("");
  const deferredText = useDeferredValue(text);
  const [providerPreference, setProviderPreference] = useState<ProviderPreference>("all");
  const [status, setStatus] = useState<SubmitState>("idle");
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [providerStatuses, setProviderStatuses] = useState<ProviderHealthStatus[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadProviders() {
      try {
        const response = await fetch("/api/providers/status", {
          method: "GET",
          cache: "no-store"
        });
        if (!response.ok) throw new Error();

        const data = (await response.json()) as { providers: ProviderHealthStatus[] };
        if (!cancelled) setProviderStatuses(data.providers);
      } catch {
        if (!cancelled) setProviderStatuses([]);
      }
    }

    void loadProviders();
    return () => { cancelled = true; };
  }, []);

  const charCount = deferredText.trim().length;
  const wordCount = deferredText.trim() ? deferredText.trim().split(/\s+/).length : 0;
  const tokenEstimate = Math.ceil(charCount / 4);
  const canSubmit = charCount >= 100 && charCount <= 15000 && status !== "loading";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setError(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, providerPreference })
      });

      const data = (await response.json()) as AnalyzeResponse | { error?: string };
      if (!response.ok) {
        throw new Error("error" in data ? data.error || "Analysis failed." : "Analysis failed.");
      }

      startTransition(() => {
        setResult(data as AnalyzeResponse);
        setStatus("success");
      });
    } catch (submitError) {
      setResult(null);
      setStatus("error");
      setError(submitError instanceof Error ? submitError.message : "Analysis failed.");
    }
  }

  return (
    <main className="min-h-screen bg-[#faf9f6] text-slate-900 font-sans selection:bg-black selection:text-white">
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 z-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#d1d5db 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
      
      <div className="relative z-10 mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        
        {/* Header */}
        <header className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium uppercase tracking-wider text-slate-500 shadow-sm mb-6">
            <span className="flex h-2 w-2 rounded-full bg-indigo-500"></span>
            Signal Draft Analysis
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl mb-4">
            Cross-Check AI Detectors
          </h1>
          <p className="mx-auto max-w-2xl text-base text-slate-600">
            Compare results from multiple engines to cut through the noise. We normalize scores and highlight conflicts so you don't have to trust just one source.
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-12">
          
          {/* Main Input Column */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              
              {/* Editor Card */}
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-5 py-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Document Text</span>
                  <button
                    type="button"
                    onClick={() => setText(demoText)}
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
                  >
                    Load Sample
                  </button>
                </div>
                
                <textarea
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  placeholder="Paste your content here..."
                  className="w-full resize-y border-none bg-transparent p-5 text-base leading-relaxed text-slate-800 placeholder-slate-400 focus:ring-0 min-h-[300px]"
                />
                
                {/* Metrics Footer */}
                <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-5 py-3 text-xs font-medium text-slate-500">
                  <div className="flex gap-4">
                    <span>{charCount} <span className="text-slate-400 font-normal">chars</span></span>
                    <span>{wordCount} <span className="text-slate-400 font-normal">words</span></span>
                  </div>
                  <ValidationHint charCount={charCount} />
                </div>
              </div>

              {/* Controls */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
                <div className="flex w-full sm:w-auto p-1 bg-slate-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setProviderPreference("all")}
                    className={`flex-1 sm:flex-none px-4 py-2 text-sm font-medium rounded-lg transition-all ${providerPreference === "all" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    All Engines
                  </button>
                  <button
                    type="button"
                    onClick={() => setProviderPreference("stable-only")}
                    className={`flex-1 sm:flex-none px-4 py-2 text-sm font-medium rounded-lg transition-all ${providerPreference === "stable-only" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    Stable Only
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="w-full sm:w-auto rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-medium text-white shadow-md transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none mr-1"
                >
                  {status === "loading" ? "Scanning..." : "Run Analysis"}
                </button>
              </div>
              {error && <p className="text-sm text-red-500 font-medium px-2">{error}</p>}
            </form>

            {/* Provider Status Pill list */}
            <div className="flex flex-wrap gap-2 px-1">
              {providerStatuses.map((provider) => (
                <div key={provider.id} className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 shadow-sm">
                  <span className={`h-1.5 w-1.5 rounded-full ${provider.enabled ? (provider.healthy ? "bg-emerald-500" : "bg-amber-500") : "bg-slate-300"}`}></span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">{provider.id}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Results Column */}
          <div className="lg:col-span-5">
            <div className="sticky top-8 flex flex-col gap-6">
              {status === "idle" && !result && (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-8 text-center text-slate-500 h-[400px] flex flex-col items-center justify-center">
                  <svg className="w-8 h-8 text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  <p className="text-sm font-medium text-slate-900">Awaiting Input</p>
                  <p className="mt-1 text-xs">Submit text to view the aggregate verdict.</p>
                </div>
              )}

              {status === "loading" && (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm h-[400px] flex flex-col items-center justify-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent mb-4"></div>
                  <p className="text-sm font-medium text-slate-900 animate-pulse">Running providers...</p>
                </div>
              )}

              {result && status === "success" && (
                <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  
                  {/* Master Verdict Card */}
                  <div className="rounded-2xl border border-slate-900 bg-slate-900 p-6 text-white shadow-xl">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Final Verdict</p>
                    <p className="mt-2 text-4xl font-bold tracking-tight capitalize">
                      {result.summary.verdict.replace("_", " ")}
                    </p>
                    <p className="mt-3 text-sm text-slate-300">
                      Confidence: <span className="font-semibold text-white">{result.summary.confidence}/100</span>
                      <span className="mx-2 opacity-50">|</span>
                      Based on {result.summary.completedProviders} of {result.summary.totalProviders} engines
                    </p>
                  </div>

                  {/* Individual Providers */}
                  <div className="flex flex-col gap-3">
                    {result.providers.map((provider) => (
                      <div key={provider.provider} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{provider.provider}</p>
                          {provider.status === "success" ? (
                            <p className="mt-1 text-lg font-semibold text-slate-900">{provider.score}% AI</p>
                          ) : (
                            <p className="mt-1 text-sm text-amber-600 max-w-[200px] truncate" title={provider.message}>Failed: {provider.errorCode}</p>
                          )}
                        </div>
                        {provider.status === "success" ? (
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-xs ${getScoreColor(provider.score ?? 0)}`}>
                            {provider.score}
                          </div>
                        ) : (
                          <div className="h-2 w-2 rounded-full bg-amber-500"></div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Warnings */}
                  {result.warnings.length > 0 && (
                    <div className="mt-2 rounded-xl bg-amber-50 p-4 border border-amber-200">
                      <div className="flex gap-2">
                        <span className="text-amber-500">⚠️</span>
                        <div className="text-sm text-amber-800">
                          {result.warnings.map((w, i) => <p key={i}>{w}</p>)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}

function getScoreColor(score: number) {
  if (score < 30) return "bg-emerald-100 text-emerald-800";
  if (score < 70) return "bg-amber-100 text-amber-800";
  return "bg-rose-100 text-rose-800";
}

function ValidationHint({ charCount }: { charCount: number }) {
  if (charCount === 0) return <span>Minimum 100 chars required</span>;
  if (charCount < 100) return <span className="text-amber-600">{100 - charCount} more chars needed</span>;
  if (charCount > 15000) return <span className="text-rose-600">Too long (max 15k)</span>;
  return <span className="text-emerald-600">Ready to scan</span>;
}