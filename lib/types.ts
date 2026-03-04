export type ProviderId = "zerogpt" | "gptzero" | "quillbot";
export type ProviderClass = "public" | "session" | "authenticated";
export type ProviderPreference = "all" | "stable-only";
export type Verdict = "likely_ai" | "mixed" | "likely_human" | "inconclusive";

export type AnalyzeRequest = {
  text: string;
  providerPreference?: ProviderPreference;
};

export type AnalyzeResponse = {
  analysisId: string;
  summary: {
    verdict: Verdict;
    confidence: number;
    completedProviders: number;
    totalProviders: number;
    partial: boolean;
  };
  providers: ProviderResult[];
  warnings: string[];
  timings: {
    totalMs: number;
  };
};

export type ProviderResult =
  | {
      provider: ProviderId;
      status: "success";
      score: number;
      rawLabel?: string;
      rawResponse: unknown;
      durationMs: number;
    }
  | {
      provider: ProviderId;
      status: "error";
      errorCode:
        | "timeout"
        | "unauthorized"
        | "rate_limited"
        | "bad_response"
        | "disabled"
        | "network_error"
        | "session_refresh_failed";
      message: string;
      durationMs: number;
    };

export type ProviderHealthStatus = {
  id: ProviderId;
  enabled: boolean;
  class: ProviderClass;
  healthy: boolean;
  degradedReason?: string;
};

export type AggregateAnalysis = {
  verdict: Verdict;
  confidence: number;
  partial: boolean;
  warnings: string[];
};

export type ProviderSession = {
  provider: "gptzero";
  cookies: Array<{
    name: string;
    value: string;
    domain: string;
    path: string;
    expires?: number;
    httpOnly?: boolean;
    secure?: boolean;
  }>;
  headers?: Record<string, string>;
  expiresAt?: string;
  refreshedAt: string;
};
