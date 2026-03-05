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
    <main className="min-h-screen bg-[radial-gradient(circle_at_20%_10%,#f8f4e8_0%,#f5efe0_38%,#eee5d2_100%)] text-[#3f3328]">
      <div className="mx-auto grid min-h-screen w-full max-w-[1520px] grid-cols-1 gap-4 p-4 md:gap-5 md:p-6 xl:grid-cols-[260px_minmax(0,1fr)_330px] xl:gap-6 xl:p-8">
        <aside className="order-2 flex rounded-3xl border border-[#e6dbc6] bg-[linear-gradient(180deg,#f8f1e3_0%,#efe4cf_100%)] p-5 shadow-[0_20px_60px_-42px_rgba(84,60,36,0.4)] md:p-6 xl:order-1 xl:sticky xl:top-8 xl:h-fit xl:min-h-[calc(100vh-4rem)] xl:flex-col">
          <div className="space-y-4">
            <Image
              src="/signal-draft-logo-2026.png"
              alt="Signal Draft"
              width={220}
              height={88}
              className="h-auto w-[184px]"
              priority
            />
          </div>

          <div className="mt-8 space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6b5a45]">Mode</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setProviderPreference("all")}
                className={`rounded-xl border px-3 py-2 text-xs font-semibold tracking-[0.14em] transition-colors ${
                  providerPreference === "all"
                    ? "border-[#4f3b2d] bg-[#4f3b2d] text-[#fff9ef]"
                    : "border-[#cdbda5] bg-[#f8f2e6] text-[#4f3b2d] hover:bg-[#f2e7d4]"
                }`}
              >
                ALL
              </button>
              <button
                type="button"
                onClick={() => setProviderPreference("stable-only")}
                className={`rounded-xl border px-3 py-2 text-xs font-semibold tracking-[0.14em] transition-colors ${
                  providerPreference === "stable-only"
                    ? "border-[#4f3b2d] bg-[#4f3b2d] text-[#fff9ef]"
                    : "border-[#cdbda5] bg-[#f8f2e6] text-[#4f3b2d] hover:bg-[#f2e7d4]"
                }`}
              >
                STABLE
              </button>
            </div>
          </div>

          <p className="mt-10 text-sm text-[#6f5e4a]">Account access and shared projects are coming soon.</p>
          <p className="mt-10 text-xs uppercase tracking-[0.18em] text-[#8b7a63] xl:mt-auto">2026 Signal Draft</p>
        </aside>

        <section className="order-1 rounded-3xl border border-[#e8dcc8] bg-[linear-gradient(180deg,rgba(255,251,243,0.88)_0%,rgba(247,238,223,0.88)_100%)] p-4 shadow-[0_20px_60px_-42px_rgba(84,60,36,0.45)] backdrop-blur-sm md:p-6 lg:p-8 xl:order-2">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-[#3e2f22] md:text-3xl">Input workspace</h1>
              <span className="rounded-full border border-[#d8c8af] bg-[#fdf8ef] px-3 py-1 text-xs font-medium text-[#6e5c47]">
                {charCount} / 15000 chars
              </span>
            </div>

            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Paste text to analyze..."
              spellCheck={false}
              className="h-[290px] w-full resize-y rounded-2xl border border-[#d8c8af] bg-[#fffdf7] px-5 py-4 text-[16px] leading-7 text-[#3e3024] shadow-inner outline-none transition focus:border-[#a98f70] focus:ring-2 focus:ring-[#e5d8c3] md:h-[340px]"
            />

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#74624e] md:text-sm">
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
                className="rounded-xl border border-[#cdbda5] bg-[#f8f2e6] px-5 py-3 text-sm font-semibold tracking-[0.12em] text-[#4f3b2d] transition hover:border-[#b8a184] hover:bg-[#f2e7d4]"
              >
                HUMANIZE
              </button>
              <button
                type="submit"
                disabled={!canSubmit}
                className="rounded-xl bg-[#4f3b2d] px-5 py-3 text-sm font-semibold tracking-[0.14em] text-[#fff9ef] transition hover:bg-[#402f23] disabled:cursor-not-allowed disabled:bg-[#c9b8a1]"
              >
                {status === "loading" ? "CHECKING..." : "CHECK"}
              </button>
            </div>

            <div className="rounded-2xl border border-[#dac9af] bg-[#f8f1e4]/80 p-4 md:p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6b5a45]">Providers</p>
                <span className="text-xs text-[#74624e]">{providersInMode.length} active in current mode</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {(Object.keys(providerMeta) as Array<keyof typeof providerMeta>).map((id) => {
                  const providerHealth = providerStatuses.find((provider) => provider.id === id);
                  const enabled = !!providerHealth?.enabled;
                  const healthy = !!providerHealth?.healthy;

                  return (
                    <div key={id} className="flex items-center justify-between rounded-xl border border-[#ddceb7] bg-[#fffaf0] px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <Image
                          src={providerMeta[id].logoPath}
                          alt={providerMeta[id].logoAlt}
                          width={22}
                          height={22}
                          className="h-[22px] w-[22px] rounded-md object-cover"
                        />
                        <span className="text-xs font-semibold tracking-[0.12em] text-[#4b3a2b]">{providerMeta[id].name}</span>
                      </div>
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          !enabled ? "bg-[#a89d90]" : healthy ? "bg-emerald-500" : "bg-amber-500"
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

        <aside className="order-3 rounded-3xl border border-[#e8dcc8] bg-[linear-gradient(180deg,#fffaf1_0%,#f3e7d4_100%)] p-5 shadow-[0_20px_60px_-42px_rgba(84,60,36,0.45)] md:p-6 xl:sticky xl:top-8 xl:h-fit">
          <h2 className="text-base font-semibold uppercase tracking-[0.16em] text-[#5a4633] md:text-lg">Results summary</h2>

          {status === "loading" && <p className="mt-6 text-base text-[#4f3d2e]">Running analysis across selected providers…</p>}

          {status === "error" && (
            <p className="mt-6 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-base text-red-700">
              {error || "Analysis failed."}
            </p>
          )}

          {result && status !== "loading" && (
            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-[#ddceb8] bg-[#fffdf8] p-5">
                <p className="text-2xl font-semibold tracking-tight text-[#3f3125] md:text-3xl">{verdictLabel[result.summary.verdict]}</p>
                <p className="mt-3 text-sm uppercase tracking-[0.16em] text-[#75614d]">Confidence</p>
                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[#e8dcc8]">
                  <div
                    className="h-full rounded-full bg-[#5a4633]"
                    style={{ width: `${Math.max(0, Math.min(100, result.summary.confidence))}%` }}
                  />
                </div>
                <p className="mt-3 text-lg font-medium text-[#4f3d2f]">{result.summary.confidence}/100</p>
                <p className="mt-3 text-sm text-[#7a6753]">
                  Completed {result.summary.completedProviders}/{result.summary.totalProviders} providers
                </p>
              </div>

              <div className="rounded-2xl border border-[#ddceb8] bg-[#fffdf8] p-4 text-base">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6b5a45]">Provider outputs</p>
                {successfulProviders.length > 0 ? (
                  <ul className="mt-3 space-y-2">
                    {successfulProviders.map((provider) => (
                      <li key={provider.provider} className="flex items-center justify-between gap-2 rounded-lg bg-[#f7efdf] px-3 py-2">
                        <span className="text-sm font-medium text-[#4f3d2f]">{providerMeta[provider.provider].name}</span>
                        <span className="text-sm text-[#665340]">{provider.score}% · {provider.durationMs}ms</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-[#7d6b57]">No successful provider scores.</p>
                )}
              </div>
            </div>
          )}

          {!result && status !== "loading" && status !== "error" && (
            <p className="mt-6 text-base leading-7 text-[#665340]">
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
        </aside>
      </div>
    </main>
  );
}
