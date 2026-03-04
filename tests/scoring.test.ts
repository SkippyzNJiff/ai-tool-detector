import { describe, expect, it } from "vitest";
import { aggregateProviderResults, mapScoreToVerdict } from "@/lib/scoring";
import type { ProviderResult } from "@/lib/types";

describe("scoring", () => {
  it("maps score ranges to verdicts", () => {
    expect(mapScoreToVerdict(10)).toBe("likely_human");
    expect(mapScoreToVerdict(45)).toBe("mixed");
    expect(mapScoreToVerdict(88)).toBe("likely_ai");
  });

  it("reduces confidence when providers disagree", () => {
    const results: ProviderResult[] = [
      {
        provider: "zerogpt",
        status: "success",
        score: 92,
        rawResponse: {},
        durationMs: 50
      },
      {
        provider: "quillbot",
        status: "success",
        score: 18,
        rawResponse: {},
        durationMs: 70
      }
    ];

    const aggregate = aggregateProviderResults(results, 2);
    expect(aggregate.verdict).toBe("mixed");
    expect(aggregate.confidence).toBeLessThan(60);
    expect(aggregate.warnings.some((warning) => warning.includes("disagree"))).toBe(true);
  });

  it("marks no successful providers as inconclusive", () => {
    const aggregate = aggregateProviderResults(
      [
        {
          provider: "zerogpt",
          status: "error",
          errorCode: "network_error",
          message: "boom",
          durationMs: 12
        }
      ],
      1
    );

    expect(aggregate.verdict).toBe("inconclusive");
    expect(aggregate.confidence).toBe(0);
  });
});
