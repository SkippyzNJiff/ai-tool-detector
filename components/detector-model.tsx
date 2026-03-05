"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import type {
  AnalyzeResponse,
  ProviderHealthStatus,
  ProviderId,
  ProviderPreference,
  ProviderResult,
  Verdict
} from "@/lib/types";

export type SubmitState = "idle" | "loading" | "success" | "error";

export const MIN_CHARS = 100;
export const MAX_CHARS = 15000;

export const demoText =
  "AI detector scores often look definitive until you compare multiple providers side by side. This sample stays neutral on purpose so you can see how much disagreement appears even for clean, well-structured prose.";

export const providerOrder: ProviderId[] = ["zerogpt", "quillbot", "gptzero"];

export const providerMeta: Record<
  ProviderId,
  {
    label: string;
    caption: string;
  }
> = {
  zerogpt: {
    label: "ZeroGPT",
    caption: "Public baseline"
  },
  quillbot: {
    label: "QuillBot",
    caption: "Session-backed"
  },
  gptzero: {
    label: "GPTZero",
    caption: "Authenticated"
  }
};

export const verdictMeta: Record<
  Verdict,
  {
    label: string;
    hint: string;
  }
> = {
  likely_ai: {
    label: "Likely AI",
    hint: "Most successful providers are leaning toward generated text."
  },
  mixed: {
    label: "Mixed",
    hint: "Providers disagree enough that this should be reviewed manually."
  },
  likely_human: {
    label: "Likely Human",
    hint: "Most successful providers are reading this as human-authored."
  },
  inconclusive: {
    label: "Inconclusive",
    hint: "Not enough reliable signal to make a clean aggregate call."
  }
};

function isSuccessfulProvider(
  provider: ProviderResult
): provider is Extract<ProviderResult, { status: "success" }> {
  return provider.status === "success";
}

export function formatErrorCode(code: ProviderResult extends infer T
  ? T extends { status: "error"; errorCode: infer E }
    ? E
    : never
  : never) {
  return String(code).replaceAll("_", " ");
}

export function scoreTone(score: number) {
  if (score < 35) {
    return "low";
  }

  if (score < 70) {
    return "medium";
  }

  return "high";
}

export function useDetectorModel() {
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

  const trimmedText = text.trim();
  const charCount = trimmedText.length;
  const wordCount = trimmedText ? trimmedText.split(/\s+/).length : 0;
  const tokenEstimate = trimmedText ? Math.ceil(charCount / 4) : 0;
  const canSubmit =
    status !== "loading" && charCount >= MIN_CHARS && charCount <= MAX_CHARS;
  const readinessPercent = Math.max(0, Math.min(100, (charCount / MIN_CHARS) * 100));

  const orderedProviderStatuses = useMemo(
    () =>
      [...providerStatuses].sort(
        (left, right) => providerOrder.indexOf(left.id) - providerOrder.indexOf(right.id)
      ),
    [providerStatuses]
  );

  const providersInMode = orderedProviderStatuses.filter((provider) => {
    if (!provider.enabled) {
      return false;
    }

    if (providerPreference === "stable-only") {
      return provider.class === "public";
    }

    return true;
  });

  const healthyProviders = orderedProviderStatuses.filter(
    (provider) => provider.enabled && provider.healthy
  ).length;

  const healthyProvidersInMode = providersInMode.filter((provider) => provider.healthy).length;

  const successfulProviders = useMemo(
    () => (result?.providers.filter(isSuccessfulProvider) ?? []),
    [result]
  );

  const averageScore = useMemo(() => {
    if (!successfulProviders.length) {
      return null;
    }

    const total = successfulProviders.reduce(
      (accumulator, provider) => accumulator + provider.score,
      0
    );

    return Math.round(total / successfulProviders.length);
  }, [successfulProviders]);

  const scoreSpread = useMemo(() => {
    if (successfulProviders.length < 2) {
      return 0;
    }

    const scores = successfulProviders.map((provider) => provider.score);
    return Math.max(...scores) - Math.min(...scores);
  }, [successfulProviders]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setError(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          providerPreference
        })
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
    } catch (submissionError) {
      setResult(null);
      setStatus("error");
      setError(
        submissionError instanceof Error ? submissionError.message : "Analysis failed."
      );
    }
  }

  return {
    text,
    setText,
    providerPreference,
    setProviderPreference,
    status,
    result,
    error,
    orderedProviderStatuses,
    providersInMode,
    healthyProviders,
    healthyProvidersInMode,
    charCount,
    wordCount,
    tokenEstimate,
    canSubmit,
    readinessPercent,
    successfulProviders,
    averageScore,
    scoreSpread,
    loadSample: () => setText(demoText),
    clearText: () => setText(""),
    handleSubmit
  };
}

export type DetectorModel = ReturnType<typeof useDetectorModel>;
