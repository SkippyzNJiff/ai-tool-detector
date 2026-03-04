import { getEnabledProviders } from "@/lib/providers";
import { aggregateProviderResults } from "@/lib/scoring";
import type { AnalyzeRequest, AnalyzeResponse } from "@/lib/types";

export async function analyzeTextWithProviders(
  request: AnalyzeRequest
): Promise<AnalyzeResponse> {
  const startedAt = Date.now();
  const providers = getEnabledProviders(request.providerPreference ?? "all");

  if (providers.length === 0) {
    throw new Error("No providers are enabled. Check your environment flags.");
  }

  const analysisId = crypto.randomUUID();
  const results = await Promise.all(providers.map((provider) => provider.analyze(request.text)));
  const summary = aggregateProviderResults(results, providers.length);

  return {
    analysisId,
    summary: {
      verdict: summary.verdict,
      confidence: summary.confidence,
      completedProviders: results.filter((result) => result.status === "success").length,
      totalProviders: providers.length,
      partial: summary.partial
    },
    providers: results,
    warnings: summary.warnings,
    timings: {
      totalMs: Date.now() - startedAt
    }
  };
}
