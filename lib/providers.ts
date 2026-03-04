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
    // Use the full cookie string from env (includes useridtoken Firebase JWT)
    if (!appEnv.quillBotDirectCookie) {
      return {
        provider: "quillbot",
        status: "error",
        errorCode: "bad_response",
        message: "QUILLBOT_COOKIES not configured in .env.local",
        durationMs: Date.now() - startedAt
      };
    }

    const response = await axios.post("https://quillbot.com/api/ai-detector/score", 
      { text, language: "en", explain: false },
      {
        headers: {
          accept: "application/json, text/plain, */*",
          "accept-language": "en-US,en;q=0.8",
          "content-type": "application/json",
          origin: "https://quillbot.com",
          "platform-type": "webapp",
          "qb-product": "AI_CONTENT_DETECTOR",
          referer: "https://quillbot.com/ai-content-detector",
          "sec-ch-ua": '"Not:A-Brand";v="99", "Brave";v="145", "Chromium";v="145"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": '"Windows"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "sec-gpc": "1",
          "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
          cookie: appEnv.quillBotDirectCookie
        },
        httpsAgent: customAgent,
        timeout: 20000,
        validateStatus: () => true
      }
    );

    const payload = response.data;
    
    if (response.status !== 200) {
      return mapHttpError("quillbot", response.status, Date.now() - startedAt);
    }

    // QuillBot returns: { data: { value: { aiScore: 1.0, chunks: [...] } } }
    let nestedValue = null;
    if (payload && typeof payload === "object" && !Array.isArray(payload) && "data" in payload) {
      const data = (payload as Record<string, unknown>).data;
      if (data && typeof data === "object" && !Array.isArray(data) && "value" in data) {
        nestedValue = (data as Record<string, unknown>).value;
      }
    }
    
    const score = findNumericScore(payload, [
      "data.value.aiScore",
      "aiScore",
      "score",
      "probability"
    ]) ?? (nestedValue && typeof nestedValue === "object" && !Array.isArray(nestedValue) ? findNumericScore(nestedValue as Record<string, unknown>, ["aiScore", "score", "probability"]) : null);

    if (score === null || score === undefined) {
      return {
        provider: "quillbot",
        status: "error",
        errorCode: "bad_response",
        message: `QuillBot response did not include a recognizable score. Status: ${response.status}`,
        durationMs: Date.now() - startedAt
      };
    }

    // QuillBot might return 0-1 probability, convert to 0-100 if needed
    const percentageScore = score <= 1 ? score * 100 : score;

    return {
      provider: "quillbot",
      status: "success",
      score: Math.round(percentageScore),
      rawResponse: payload,
      durationMs: Date.now() - startedAt
    };
  } catch (error) {
    return mapThrowable("quillbot", error, startedAt);
  }
}

import axios from 'axios';
import https from 'https';

// Create a custom HTTPS agent that mimics a browser's TLS fingerprint closely enough for basic Cloudflare
const customAgent = new https.Agent({
  rejectUnauthorized: true,
  ciphers: 'TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384',
});

// ... existing code ...

async function analyzeWithGptZero(text: string): Promise<ProviderResult> {
  const startedAt = Date.now();

  try {
    // Use the fixed scanId from env (reused across all requests)
    const scanId = appEnv.gptZeroScanId || crypto.randomUUID();

    // Use the full cookie string from env (includes CSRF token + all session cookies)
    if (!appEnv.gptZeroDirectCookie) {
      return {
        provider: "gptzero",
        status: "error",
        errorCode: "bad_response",
        message: "GPTZERO_COOKIES not configured in .env.local",
        durationMs: Date.now() - startedAt
      };
    }

    // Submit the scan with full cookie auth
    const response = await axios.post("https://api.gptzero.me/v3/ai/text", {
      scanId,
      multilingual: true,
      document: `${text}\n`,
      interpretability_required: false
    }, {
      headers: {
        accept: "*/*",
        "accept-language": "en-US,en;q=0.8",
        "content-type": "application/json",
        origin: "https://app.gptzero.me",
        priority: "u=1, i",
        referer: "https://app.gptzero.me/",
        "sec-ch-ua": '"Not:A-Brand";v="99", "Brave";v="145", "Chromium";v="145"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
        "sec-gpc": "1",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
        "x-gptzero-platform": "webapp",
        "x-page": `/documents/${scanId}`,
        cookie: appEnv.gptZeroDirectCookie
      },
      httpsAgent: customAgent,
      timeout: 20000,
      validateStatus: () => true
    });

    const payload = response.data;
    
    if (response.status !== 200) {
      return mapHttpError("gptzero", response.status, Date.now() - startedAt);
    }

    // NEW GPTZERO PARSER
    let score = null;
    if (payload && typeof payload === 'object' && 'documents' in payload && Array.isArray((payload as any).documents) && (payload as any).documents.length > 0) {
      const doc = (payload as any).documents[0];
      if (doc?.class_probabilities?.ai !== undefined) {
         score = doc.class_probabilities.ai * 100;
      } else if (doc?.completely_generated_prob !== undefined) {
         score = doc.completely_generated_prob * 100;
      }
    }
    
    if (score === null) {
      score = findNumericScore(payload, [
        "average_generated_prob",
        "completely_generated_prob",
        "generatedProbability",
        "probability",
        "score"
      ]);
      if (score !== null && score <= 1) {
         score = score * 100;
      }
    }

    if (score === null || isNaN(score)) {
      return {
        provider: "gptzero",
        status: "error",
        errorCode: "bad_response",
        message: "GPTZero response did not include a recognizable score.",
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
  } catch (error: any) {
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
