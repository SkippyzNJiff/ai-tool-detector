"use client";

import { startTransition, useDeferredValue, useEffect, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import type {
  AnalyzeResponse,
  ProviderHealthStatus,
  ProviderPreference,
  ProviderResult,
  Verdict
} from "@/lib/types";

type SubmitState = "idle" | "loading" | "success" | "error";

const demoText =
  "AI detector scores are often treated like verdicts even when they conflict hard with each other. This sample paragraph is written to feel polished, neutral, and slightly formal so you can see how differently providers interpret the same passage. Signal Draft pulls the providers into one place, normalizes the output, and makes disagreement impossible to miss.";

const providerMeta = {
  zerogpt: {
    name: "ZeroGPT",
    caption: "Public baseline"
  },
  quillbot: {
    name: "QuillBot",
    caption: "Session-backed"
  },
  gptzero: {
    name: "GPTZero",
    caption: "Authenticated"
  }
} as const;

const verdictMeta: Record<
  Verdict,
  {
    label: string;
    eyebrow: string;
    summary: string;
    cardClass: string;
    meterClass: string;
  }
> = {
  likely_ai: {
    label: "Likely AI",
    eyebrow: "High AI probability",
    summary: "Most successful providers are leaning strongly toward generated writing.",
    cardClass: "border-rose-200 bg-rose-50 text-rose-950",
    meterClass: "bg-rose-500"
  },
  mixed: {
    label: "Mixed Signals",
    eyebrow: "Conflicting evidence",
    summary: "The providers disagree enough that this needs a human read, not a blind rule.",
    cardClass: "border-amber-200 bg-amber-50 text-amber-950",
    meterClass: "bg-amber-500"
  },
  likely_human: {
    label: "Likely Human",
    eyebrow: "Low AI probability",
    summary: "The provider set mostly reads this as human-authored or low-risk text.",
    cardClass: "border-emerald-200 bg-emerald-50 text-emerald-950",
    meterClass: "bg-emerald-500"
  },
  inconclusive: {
    label: "Inconclusive",
    eyebrow: "Limited evidence",
    summary: "There is not enough reliable signal to make a clean aggregate call.",
    cardClass: "border-slate-200 bg-slate-50 text-slate-900",
    meterClass: "bg-slate-500"
  }
};

export function DetectorShell() {
  const [text, setText] = useState("");
  const deferredText = useDeferredValue(text);
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

        const data = (await response.json()) as {
          providers: ProviderHealthStatus[];
        };

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

  const trimmedText = deferredText.trim();
  const charCount = trimmedText.length;
  const wordCount = trimmedText ? trimmedText.split(/\s+/).length : 0;
  const tokenEstimate = trimmedText ? Math.ceil(charCount / 4) : 0;
  const canSubmit = charCount >= 100 && charCount <= 15000 && status !== "loading";
  const readinessPercent = Math.min((charCount / 100) * 100, 100);

  const providersInMode = providerStatuses.filter((provider) => {
    if (!provider.enabled) {
      return false;
    }

    if (providerPreference === "stable-only") {
      return provider.class === "public";
    }

    return true;
  });

  const healthyProviders = providerStatuses.filter(
    (provider) => provider.enabled && provider.healthy
  ).length;
  const healthyProvidersInMode = providersInMode.filter((provider) => provider.healthy).length;

  const successfulProviders =
    result?.providers.filter(
      (provider): provider is Extract<ProviderResult, { status: "success" }> =>
        provider.status === "success"
    ) ?? [];

  const averageScore = successfulProviders.length
    ? Math.round(
        successfulProviders.reduce((total, provider) => total + provider.score, 0) /
          successfulProviders.length
      )
    : null;

  const scoreSpread =
    successfulProviders.length > 1
      ? Math.max(...successfulProviders.map((provider) => provider.score)) -
        Math.min(...successfulProviders.map((provider) => provider.score))
      : 0;

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
      setError(
        submitError instanceof Error ? submitError.message : "Analysis failed."
      );
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(242,162,76,0.2),transparent_24%),radial-gradient(circle_at_top_right,rgba(54,90,120,0.14),transparent_22%),linear-gradient(180deg,#f8f4ee_0%,#f1ece4_100%)] text-[#111827]">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="overflow-hidden rounded-[32px] border border-[#172033]/10 bg-[#10192a] px-6 py-6 text-white shadow-[0_30px_80px_rgba(15,23,42,0.18)] sm:px-8 sm:py-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#d9e1ec]">
              <span className="h-2 w-2 rounded-full bg-[#f2a24c]" />
              Signal Draft
            </div>
            <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#d9e1ec]">
              {providerPreference === "all" ? "Full Stack Mode" : "Stable Only Mode"}
            </div>
          </div>

          <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div>
              <h1 className="display-font max-w-3xl text-4xl leading-[0.95] text-white sm:text-5xl lg:text-6xl">
                Cross-check detectors without trusting a single score.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-[#c7d0dc] sm:text-lg">
                Paste a passage, run the enabled providers, and read the aggregate
                verdict alongside the disagreement. The UI is built to help you
                compare signal, not admire decoration.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <HeaderStat
                label="Providers online"
                value={
                  providerStatuses.length
                    ? `${healthyProviders}/${providerStatuses.length}`
                    : "Checking"
                }
                detail="Healthy enabled providers across the environment"
              />
              <HeaderStat
                label="Draft size"
                value={tokenEstimate ? `${tokenEstimate} tok` : "0 tok"}
                detail="Rough token estimate from current input"
              />
              <HeaderStat
                label="Current scan"
                value={
                  providersInMode.length
                    ? `${healthyProvidersInMode}/${providersInMode.length}`
                    : "0/0"
                }
                detail="Providers available in the selected mode"
              />
            </div>
          </div>
        </header>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.18fr)_390px]">
          <section className="space-y-6">
            <form
              onSubmit={handleSubmit}
              className="overflow-hidden rounded-[30px] border border-black/10 bg-white/85 shadow-[0_22px_55px_rgba(15,23,42,0.08)] backdrop-blur"
            >
              <div className="border-b border-black/10 px-5 py-5 sm:px-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="max-w-2xl">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#7b8795]">
                      Text Workspace
                    </p>
                    <h2 className="display-font mt-2 text-3xl text-[#111827] sm:text-[2.2rem]">
                      Paste the passage you want to inspect
                    </h2>
                    <p className="mt-3 text-sm leading-6 text-[#5f6b79] sm:text-base">
                      Use a full paragraph or longer when possible. Short samples
                      make detectors swing wildly.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setText(demoText)}
                      className="rounded-full border border-[#d8cfc1] bg-[#f7f2e9] px-4 py-2 text-sm font-semibold text-[#172033] transition hover:-translate-y-0.5"
                    >
                      Load sample
                    </button>
                    <button
                      type="button"
                      onClick={() => setText("")}
                      className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-[#5f6b79] transition hover:-translate-y-0.5 hover:text-[#172033]"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>

              <div className="px-5 py-5 sm:px-6">
                <textarea
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  placeholder="Paste the text you need to analyze. Signal Draft will compare enabled providers and show where they agree or split."
                  spellCheck={false}
                  className="min-h-[360px] w-full resize-y rounded-[24px] border border-black/10 bg-[#fcfaf6] px-5 py-4 text-base leading-8 text-[#111827] placeholder:text-[#8c95a3] focus:border-[#172033]/20 focus:outline-none"
                />
              </div>

              <div className="border-t border-black/10 bg-[#faf6ef] px-5 py-5 sm:px-6">
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_250px]">
                  <div className="space-y-5">
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <MetricCard label="Characters" value={charCount.toLocaleString()} />
                      <MetricCard label="Words" value={wordCount.toLocaleString()} />
                      <MetricCard label="Token estimate" value={tokenEstimate.toLocaleString()} />
                      <MetricCard
                        label="Current state"
                        value={charCount >= 100 ? "Ready" : "Too short"}
                      />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <ModeToggle
                        active={providerPreference === "all"}
                        title="Full stack"
                        detail="All enabled providers"
                        onClick={() => setProviderPreference("all")}
                      />
                      <ModeToggle
                        active={providerPreference === "stable-only"}
                        title="Stable only"
                        detail="Public providers only"
                        onClick={() => setProviderPreference("stable-only")}
                      />
                    </div>

                    <div>
                      <ValidationHint charCount={charCount} />
                      <div className="mt-3 h-2 rounded-full bg-[#d8d3cb]">
                        <div
                          className="h-full rounded-full bg-[#f2a24c] transition-[width] duration-300"
                          style={{ width: `${readinessPercent}%` }}
                        />
                      </div>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-[#6b7280]">
                        <span>Supported range: 100 to 15,000 characters</span>
                        <span>{providersInMode.length} providers in current mode</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[26px] bg-[#172033] p-5 text-white shadow-[0_18px_36px_rgba(15,23,42,0.16)]">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#c7d0dc]">
                      Run Analysis
                    </p>
                    <h3 className="mt-3 text-2xl font-semibold">Build the verdict board</h3>
                    <p className="mt-3 text-sm leading-6 text-[#c7d0dc]">
                      The scan will aggregate successful providers, surface warnings,
                      and keep failed engines visible instead of hiding them.
                    </p>
                    <button
                      type="submit"
                      disabled={!canSubmit}
                      className="mt-6 w-full rounded-full bg-[#f2a24c] px-5 py-3 text-sm font-semibold text-[#172033] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/50 disabled:hover:translate-y-0"
                    >
                      {status === "loading" ? "Running scan..." : "Run analysis"}
                    </button>
                  </div>
                </div>
              </div>
            </form>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_320px]">
              <section className="rounded-[30px] border border-black/10 bg-white/[0.82] p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)] sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#7b8795]">
                      Provider Status
                    </p>
                    <h3 className="display-font mt-2 text-3xl text-[#111827]">
                      Runtime health
                    </h3>
                  </div>
                  <span className="rounded-full border border-black/10 bg-[#f8f2ea] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#5f6b79]">
                    {providerStatuses.length
                      ? `${healthyProviders} healthy`
                      : "Unavailable"}
                  </span>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  {providerStatuses.length > 0 ? (
                    providerStatuses.map((provider) => (
                      <ProviderStatusCard
                        key={provider.id}
                        provider={provider}
                        active={
                          providerPreference === "all" || provider.class === "public"
                        }
                      />
                    ))
                  ) : (
                    <div className="rounded-[24px] border border-dashed border-black/[0.15] bg-[#fcfaf6] px-4 py-6 text-sm leading-6 text-[#6b7280] md:col-span-3">
                      Provider status could not be loaded. The scan API may still
                      respond, but the runtime health board is currently empty.
                    </div>
                  )}
                </div>
              </section>

              <section className="rounded-[30px] border border-[#ecd9bc] bg-[#f4e3ca] p-5 shadow-[0_18px_45px_rgba(96,70,35,0.08)] sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#7b5a2d]">
                  Read The Result
                </p>
                <h3 className="display-font mt-2 text-3xl text-[#2c2419]">
                  What matters
                </h3>
                <div className="mt-5 space-y-4 text-sm leading-6 text-[#584937]">
                  <GuidanceRow
                    number="01"
                    title="Spread matters more than drama"
                    body="If one provider says 14 and another says 81, that is not a verdict. It is a disagreement."
                  />
                  <GuidanceRow
                    number="02"
                    title="Confidence is internal"
                    body="The confidence score reflects how coherent the provider set is, not whether the result is final."
                  />
                  <GuidanceRow
                    number="03"
                    title="Failures are signal too"
                    body="A provider timeout or auth issue should stay visible. Hidden failures create fake certainty."
                  />
                </div>
              </section>
            </div>
          </section>

          <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
            <ResultsPanel
              status={status}
              result={result}
              error={error}
              averageScore={averageScore}
              scoreSpread={scoreSpread}
            />

            <section className="rounded-[30px] border border-black/10 bg-white/[0.82] p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)] sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#7b8795]">
                Scan Snapshot
              </p>
              <h3 className="display-font mt-2 text-3xl text-[#111827]">
                Current state
              </h3>

              <div className="mt-5 space-y-3">
                <SnapshotRow
                  label="Mode"
                  value={providerPreference === "all" ? "Full stack" : "Stable only"}
                />
                <SnapshotRow
                  label="Active providers"
                  value={
                    providersInMode.length
                      ? `${healthyProvidersInMode}/${providersInMode.length} healthy`
                      : "0/0"
                  }
                />
                <SnapshotRow
                  label="Warnings"
                  value={result ? String(result.warnings.length) : "--"}
                />
                <SnapshotRow
                  label="Runtime"
                  value={result ? `${result.timings.totalMs} ms` : "--"}
                />
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

function ResultsPanel({
  status,
  result,
  error,
  averageScore,
  scoreSpread
}: {
  status: SubmitState;
  result: AnalyzeResponse | null;
  error: string | null;
  averageScore: number | null;
  scoreSpread: number;
}) {
  if (status === "loading") {
    return (
      <section className="rounded-[30px] border border-[#172033]/10 bg-[#172033] p-5 text-white shadow-[0_24px_60px_rgba(15,23,42,0.18)] sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#c7d0dc]">
          Verdict Board
        </p>
        <h2 className="display-font mt-2 text-4xl text-white">Running providers</h2>
        <p className="mt-3 text-sm leading-6 text-[#c7d0dc]">
          The server is querying enabled providers and assembling the aggregate read.
        </p>
        <div className="mt-6 space-y-3">
          <LoadingBar width="82%" />
          <LoadingBar width="67%" />
          <LoadingBar width="74%" />
        </div>
      </section>
    );
  }

  if (status === "error") {
    return (
      <section className="rounded-[30px] border border-rose-200 bg-rose-50 p-5 shadow-[0_18px_45px_rgba(190,24,93,0.08)] sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-700">
          Verdict Board
        </p>
        <h2 className="display-font mt-2 text-4xl text-rose-950">Scan failed</h2>
        <p className="mt-4 text-sm leading-6 text-rose-900">
          {error || "The analysis endpoint did not return a valid response."}
        </p>
      </section>
    );
  }

  if (!result) {
    return (
      <section className="rounded-[30px] border border-black/10 bg-white/[0.82] p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)] sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#7b8795]">
          Verdict Board
        </p>
        <h2 className="display-font mt-2 text-4xl text-[#111827]">Awaiting a scan</h2>
        <p className="mt-4 text-sm leading-6 text-[#5f6b79]">
          Run the passage through the enabled providers to get an aggregate verdict,
          per-provider output, and warnings.
        </p>
        <div className="mt-6 space-y-3">
          <PlaceholderRow title="Aggregate verdict" body="Likely AI, mixed, likely human, or inconclusive." />
          <PlaceholderRow title="Provider output" body="Each provider score stays visible, including failures." />
          <PlaceholderRow title="Warnings" body="Partial results and runtime issues are surfaced instead of hidden." />
        </div>
      </section>
    );
  }

  const meta = verdictMeta[result.summary.verdict];
  const providerErrors = result.providers.filter((provider) => provider.status === "error");

  return (
    <section className="rounded-[30px] border border-black/10 bg-white/[0.82] p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)] sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#7b8795]">
        Verdict Board
      </p>

      <div className={`mt-4 rounded-[26px] border p-5 ${meta.cardClass}`}>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] opacity-80">
          {meta.eyebrow}
        </p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="display-font text-4xl sm:text-5xl">{meta.label}</h2>
            <p className="mt-3 max-w-md text-sm leading-6 opacity-85">
              {meta.summary}
            </p>
          </div>
          <div className="rounded-[22px] border border-current/10 bg-white/50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] opacity-70">
              Confidence
            </p>
            <p className="mt-2 text-3xl font-semibold">
              {result.summary.confidence}/100
            </p>
          </div>
        </div>

        <div className="mt-5 h-2 rounded-full bg-black/10">
          <div
            className={`h-full rounded-full ${meta.meterClass}`}
            style={{ width: `${result.summary.confidence}%` }}
          />
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <MiniStat
            label="Completed"
            value={`${result.summary.completedProviders}/${result.summary.totalProviders}`}
          />
          <MiniStat
            label="Average score"
            value={averageScore !== null ? `${averageScore}%` : "--"}
          />
          <MiniStat
            label="Spread"
            value={result.summary.completedProviders > 1 ? `${scoreSpread} pts` : "--"}
          />
        </div>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#7b8795]">
              Provider Output
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-[#111827]">
              Individual reads
            </h3>
          </div>
          <span className="rounded-full border border-black/10 bg-[#f8f2ea] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#5f6b79]">
            {result.providers.length} providers
          </span>
        </div>

        <div className="mt-4 space-y-3">
          {result.providers.map((provider) => (
            <ProviderResultCard key={provider.provider} provider={provider} />
          ))}
        </div>
      </div>

      {(result.warnings.length > 0 || providerErrors.length > 0) && (
        <div className="mt-5 rounded-[24px] border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">
            Warnings
          </p>
          <div className="mt-3 space-y-2 text-sm leading-6 text-amber-950">
            {result.warnings.map((warning, index) => (
              <p key={index}>{warning}</p>
            ))}
            {providerErrors.map((provider) => (
              <p key={provider.provider}>
                {providerMeta[provider.provider].name}: {provider.message}
              </p>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function HeaderStat({
  label,
  value,
  detail
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#c7d0dc]">
        {label}
      </p>
      <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm leading-6 text-[#c7d0dc]">{detail}</p>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-black/10 bg-white px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7b8795]">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold leading-none tracking-tight text-[#111827]">
        {value}
      </p>
    </div>
  );
}

function ModeToggle({
  active,
  title,
  detail,
  onClick
}: {
  active: boolean;
  title: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-full border px-4 py-3 text-left transition",
        active
          ? "border-[#172033] bg-[#172033] text-white"
          : "border-black/10 bg-white text-[#172033]"
      ].join(" ")}
    >
      <span className="block text-sm font-semibold">{title}</span>
      <span className="mt-1 block text-xs text-current/75">{detail}</span>
    </button>
  );
}

function ProviderStatusCard({
  provider,
  active
}: {
  provider: ProviderHealthStatus;
  active: boolean;
}) {
  const tone = provider.enabled
    ? provider.healthy
      ? "border-emerald-200 bg-emerald-50"
      : "border-amber-200 bg-amber-50"
    : "border-slate-200 bg-slate-50";

  return (
    <div
      className={[
        "rounded-[24px] border p-4",
        tone,
        active ? "opacity-100" : "opacity-60"
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7b8795]">
            {providerMeta[provider.id].caption}
          </p>
          <h4 className="mt-2 text-xl font-semibold text-[#111827]">
            {providerMeta[provider.id].name}
          </h4>
        </div>
        <span
          className={`mt-1 h-2.5 w-2.5 rounded-full ${
            provider.enabled
              ? provider.healthy
                ? "bg-emerald-500"
                : "bg-amber-500"
              : "bg-slate-300"
          }`}
        />
      </div>

      <p className="mt-3 text-sm leading-6 text-[#5f6b79]">
        {provider.enabled
          ? provider.healthy
            ? "Healthy and ready for new analysis requests."
            : provider.degradedReason || "Enabled, but currently degraded."
          : provider.degradedReason || "Disabled in the current environment."}
      </p>
    </div>
  );
}

function GuidanceRow({
  number,
  title,
  body
}: {
  number: string;
  title: string;
  body: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="mono-font mt-0.5 rounded-full border border-[#d1ba96] bg-white/[0.6] px-3 py-1 text-xs uppercase tracking-[0.18em] text-[#7b5a2d]">
        {number}
      </div>
      <div>
        <p className="font-semibold text-[#2c2419]">{title}</p>
        <p className="mt-1">{body}</p>
      </div>
    </div>
  );
}

function ProviderResultCard({ provider }: { provider: ProviderResult }) {
  const meta = providerMeta[provider.provider];

  if (provider.status === "error") {
    return (
      <div className="rounded-[22px] border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7b8795]">
              {meta.caption}
            </p>
            <h4 className="mt-2 text-xl font-semibold text-[#111827]">
              {meta.name}
            </h4>
          </div>
          <span className="rounded-full border border-amber-200 bg-white/[0.7] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
            {provider.errorCode.replace("_", " ")}
          </span>
        </div>
        <p className="mt-3 text-sm leading-6 text-[#5f6b79]">{provider.message}</p>
      </div>
    );
  }

  return (
    <div className="rounded-[22px] border border-black/10 bg-[#fcfaf6] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7b8795]">
            {meta.caption}
          </p>
          <h4 className="mt-2 text-xl font-semibold text-[#111827]">{meta.name}</h4>
        </div>
        <div className="text-right">
          <p className="text-3xl font-semibold leading-none text-[#111827]">
            {provider.score}%
          </p>
          <p className="mono-font mt-2 text-xs uppercase tracking-[0.18em] text-[#7b8795]">
            {provider.durationMs} ms
          </p>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.18em] text-[#7b8795]">
          <span>Human</span>
          <span>AI</span>
        </div>
        <div className="mt-2 h-2 rounded-full bg-[#dde2e8]">
          <div className={scoreBarClass(provider.score)} style={scoreBarStyle(provider.score)} />
        </div>
      </div>
    </div>
  );
}

function PlaceholderRow({
  title,
  body
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-[22px] border border-black/10 bg-[#fcfaf6] p-4">
      <p className="text-sm font-semibold text-[#111827]">{title}</p>
      <p className="mt-2 text-sm leading-6 text-[#5f6b79]">{body}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-current/10 bg-white/50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-70">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function SnapshotRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[20px] border border-black/10 bg-[#fcfaf6] px-4 py-3">
      <span className="text-sm font-medium text-[#5f6b79]">{label}</span>
      <span className="text-sm font-semibold text-[#111827]">{value}</span>
    </div>
  );
}

function LoadingBar({ width }: { width: string }) {
  return (
    <div className="h-2 rounded-full bg-white/10">
      <div className="h-full rounded-full bg-[#f2a24c] opacity-90" style={{ width }} />
    </div>
  );
}

function ValidationHint({ charCount }: { charCount: number }) {
  if (charCount === 0) {
    return (
      <p className="text-sm font-semibold text-[#5f6b79]">
        Add at least 100 characters before running the scan.
      </p>
    );
  }

  if (charCount < 100) {
    return (
      <p className="text-sm font-semibold text-amber-700">
        {100 - charCount} more characters needed.
      </p>
    );
  }

  if (charCount > 15000) {
    return (
      <p className="text-sm font-semibold text-rose-700">
        The sample is too long. Trim it below 15,000 characters.
      </p>
    );
  }

  return (
    <p className="text-sm font-semibold text-emerald-700">
      Input length is valid and ready to scan.
    </p>
  );
}

function scoreBarClass(score: number) {
  if (score < 30) {
    return "h-full rounded-full bg-emerald-500";
  }

  if (score < 70) {
    return "h-full rounded-full bg-amber-500";
  }

  return "h-full rounded-full bg-rose-500";
}

function scoreBarStyle(score: number): CSSProperties {
  return { width: `${Math.max(6, score)}%` };
}
