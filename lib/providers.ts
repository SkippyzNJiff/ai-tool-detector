import { appEnv, isProviderEnabled } from "@/lib/env";
import { findNumericScore, parseJsonSafely, stringifyCookies } from "@/lib/provider-utils";
import { sessionManager } from "@/lib/session-manager";
import { playwrightFetch } from "@/lib/session/playwright-fetch";
import type {
  ProviderClass,
  ProviderHealthStatus,
  ProviderId,
  ProviderPreference,
  ProviderResult
} from "@/lib/types";

type ProviderDefinition = {
  id: ProviderId;
  providerClass: ProviderClass;
  enabled: () => boolean;
  analyze: (text: string) => Promise<ProviderResult>;
};

const providers: ProviderDefinition[] = [
  {
    id: "zerogpt",
    providerClass: "public",
    enabled: () => isProviderEnabled("zerogpt"),
    analyze: analyzeWithZeroGpt
  },
  {
    id: "quillbot",
    providerClass: "session",
    enabled: () => isProviderEnabled("quillbot"),
    analyze: analyzeWithQuillBot
  },
  {
    id: "gptzero",
    providerClass: "authenticated",
    enabled: () => isProviderEnabled("gptzero"),
    analyze: analyzeWithGptZero
  }
];

export function getEnabledProviders(preference: ProviderPreference) {
  return providers.filter((provider) => {
    if (!provider.enabled()) {
      return false;
    }

    if (preference === "stable-only" || appEnv.strictStableOnlyMode) {
      return provider.providerClass === "public";
    }

    return true;
  });
}

export async function getProviderStatuses(): Promise<ProviderHealthStatus[]> {
  return providers.map((provider) => {
    if (provider.id === "gptzero") {
      return sessionManager.getHealthStatus();
    }

    return {
      id: provider.id,
      enabled: provider.enabled(),
      class: provider.providerClass,
      healthy: provider.enabled(),
      degradedReason: provider.enabled() ? undefined : "Feature flag disabled."
    };
  });
}

async function analyzeWithZeroGpt(text: string): Promise<ProviderResult> {
  const startedAt = Date.now();

  try {
    const response = await fetch("https://api.zerogpt.com/api/detect/detectText", {
      method: "POST",
      headers: {
        Accept: "application/json, text/plain, */*",
        "Content-Type": "application/json",
        Origin: "https://www.zerogpt.com",
        Referer: "https://www.zerogpt.com/",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36"
      },
      body: JSON.stringify({ input_text: text }),
      signal: AbortSignal.timeout(15000)
    });

    const payload = await parseJsonSafely(response);
    if (!response.ok) {
      return mapHttpError("zerogpt", response.status, Date.now() - startedAt);
    }

    const score = findNumericScore(payload, [
      "fakePercentage",
      "ai_score",
      "score",
      "percent",
      "probability"
    ]);
    if (score === null) {
      return {
        provider: "zerogpt",
        status: "error",
        errorCode: "bad_response",
        message: "ZeroGPT response did not include a recognizable score.",
        durationMs: Date.now() - startedAt
      };
    }

    return {
      provider: "zerogpt",
      status: "success",
      score: Math.round(score),
      rawResponse: payload,
      durationMs: Date.now() - startedAt
    };
  } catch (error) {
    return mapThrowable("zerogpt", error, startedAt);
  }
}

async function analyzeWithQuillBot(text: string): Promise<ProviderResult> {
  const startedAt = Date.now();

  try {
    const response = await playwrightFetch.fetch("https://quillbot.com/api/ai-detector/score", {
      method: "POST",
      headers: {
        Accept: "application/json, text/plain, */*",
        "Content-Type": "application/json",
        Origin: "https://quillbot.com",
        Referer: "https://quillbot.com/ai-content-detector",
        "platform-type": "webapp",
        "qb-product": "AI_CONTENT_DETECTOR",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
      },
      body: JSON.stringify({ text, language: "en", explain: false })
    });

    const payload = await parseJsonSafely(response);
    
    // Log the raw payload internally for debugging if needed, but don't fail immediately if 403, check payload first
    if (!response.ok && !payload) {
      return mapHttpError("quillbot", response.status, Date.now() - startedAt);
    }

    // QuillBot seems to nest their data sometimes or use different keys
    let nestedData = null;
    if (payload && typeof payload === "object" && !Array.isArray(payload) && "data" in payload) {
      nestedData = (payload as Record<string, unknown>).data;
    }
    
    const score = findNumericScore(payload, [
      "aiProbability",
      "score",
      "probability",
      "generated_probability",
      "ai_score" // added potential fallback keys
    ]) ?? (nestedData && typeof nestedData === "object" && !Array.isArray(nestedData) ? findNumericScore(nestedData as Record<string, unknown>, ["aiProbability", "score", "probability"]) : null);

    if (score === null || score === undefined) {
      return {
        provider: "quillbot",
        status: "error",
        errorCode: "bad_response",
        message: `QuillBot response did not include a recognizable score. Status: ${response.status}`,
        durationMs: Date.now() - startedAt
      };
    }

    return {
      provider: "quillbot",
      status: "success",
      score: Math.round(score),
      rawResponse: payload,
      durationMs: Date.now() - startedAt
    };
  } catch (error) {
    return mapThrowable("quillbot", error, startedAt);
  }
}

async function analyzeWithGptZero(text: string): Promise<ProviderResult> {
  const startedAt = Date.now();

  try {
    const session = await sessionManager.getSession();
    const scanId = crypto.randomUUID();
    
    const hasDirectCookie = appEnv.gptZeroDirectCookie && appEnv.gptZeroDirectCookie.length > 0;
    
    // Prepare cookies for Playwright injection
    const playwrightCookies: { name: string, value: string, domain: string, path: string }[] = [];
    if (hasDirectCookie && appEnv.gptZeroDirectCookie) {
      playwrightCookies.push({
        name: "accessToken4",
        value: appEnv.gptZeroDirectCookie,
        domain: ".gptzero.me",
        path: "/"
      });
      playwrightCookies.push({
        name: "_ca_device_id",
        value: "ca_903950f3-8588-4ca7-aaff-b67cc9004172",
        domain: ".gptzero.me",
        path: "/"
      });
      playwrightCookies.push({
        name: "plan",
        value: "Free",
        domain: ".gptzero.me",
        path: "/"
      });
    } else {
      // Format session cookies for Playwright
      for (const cookie of session.cookies) {
        if (cookie.value) {
          playwrightCookies.push({
            name: cookie.name,
            value: cookie.value,
            domain: cookie.domain || ".gptzero.me",
            path: cookie.path || "/"
          });
        }
      }
    }

    // Use Playwright fetch to bypass Cloudflare TLS blocking
    const response = await playwrightFetch.fetch("https://api.gptzero.me/v3/ai/text", {
      method: "POST",
      headers: {
        accept: "*/*",
        "content-type": "application/json",
        origin: "https://app.gptzero.me",
        referer: "https://app.gptzero.me/",
        "x-gptzero-platform": "webapp",
        "x-page": `/documents/${scanId}`,
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36"
      },
      body: JSON.stringify({
        scanId,
        multilingual: true,
        document: `${text}\n`,
        interpretability_required: false
      })
    }, playwrightCookies);

    const payload = await parseJsonSafely(response);
    
    if (!response.ok && !payload) {
      return mapHttpError("gptzero", response.status, Date.now() - startedAt);
    }

    // NEW GPTZERO PARSER based on your provided JSON
    // Look for class_probabilities.ai in the documents array
    let score = null;
    
    if (payload && typeof payload === 'object' && 'documents' in payload && Array.isArray((payload as any).documents) && (payload as any).documents.length > 0) {
      const doc = (payload as any).documents[0];
      if (doc?.class_probabilities?.ai !== undefined) {
         // It's a 0-1 probability, convert to 0-100 percentage
         score = doc.class_probabilities.ai * 100;
      } else if (doc?.completely_generated_prob !== undefined) {
         score = doc.completely_generated_prob * 100;
      }
    }
    
    // Fallback to old parser just in case
    if (score === null) {
      score = findNumericScore(payload, [
        "average_generated_prob",
        "completely_generated_prob",
        "generatedProbability",
        "probability",
        "score"
      ]);
      // if it was found via old parser, assume it might already be 0-100 or 0-1, handle scale
      if (score !== null && score <= 1) {
         score = score * 100;
      }
    }

    if (score === null || isNaN(score)) {
      return {
        provider: "gptzero",
        status: "error",
        errorCode: "bad_response",
        message: "GPTZero response did not include a recognizable score. Format may have changed.",
        durationMs: Date.now() - startedAt
      };
    }

    return {
      provider: "gptzero",
      status: "success",
      score: Math.round(score),
      rawResponse: payload,
      durationMs: Date.now() - startedAt
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes("GPTZero")) {
      return {
        provider: "gptzero",
        status: "error",
        errorCode: "session_refresh_failed",
        message: error.message,
        durationMs: Date.now() - startedAt
      };
    }

    return mapThrowable("gptzero", error, startedAt);
  }
}

function mapHttpError(
  provider: ProviderId,
  status: number,
  durationMs: number
): ProviderResult {
  if (status === 401 || status === 403) {
    return {
      provider,
      status: "error",
      errorCode: "unauthorized",
      message: `${provider} rejected the request.`,
      durationMs
    };
  }

  if (status === 429) {
    return {
      provider,
      status: "error",
      errorCode: "rate_limited",
      message: `${provider} rate limited the request.`,
      durationMs
    };
  }

  return {
    provider,
    status: "error",
    errorCode: "bad_response",
    message: `${provider} returned HTTP ${status}.`,
    durationMs
  };
}

function mapThrowable(provider: ProviderId, error: unknown, startedAt: number): ProviderResult {
  if (error instanceof DOMException && error.name === "TimeoutError") {
    return {
      provider,
      status: "error",
      errorCode: "timeout",
      message: `${provider} timed out.`,
      durationMs: Date.now() - startedAt
    };
  }

  return {
    provider,
    status: "error",
    errorCode: "network_error",
    message: error instanceof Error ? error.message : `${provider} request failed.`,
    durationMs: Date.now() - startedAt
  };
}
