"use client";

import Image from "next/image";
import { startTransition, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import type {
  AnalyzeResponse,
  ProviderHealthStatus,
  ProviderPreference,
  ProviderResult,
  Verdict
} from "@/lib/types";

type SubmitState = "idle" | "loading" | "success" | "error";

const demoText =
  "AI detector scores often conflict, so this draft intentionally sounds polished and neutral to test provider disagreement. The app should aggregate detector outputs, keep failures visible, and help a human review the spread before trusting any single number.";

const providerMeta = {
  zerogpt: {
    name: "ZEROGPT",
    logoPath: "/providers/zerogpt.png",
    logoAlt: "ZeroGPT logo"
  },
  gptzero: {
    name: "GPTZERO",
    logoPath: "/providers/gptzero.png",
    logoAlt: "GPTZero logo"
  },
  quillbot: {
    name: "QUILLBOT",
    logoPath: "/providers/quillbot.jpg",
    logoAlt: "QuillBot logo"
  }
} as const;

const verdictLabel: Record<Verdict, string> = {
  likely_ai: "LIKELY AI",
  mixed: "MIXED",
  likely_human: "LIKELY HUMAN",
  inconclusive: "INCONCLUSIVE"
};

export function DetectorShell() {
  const [text, setText] = useState("");
  const [providerPreference, setProviderPreference] =
    useState<ProviderPreference>("all");
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

        if (!response.ok) {
          throw new Error("Provider status request failed.");
        }

        const data = (await response.json()) as { providers: ProviderHealthStatus[] };

        if (!cancelled) {
          setProviderStatuses(data.providers);
        }
      } catch {
        if (!cancelled) {
          setProviderStatuses([]);
        }
      }
    }

    void loadProviders();

    return () => {
      cancelled = true;
    };
  }, []);

  const trimmedText = text.trim();
  const charCount = trimmedText.length;
  const canSubmit = charCount >= 100 && charCount <= 15000 && status !== "loading";

  const providersInMode = useMemo(
    () =>
      providerStatuses.filter((provider) => {
        if (!provider.enabled) return false;
        if (providerPreference === "stable-only") return provider.class === "public";
        return true;
      }),
    [providerStatuses, providerPreference]
  );

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
        throw new Error(
          "error" in data ? data.error || "Analysis failed." : "Analysis failed."
        );
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

  const successfulProviders =
    result?.providers.filter(
      (provider): provider is Extract<ProviderResult, { status: "success" }> =>
        provider.status === "success"
    ) ?? [];

  const healthyEnabledProviders = providerStatuses.filter(
    (provider) => provider.enabled && provider.healthy
  ).length;

  return (
    <main className="min-h-screen bg-[linear-gradient(145deg,#f8f8f8_0%,#eef1f4_100%)] text-[#0f172a]">
      <div className="mx-auto grid min-h-screen max-w-[1400px] grid-cols-1 gap-4 p-4 lg:grid-cols-[240px_minmax(0,1fr)_260px]">
        <aside className="rounded-2xl bg-[linear-gradient(90deg,#a8a8a8_0%,#7d7d7d_100%)] p-6 text-black">
          <div className="space-y-4">
            <Image
              src="/signal-draft-logo.png"
              alt="Signal Draft"
              width={190}
              height={70}
              className="h-auto w-full max-w-[190px]"
              priority
            />
            <p className="text-sm tracking-wide">SIGNAL DRAFT</p>
          </div>

          <div className="mt-10 text-[28px] leading-tight">other<br />webpages<br />(future)</div>

          <div className="mt-10 space-y-3 text-sm">
            <p className="font-semibold">Mode</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setProviderPreference("all")}
                className={`rounded-full border px-3 py-1.5 text-xs ${
                  providerPreference === "all"
                    ? "border-black bg-black text-white"
                    : "border-black/40 bg-white/50"
                }`}
              >
                ALL
              </button>
              <button
                type="button"
                onClick={() => setProviderPreference("stable-only")}
                className={`rounded-full border px-3 py-1.5 text-xs ${
                  providerPreference === "stable-only"
                    ? "border-black bg-black text-white"
                    : "border-black/40 bg-white/50"
                }`}
              >
                STABLE
              </button>
            </div>
          </div>

          <p className="mt-20 text-2xl">Log in (future)</p>
        </aside>

        <section className="rounded-2xl p-2 sm:p-4">
          <form onSubmit={handleSubmit}>
            <h1 className="mb-5 text-center text-3xl tracking-wide">ENTER TEXT</h1>

            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Paste text to analyze..."
              spellCheck={false}
              className="h-[300px] w-full rounded-2xl border-4 border-[#8a8a8a] bg-white px-6 py-4 text-base outline-none"
            />

            <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
              <span>{charCount} chars (min 100, max 15000)</span>
              <span>{healthyEnabledProviders}/{providerStatuses.length || 0} providers healthy</span>
            </div>

            <div className="mt-6 flex flex-wrap justify-center gap-8">
              <button
                type="button"
                onClick={() => {
                  if (!text.trim()) {
                    setText(demoText);
                    return;
                  }
                  setText((prev) => prev.replace(/\s+/g, " ").trim());
                }}
                className="min-w-[160px] rounded-2xl border-4 border-black bg-white px-8 py-3 text-2xl"
              >
                HUMANIZE
              </button>
              <button
                type="submit"
                disabled={!canSubmit}
                className="min-w-[160px] rounded-2xl border-4 border-black bg-white px-8 py-3 text-2xl disabled:cursor-not-allowed disabled:opacity-40"
              >
                {status === "loading" ? "CHECKING..." : "CHECK"}
              </button>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
              {(Object.keys(providerMeta) as Array<keyof typeof providerMeta>).map((id) => (
                <div key={id} className="flex items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3">
                  <Image
                    src={providerMeta[id].logoPath}
                    alt={providerMeta[id].logoAlt}
                    width={24}
                    height={24}
                    className="h-6 w-6 rounded-sm object-cover"
                  />
                  <span className="text-lg tracking-wide">{providerMeta[id].name}</span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-center text-xs text-slate-500">TODO: replace provider icons if higher quality brand assets are provided.</p>
          </form>
        </section>

        <aside className="rounded-2xl border-4 border-black bg-[#f2f2f2] p-5">
          <h2 className="text-3xl tracking-wide">RESULTS</h2>

          {status === "loading" && <p className="mt-6 text-lg">Running analysis...</p>}

          {status === "error" && (
            <p className="mt-6 text-lg text-red-700">{error || "Analysis failed."}</p>
          )}

          {result && status !== "loading" && (
            <div className="mt-6 space-y-4">
              <p className="text-4xl leading-tight">{verdictLabel[result.summary.verdict]}</p>
              <p className="text-sm">confidence: {result.summary.confidence}/100</p>
              <p className="text-sm">
                completed: {result.summary.completedProviders}/{result.summary.totalProviders}
              </p>

              <div className="rounded-xl border border-slate-300 bg-white p-3 text-sm">
                {successfulProviders.length > 0 ? (
                  <ul className="space-y-1">
                    {successfulProviders.map((provider) => (
                      <li key={provider.provider}>
                        {providerMeta[provider.provider].name}: {provider.score}% ({provider.durationMs}ms)
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No successful provider scores.</p>
                )}
              </div>
            </div>
          )}

          {!result && status !== "loading" && status !== "error" && (
            <div className="mt-8 text-4xl leading-tight">
              LIKELY HUMAN
              <br />
              or
              <br />
              LIKELY AI
            </div>
          )}

          {(result?.warnings.length ?? 0) > 0 && (
            <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm">
              <p className="mb-1 font-semibold">Warnings</p>
              <ul className="list-disc pl-5">
                {result?.warnings.map((warning, index) => <li key={index}>{warning}</li>)}
              </ul>
            </div>
          )}

          <div className="mt-6 rounded-xl border border-slate-300 bg-white p-3 text-sm">
            <p className="font-semibold">Provider status</p>
            {providerStatuses.length === 0 ? (
              <p className="mt-1 text-slate-500">Unavailable</p>
            ) : (
              <ul className="mt-1 space-y-1">
                {providerStatuses.map((provider) => (
                  <li key={provider.id}>
                    {providerMeta[provider.id].name}: {provider.enabled ? (provider.healthy ? "healthy" : "degraded") : "disabled"}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}
