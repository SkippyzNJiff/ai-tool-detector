"use client";

import Image from "next/image";
import type { DetectorModel } from "@/components/detector-model";
import {
  MAX_CHARS,
  MIN_CHARS,
  formatErrorCode,
  providerMeta,
  scoreTone,
  useDetectorModel,
  verdictMeta
} from "@/components/detector-model";
import type { ProviderId } from "@/lib/types";

const providerLogoMap: Record<ProviderId, string> = {
  zerogpt: "/logos/zerogpt.png",
  quillbot: "/logos/quillbot.jpg",
  gptzero: "/logos/gptzero.png"
};

export function MinimalDesignThree() {
  const model = useDetectorModel();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_12%_0%,#f8e6c7_0%,transparent_38%),radial-gradient(circle_at_90%_6%,#d8e7f7_0%,transparent_36%),linear-gradient(180deg,#f5f7fb_0%,#eef2f7_100%)] px-4 py-6 text-[#13212f] sm:px-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <header className="overflow-hidden rounded-3xl border border-[#1d3348]/15 bg-[#13212f] px-5 py-6 text-[#e6edf4] shadow-[0_28px_55px_rgba(19,33,47,0.3)] sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a8bfd6]">
                Signal Draft
              </p>
              <h1 className="display-font mt-2 text-4xl text-white sm:text-5xl">
                Cross-check detectors in one pane
              </h1>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-right">
              <p className="text-[11px] uppercase tracking-[0.16em] text-[#c2d3e2]">
                Active mode
              </p>
              <p className="mt-1 text-sm font-semibold text-white">
                {model.providerPreference === "all" ? "All providers" : "Stable only"}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <TopStat label="Words" value={model.wordCount.toLocaleString()} />
            <TopStat label="Characters" value={model.charCount.toLocaleString()} />
            <TopStat
              label="Healthy providers"
              value={`${model.healthyProvidersInMode}/${model.providersInMode.length}`}
            />
          </div>
        </header>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_370px]">
          <EditorCard model={model} />
          <div className="space-y-4">
            <ProviderChips model={model} />
            <ResultsCard model={model} />
          </div>
        </div>
      </div>
    </main>
  );
}

function TopStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
      <p className="text-[11px] uppercase tracking-[0.14em] text-[#b7cadc]">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function EditorCard({ model }: { model: DetectorModel }) {
  return (
    <form
      onSubmit={model.handleSubmit}
      className="rounded-3xl border border-[#1d3348]/15 bg-white/90 p-4 shadow-[0_18px_36px_rgba(19,33,47,0.08)]"
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-[#6d7f91]">Text Workspace</p>
          <h2 className="display-font mt-1 text-3xl text-[#13212f]">Paste your sample</h2>
        </div>
        <button
          type="submit"
          disabled={!model.canSubmit}
          className="rounded-xl bg-[#13212f] px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-[#99a8b8] disabled:hover:translate-y-0"
        >
          {model.status === "loading" ? "Running..." : "Detect AI"}
        </button>
      </div>

      <textarea
        value={model.text}
        onChange={(event) => model.setText(event.target.value)}
        spellCheck={false}
        placeholder="Paste the text you want to analyze..."
        className="min-h-[280px] w-full resize-y rounded-2xl border border-[#d7e0ea] bg-[#f9fbfe] px-4 py-3 leading-7 text-[#13212f] placeholder:text-[#8da0b2] focus:border-[#13212f]/40 focus:outline-none"
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={model.loadSample}
          className="rounded-xl border border-[#d7e0ea] bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#13212f] transition hover:-translate-y-0.5"
        >
          Try Example
        </button>
        <button
          type="button"
          onClick={model.clearText}
          className="rounded-xl border border-[#d7e0ea] bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#5c6f82] transition hover:-translate-y-0.5"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={() => model.setProviderPreference("all")}
          className={[
            "rounded-xl border px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition hover:-translate-y-0.5",
            model.providerPreference === "all"
              ? "border-[#13212f] bg-[#13212f] text-white"
              : "border-[#d7e0ea] bg-white text-[#13212f]"
          ].join(" ")}
        >
          All Providers
        </button>
        <button
          type="button"
          onClick={() => model.setProviderPreference("stable-only")}
          className={[
            "rounded-xl border px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition hover:-translate-y-0.5",
            model.providerPreference === "stable-only"
              ? "border-[#13212f] bg-[#13212f] text-white"
              : "border-[#d7e0ea] bg-white text-[#13212f]"
          ].join(" ")}
        >
          Stable Only
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[#627487]">
        <span>
          {model.wordCount.toLocaleString()} words | {model.charCount.toLocaleString()} chars
        </span>
        <span>{lengthHint(model.charCount)}</span>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-[#dce5ee]">
        <div
          className="h-full rounded-full bg-[#13212f] transition-[width] duration-300"
          style={{ width: `${model.readinessPercent}%` }}
        />
      </div>
    </form>
  );
}

function ProviderChips({ model }: { model: DetectorModel }) {
  return (
    <section className="rounded-3xl border border-[#1d3348]/15 bg-white/90 p-4 shadow-[0_18px_36px_rgba(19,33,47,0.08)]">
      <p className="text-[11px] uppercase tracking-[0.14em] text-[#6d7f91]">Providers</p>

      <div className="mt-3 space-y-2">
        {model.orderedProviderStatuses.length > 0 ? (
          model.orderedProviderStatuses.map((provider) => {
            const meta = providerMeta[provider.id];
            const statusLabel = provider.enabled
              ? provider.healthy
                ? "Healthy"
                : "Degraded"
              : "Disabled";

            const statusClasses = provider.enabled
              ? provider.healthy
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-amber-200 bg-amber-50 text-amber-800"
              : "border-slate-200 bg-slate-100 text-slate-700";

            return (
              <article
                key={provider.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-[#d7e0ea] bg-[#f9fbfe] px-3 py-2.5"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-[#d7e0ea] bg-white">
                    <Image
                      src={providerLogoMap[provider.id]}
                      alt={`${meta.label} logo`}
                      width={28}
                      height={28}
                      className="h-7 w-7 object-contain"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#13212f]">{meta.label}</p>
                    <p className="text-xs text-[#6d7f91]">{meta.caption}</p>
                  </div>
                </div>

                <span
                  className={[
                    "rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em]",
                    statusClasses
                  ].join(" ")}
                >
                  {statusLabel}
                </span>
              </article>
            );
          })
        ) : (
          <span className="text-sm text-[#4f6478]">Provider status unavailable.</span>
        )}
      </div>
    </section>
  );
}

function ResultsCard({ model }: { model: DetectorModel }) {
  const verdict = model.result ? verdictMeta[model.result.summary.verdict] : null;

  return (
    <section className="rounded-3xl border border-[#1d3348]/15 bg-white/90 p-4 shadow-[0_18px_36px_rgba(19,33,47,0.08)]">
      <p className="text-[11px] uppercase tracking-[0.14em] text-[#6d7f91]">Results</p>

      {model.status === "loading" && (
        <p className="mt-2 text-sm text-[#4f6478]">Running providers...</p>
      )}

      {model.status === "error" && (
        <p className="mt-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
          {model.error || "Analysis failed."}
        </p>
      )}

      {!model.result && model.status !== "loading" && model.status !== "error" && (
        <p className="mt-2 text-sm text-[#4f6478]">Run analysis to view output.</p>
      )}

      {model.result && verdict && (
        <div className="mt-2 space-y-2">
          <div className="rounded-xl border border-[#d7e0ea] bg-[#f9fbfe] px-3 py-3">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-[#6d7f91]">{verdict.label}</p>
                <p className="mt-1 text-sm text-[#4f6478]">{verdict.hint}</p>
              </div>
              <p className="text-2xl font-semibold text-[#13212f]">
                {model.result.summary.confidence}%
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {model.result.providers.map((provider) => {
              const meta = providerMeta[provider.provider];

              if (provider.status === "error") {
                return (
                  <div
                    key={provider.provider}
                    className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <ProviderLogo providerId={provider.provider} label={meta.label} />
                      <p className="text-sm font-semibold text-[#13212f]">{meta.label}</p>
                    </div>
                    <p className="mt-1 text-xs uppercase tracking-[0.12em] text-amber-800">
                      {formatErrorCode(provider.errorCode)}
                    </p>
                  </div>
                );
              }

              return (
                <div
                  key={provider.provider}
                  className="rounded-xl border border-[#d7e0ea] bg-[#f9fbfe] px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-3 text-sm text-[#13212f]">
                    <div className="flex items-center gap-2">
                      <ProviderLogo providerId={provider.provider} label={meta.label} />
                      <span>{meta.label}</span>
                    </div>
                    <span className="font-semibold">{provider.score}%</span>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-[#dce5ee]">
                    <div
                      className={scoreBar(scoreTone(provider.score))}
                      style={{ width: `${Math.max(6, provider.score)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {model.result.warnings.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-6 text-amber-900">
              {model.result.warnings.map((warning, index) => (
                <p key={index}>{warning}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function ProviderLogo({ providerId, label }: { providerId: ProviderId; label: string }) {
  return (
    <span className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-md border border-[#d7e0ea] bg-white">
      <Image
        src={providerLogoMap[providerId]}
        alt={`${label} logo`}
        width={18}
        height={18}
        className="h-[18px] w-[18px] object-contain"
      />
    </span>
  );
}

function lengthHint(charCount: number) {
  if (charCount === 0) {
    return "No text yet";
  }

  if (charCount < MIN_CHARS) {
    return `${MIN_CHARS - charCount} chars needed`;
  }

  if (charCount > MAX_CHARS) {
    return `Over ${MAX_CHARS} char limit`;
  }

  return "Ready";
}

function scoreBar(tone: ReturnType<typeof scoreTone>) {
  if (tone === "low") {
    return "h-full rounded-full bg-emerald-500";
  }

  if (tone === "medium") {
    return "h-full rounded-full bg-amber-500";
  }

  return "h-full rounded-full bg-rose-500";
}
