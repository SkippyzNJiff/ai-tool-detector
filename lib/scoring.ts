import type { AggregateAnalysis, ProviderId, ProviderResult, Verdict } from "@/lib/types";

const PROVIDER_WEIGHTS: Record<ProviderId, number> = {
  zerogpt: 1,
  quillbot: 1,
  gptzero: 1.2
};

export function normalizePercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function aggregateProviderResults(
  results: ProviderResult[],
  totalProviders: number
): AggregateAnalysis {
  const successes = results.filter((result) => result.status === "success");
  const warnings: string[] = [];

  if (successes.length === 0) {
    return {
      verdict: "inconclusive",
      confidence: 0,
      partial: true,
      warnings: ["No providers completed successfully. Check your configuration and provider health."]
    };
  }

  const weightedTotal = successes.reduce(
    (sum, result) => sum + result.score * PROVIDER_WEIGHTS[result.provider],
    0
  );
  const totalWeight = successes.reduce((sum, result) => sum + PROVIDER_WEIGHTS[result.provider], 0);
  const average = weightedTotal / totalWeight;
  const spread =
    successes.reduce((sum, result) => sum + Math.abs(result.score - average), 0) / successes.length;
  const agreementBonus = Math.max(0, 28 - spread);
  const confidence = normalizePercent(
    Math.max(15, Math.min(95, Math.round(average * 0.55 + agreementBonus)))
  );

  if (successes.length < totalProviders) {
    warnings.push("One or more providers were unavailable, so this result is based on partial coverage.");
  }

  if (spread > 18) {
    warnings.push("The providers disagree materially, so treat the verdict as directional rather than definitive.");
  }

  if (successes.length === 1) {
    warnings.push("Only one provider succeeded. Confidence is limited until more providers agree.");
  }

  return {
    verdict: mapScoreToVerdict(average),
    confidence,
    partial: successes.length < totalProviders,
    warnings
  };
}

export function mapScoreToVerdict(score: number): Verdict {
  if (score < 30) {
    return "likely_human";
  }

  if (score < 60) {
    return "mixed";
  }

  return "likely_ai";
}
