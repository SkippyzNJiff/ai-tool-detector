import type { ProviderId } from "@/lib/types";

function readBoolean(value: string | undefined, fallback: boolean) {
  if (value === undefined) {
    return fallback;
  }

  return value.trim().toLowerCase() === "true";
}

function readNumber(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

// Use a getter-based object so env vars are read at access time, not module load time
export const appEnv = {
  get enableZeroGpt() { return readBoolean(process.env.ENABLE_ZEROGPT, true); },
  get enableQuillBot() { return readBoolean(process.env.ENABLE_QUILLBOT, false); },
  get enableGptZero() { return readBoolean(process.env.ENABLE_GPTZERO, false); },
  get strictStableOnlyMode() { return readBoolean(process.env.STRICT_STABLE_ONLY_MODE, false); },
  get analyzeRateLimitMax() { return readNumber(process.env.ANALYZE_RATE_LIMIT_MAX, 10); },
  get analyzeRateLimitWindowMs() { return readNumber(process.env.ANALYZE_RATE_LIMIT_WINDOW_MS, 10 * 60 * 1000); },
  get gptZeroEmail() { return process.env.GPTZERO_EMAIL; },
  get gptZeroPassword() { return process.env.GPTZERO_PASSWORD; },
  get gptZeroHeadless() { return readBoolean(process.env.GPTZERO_HEADLESS, true); },
  get gptZeroLoginUrl() { return process.env.GPTZERO_LOGIN_URL ?? "https://app.gptzero.me/login"; },
  get gptZeroReferer() { return process.env.GPTZERO_REFERER ?? "https://app.gptzero.me/"; },
  get gptZeroScanId() { return process.env.GPTZERO_SCAN_ID; },
  get gptZeroDirectCookie() { return process.env.GPTZERO_COOKIES?.replace(/^"|"$/g, ''); },
  get quillBotDirectCookie() { return process.env.QUILLBOT_COOKIES?.replace(/^"|"$/g, ''); }
};

export function isProviderEnabled(provider: ProviderId) {
  if (provider === "zerogpt") {
    return appEnv.enableZeroGpt;
  }

  if (provider === "quillbot") {
    return appEnv.enableQuillBot;
  }

  return appEnv.enableGptZero;
}
