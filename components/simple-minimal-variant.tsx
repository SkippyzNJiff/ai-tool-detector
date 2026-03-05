"use client";

import type { DetectorModel } from "@/components/detector-model";
import { DesignSwitcher } from "@/components/design-switcher";
import {
  MAX_CHARS,
  MIN_CHARS,
  formatErrorCode,
  providerMeta,
  scoreTone,
  useDetectorModel,
  verdictMeta
} from "@/components/detector-model";

type VariantId = 1 | 2 | 3 | 4 | 5;

export function SimpleMinimalVariant({ variant }: { variant: VariantId }) {
  const model = useDetectorModel();

  if (variant === 1) {
    return (
      <main className="min-h-screen bg-[#f4f4f2] px-4 py-6 text-[#1a1a18] sm:px-6">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="rounded-2xl border border-black/10 bg-white p-4">
            <div className="rounded-xl bg-[#111827] px-3 py-3 text-white">
              <p className="text-xs uppercase tracking-[0.14em] text-white/75">Workspace</p>
              <p className="mt-2 text-sm font-semibold">Minimal Detector</p>
            </div>
            <nav className="mt-4 space-y-2 text-sm">
              <SidebarItem active label="Detect & Analyze" />
              <SidebarItem label="Saved Drafts" />
              <SidebarItem label="History" />
            </nav>
            <div className="mt-4">
              <DesignSwitcher />
            </div>
          </aside>

          <section className="space-y-4">
            <header className="rounded-2xl border border-black/10 bg-white p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-[#6f6f65]">Variant 1</p>
              <h1 className="mt-1 text-2xl font-semibold">Sidebar Workspace</h1>
              <p className="mt-1 text-sm text-[#55554d]">
                Based on your reference: left navigation and one clear analysis surface.
              </p>
            </header>
            <EditorCard model={model} />
            <ProviderChips model={model} />
            <ResultsCard model={model} />
          </section>
        </div>
      </main>
    );
  }

  if (variant === 2) {
    return (
      <main className="min-h-screen bg-[#f7f7f5] px-4 py-8 text-[#1a1a18] sm:px-6">
        <div className="mx-auto max-w-3xl space-y-4">
          <header className="rounded-2xl border border-black/10 bg-white p-4 text-center">
            <p className="text-xs uppercase tracking-[0.16em] text-[#6f6f65]">Variant 2</p>
            <h1 className="mt-1 text-2xl font-semibold">Single Column</h1>
            <p className="mt-1 text-sm text-[#55554d]">
              One centered column with minimal friction.
            </p>
            <div className="mt-3 flex justify-center">
              <DesignSwitcher />
            </div>
          </header>
          <EditorCard model={model} compact />
          <ResultsCard model={model} />
          <ProviderChips model={model} />
        </div>
      </main>
    );
  }

  if (variant === 3) {
    return (
      <main className="min-h-screen bg-[#f4f4f2] px-4 py-6 text-[#1a1a18] sm:px-6">
        <div className="mx-auto max-w-7xl">
          <header className="mb-4 rounded-2xl border border-black/10 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-[#6f6f65]">Variant 3</p>
                <h1 className="mt-1 text-2xl font-semibold">Two Pane</h1>
              </div>
              <DesignSwitcher />
            </div>
          </header>
          <div className="grid gap-4 lg:grid-cols-2">
            <EditorCard model={model} />
            <div className="space-y-4">
              <ResultsCard model={model} />
              <ProviderChips model={model} />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (variant === 4) {
    return (
      <main className="min-h-screen bg-[#f6f6f4] px-4 py-6 text-[#1a1a18] sm:px-6">
        <div className="mx-auto max-w-5xl space-y-4">
          <header className="rounded-2xl border border-black/10 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-[#6f6f65]">Variant 4</p>
                <h1 className="mt-1 text-2xl font-semibold">Compact Dashboard</h1>
              </div>
              <DesignSwitcher />
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <TopStat label="Chars" value={model.charCount.toLocaleString()} />
              <TopStat label="Words" value={model.wordCount.toLocaleString()} />
              <TopStat
                label="Providers"
                value={`${model.healthyProvidersInMode}/${model.providersInMode.length}`}
              />
            </div>
          </header>
          <EditorCard model={model} />
          <ResultsCard model={model} />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8f8f6] px-4 py-6 text-[#1a1a18] sm:px-6">
      <div className="mx-auto max-w-5xl rounded-2xl border border-black/10 bg-white">
        <header className="border-b border-black/10 px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-[#6f6f65]">Variant 5</p>
              <h1 className="mt-1 text-2xl font-semibold">Sheet Layout</h1>
            </div>
            <DesignSwitcher />
          </div>
        </header>
        <div className="space-y-4 px-4 py-4 sm:px-5">
          <EditorCard model={model} compact />
          <ProviderChips model={model} />
          <ResultsCard model={model} compact />
        </div>
      </div>
    </main>
  );
}

function SidebarItem({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <div
      className={[
        "rounded-lg px-3 py-2",
        active ? "bg-[#f1f1ee] font-semibold text-[#1a1a18]" : "text-[#4f4f47]"
      ].join(" ")}
    >
      {label}
    </div>
  );
}

function TopStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-black/10 bg-[#fafaf8] px-3 py-2">
      <p className="text-[11px] uppercase tracking-[0.14em] text-[#6f6f65]">{label}</p>
      <p className="mt-1 text-base font-semibold">{value}</p>
    </div>
  );
}

function EditorCard({ model, compact = false }: { model: DetectorModel; compact?: boolean }) {
  return (
    <form onSubmit={model.handleSubmit} className="rounded-2xl border border-black/10 bg-white p-4">
      <textarea
        value={model.text}
        onChange={(event) => model.setText(event.target.value)}
        spellCheck={false}
        placeholder="Paste the text you want to analyze..."
        className={[
          "w-full resize-y rounded-xl border border-black/10 bg-[#fafaf8] px-3 py-3 leading-7 text-[#1a1a18] placeholder:text-[#88887d] focus:border-black/30 focus:outline-none",
          compact ? "min-h-[190px]" : "min-h-[240px]"
        ].join(" ")}
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={model.loadSample}
          className="rounded-md border border-black/20 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em]"
        >
          Try Example
        </button>
        <button
          type="button"
          onClick={model.clearText}
          className="rounded-md border border-black/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#6f6f65]"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={() => model.setProviderPreference("all")}
          className={[
            "rounded-md border px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em]",
            model.providerPreference === "all"
              ? "border-black bg-black text-white"
              : "border-black/15 text-[#4f4f47]"
          ].join(" ")}
        >
          All Providers
        </button>
        <button
          type="button"
          onClick={() => model.setProviderPreference("stable-only")}
          className={[
            "rounded-md border px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em]",
            model.providerPreference === "stable-only"
              ? "border-black bg-black text-white"
              : "border-black/15 text-[#4f4f47]"
          ].join(" ")}
        >
          Stable Only
        </button>
        <button
          type="submit"
          disabled={!model.canSubmit}
          className="rounded-md bg-[#111827] px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white disabled:cursor-not-allowed disabled:bg-black/25"
        >
          {model.status === "loading" ? "Running..." : "Detect AI"}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[#6f6f65]">
        <span>
          {model.wordCount.toLocaleString()} words • {model.charCount.toLocaleString()} chars
        </span>
        <span>{lengthHint(model.charCount)}</span>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-black/10">
        <div
          className="h-full rounded-full bg-[#111827]"
          style={{ width: `${model.readinessPercent}%` }}
        />
      </div>
    </form>
  );
}

function ProviderChips({ model }: { model: DetectorModel }) {
  return (
    <section className="rounded-2xl border border-black/10 bg-white p-4">
      <p className="text-[11px] uppercase tracking-[0.14em] text-[#6f6f65]">Providers</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {model.orderedProviderStatuses.length > 0 ? (
          model.orderedProviderStatuses.map((provider) => (
            <span
              key={provider.id}
              className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-[#fafaf8] px-3 py-1.5 text-xs"
            >
              <span
                className={[
                  "h-2 w-2 rounded-full",
                  provider.enabled ? (provider.healthy ? "bg-emerald-500" : "bg-amber-500") : "bg-slate-300"
                ].join(" ")}
              />
              {providerMeta[provider.id].label}
            </span>
          ))
        ) : (
          <span className="text-sm text-[#55554d]">Provider status unavailable.</span>
        )}
      </div>
    </section>
  );
}

function ResultsCard({ model, compact = false }: { model: DetectorModel; compact?: boolean }) {
  const verdict = model.result ? verdictMeta[model.result.summary.verdict] : null;

  return (
    <section className="rounded-2xl border border-black/10 bg-white p-4">
      <p className="text-[11px] uppercase tracking-[0.14em] text-[#6f6f65]">Results</p>

      {model.status === "loading" && (
        <p className="mt-2 text-sm text-[#55554d]">Running providers...</p>
      )}

      {model.status === "error" && (
        <p className="mt-2 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-900">
          {model.error || "Analysis failed."}
        </p>
      )}

      {!model.result && model.status !== "loading" && model.status !== "error" && (
        <p className="mt-2 text-sm text-[#55554d]">Run analysis to view output.</p>
      )}

      {model.result && verdict && (
        <div className="mt-2 space-y-2">
          <div className="rounded-lg border border-black/10 bg-[#fafaf8] px-3 py-3">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-[#6f6f65]">
                  {verdict.label}
                </p>
                {!compact && <p className="mt-1 text-sm text-[#55554d]">{verdict.hint}</p>}
              </div>
              <p className="text-2xl font-semibold">{model.result.summary.confidence}%</p>
            </div>
          </div>

          <div className="space-y-2">
            {model.result.providers.map((provider) => {
              const meta = providerMeta[provider.provider];

              if (provider.status === "error") {
                return (
                  <div
                    key={provider.provider}
                    className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2"
                  >
                    <p className="text-sm font-semibold">{meta.label}</p>
                    <p className="text-xs uppercase tracking-[0.12em] text-amber-800">
                      {formatErrorCode(provider.errorCode)}
                    </p>
                  </div>
                );
              }

              return (
                <div
                  key={provider.provider}
                  className="rounded-lg border border-black/10 bg-[#fafaf8] px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span>{meta.label}</span>
                    <span className="font-semibold">{provider.score}%</span>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-black/10">
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
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs leading-6 text-amber-900">
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
