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
    <main className="min-h-screen bg-[radial-gradient(circle_at_10%_10%,#f8fafc_0%,#eff3f7_35%,#e8edf3_100%)] text-slate-900">
      <div className="mx-auto grid min-h-screen w-full max-w-[1520px] grid-cols-1 gap-4 p-4 md:gap-5 md:p-6 xl:grid-cols-[260px_minmax(0,1fr)_330px] xl:gap-6 xl:p-8">
        <aside className="order-2 rounded-3xl border border-white/70 bg-[linear-gradient(180deg,#f9fbfc_0%,#edf1f5_100%)] p-5 shadow-[0_20px_60px_-42px_rgba(15,23,42,0.5)] md:p-6 xl:order-1 xl:sticky xl:top-8 xl:h-fit">
          <div className="space-y-4">
            <Image
              src="/signal-draft-logo.png"
              alt="Signal Draft"
              width={196}
              height={72}
              className="h-auto w-[170px]"
              priority
            />
            <p className="text-xs font-medium uppercase tracking-[0.26em] text-slate-500">
              Signal Draft
            </p>
          </div>

          <div className="mt-8 rounded-2xl border border-slate-200/80 bg-white/70 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Workspace</p>
            <p className="mt-2 text-[15px] leading-6 text-slate-700">Other webpages integration is planned for a future release.</p>
          </div>

          <div className="mt-8 space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Mode</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setProviderPreference("all")}
                className={`rounded-xl border px-3 py-2 text-xs font-semibold tracking-[0.14em] transition-colors ${
                  providerPreference === "all"
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                ALL
              </button>
              <button
                type="button"
                onClick={() => setProviderPreference("stable-only")}
                className={`rounded-xl border px-3 py-2 text-xs font-semibold tracking-[0.14em] transition-colors ${
                  providerPreference === "stable-only"
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                STABLE
              </button>
            </div>
          </div>

          <p className="mt-10 text-sm text-slate-500">Account access and shared projects are coming soon.</p>
        </aside>

        <section className="order-1 rounded-3xl border border-white/70 bg-white/75 p-4 shadow-[0_20px_60px_-42px_rgba(15,23,42,0.55)] backdrop-blur-sm md:p-6 lg:p-8 xl:order-2">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">Input workspace</h1>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                {charCount} / 15000 chars
              </span>
            </div>

            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Paste text to analyze..."
              spellCheck={false}
              className="h-[290px] w-full resize-y rounded-2xl border border-slate-200 bg-white px-5 py-4 text-[15px] leading-6 text-slate-800 shadow-inner outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 md:h-[340px]"
            />

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 md:text-sm">
              <span>Minimum 100 chars required to run analysis.</span>
              <span>{healthyEnabledProviders}/{providerStatuses.length || 0} providers healthy</span>
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_1fr] lg:max-w-[420px]">
              <button
                type="button"
                onClick={() => {
                  if (!text.trim()) {
                    setText(demoText);
                    return;
                  }
                  setText((prev) => prev.replace(/\s+/g, " ").trim());
                }}
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold tracking-[0.12em] text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
              >
                HUMANIZE
              </button>
              <button
                type="submit"
                disabled={!canSubmit}
                className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold tracking-[0.14em] text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {status === "loading" ? "CHECKING..." : "CHECK"}
              </button>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 md:p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Providers</p>
                <span className="text-xs text-slate-500">{providersInMode.length} active in current mode</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {(Object.keys(providerMeta) as Array<keyof typeof providerMeta>).map((id) => {
                  const providerHealth = providerStatuses.find((provider) => provider.id === id);
                  const enabled = !!providerHealth?.enabled;
                  const healthy = !!providerHealth?.healthy;

                  return (
                    <div key={id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <Image
                          src={providerMeta[id].logoPath}
                          alt={providerMeta[id].logoAlt}
                          width={22}
                          height={22}
                          className="h-[22px] w-[22px] rounded-md object-cover"
                        />
                        <span className="text-xs font-semibold tracking-[0.12em] text-slate-700">{providerMeta[id].name}</span>
                      </div>
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          !enabled ? "bg-slate-300" : healthy ? "bg-emerald-500" : "bg-amber-500"
                        }`}
                        aria-label={enabled ? (healthy ? "healthy" : "degraded") : "disabled"}
                        title={enabled ? (healthy ? "healthy" : "degraded") : "disabled"}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </form>
        </section>

        <aside className="order-3 rounded-3xl border border-white/70 bg-[linear-gradient(180deg,#fdfefe_0%,#f3f6fa_100%)] p-5 shadow-[0_20px_60px_-42px_rgba(15,23,42,0.55)] md:p-6 xl:sticky xl:top-8 xl:h-fit">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Results summary</h2>

          {status === "loading" && <p className="mt-6 text-sm text-slate-700">Running analysis across selected providers…</p>}

          {status === "error" && (
            <p className="mt-6 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error || "Analysis failed."}
            </p>
          )}

          {result && status !== "loading" && (
            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xl font-semibold tracking-tight text-slate-900">{verdictLabel[result.summary.verdict]}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-500">Confidence</p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-slate-800"
                    style={{ width: `${Math.max(0, Math.min(100, result.summary.confidence))}%` }}
                  />
                </div>
                <p className="mt-2 text-sm text-slate-700">{result.summary.confidence}/100</p>
                <p className="mt-3 text-xs text-slate-500">
                  Completed {result.summary.completedProviders}/{result.summary.totalProviders} providers
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Provider outputs</p>
                {successfulProviders.length > 0 ? (
                  <ul className="mt-3 space-y-2">
                    {successfulProviders.map((provider) => (
                      <li key={provider.provider} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2">
                        <span className="text-xs font-medium text-slate-700">{providerMeta[provider.provider].name}</span>
                        <span className="text-xs text-slate-600">{provider.score}% · {provider.durationMs}ms</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-slate-500">No successful provider scores.</p>
                )}
              </div>
            </div>
          )}

          {!result && status !== "loading" && status !== "error" && (
            <p className="mt-6 text-sm leading-6 text-slate-600">
              Submit text to see aggregate verdict, confidence, and per-provider scores.
            </p>
          )}

          {(result?.warnings.length ?? 0) > 0 && (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <p className="mb-1 font-semibold">Warnings</p>
              <ul className="list-disc space-y-1 pl-5">
                {result?.warnings.map((warning, index) => <li key={index}>{warning}</li>)}
              </ul>
            </div>
          )}

          <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 text-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Provider health</p>
            {providerStatuses.length === 0 ? (
              <p className="mt-2 text-slate-500">Unavailable</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {providerStatuses.map((provider) => (
                  <li key={provider.id} className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-medium text-slate-700">{providerMeta[provider.id].name}</span>
                    <span
                      className={`rounded-full px-2 py-1 ${
                        !provider.enabled
                          ? "bg-slate-100 text-slate-500"
                          : provider.healthy
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {provider.enabled ? (provider.healthy ? "healthy" : "degraded") : "disabled"}
                    </span>
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
