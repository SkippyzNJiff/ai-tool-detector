import type { ProviderId } from "@/lib/types";

function readBoolean(value: string | undefined, fallback: boolean) {
  if (value === undefined) {
    return fallback;
  }

  return value.toLowerCase() === "true";
}

function readNumber(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const appEnv = {
  enableZeroGpt: readBoolean(process.env.ENABLE_ZEROGPT, true),
  enableQuillBot: readBoolean(process.env.ENABLE_QUILLBOT, false),
  enableGptZero: readBoolean(process.env.ENABLE_GPTZERO, false),
  strictStableOnlyMode: readBoolean(process.env.STRICT_STABLE_ONLY_MODE, false),
  analyzeRateLimitMax: readNumber(process.env.ANALYZE_RATE_LIMIT_MAX, 10),
  analyzeRateLimitWindowMs: readNumber(process.env.ANALYZE_RATE_LIMIT_WINDOW_MS, 10 * 60 * 1000),
  gptZeroEmail: process.env.GPTZERO_EMAIL,
  gptZeroPassword: process.env.GPTZERO_PASSWORD,
  gptZeroHeadless: readBoolean(process.env.GPTZERO_HEADLESS, true),
  gptZeroLoginUrl: process.env.GPTZERO_LOGIN_URL ?? "https://app.gptzero.me/login",
  gptZeroReferer: process.env.GPTZERO_REFERER ?? "https://app.gptzero.me/",
  gptZeroScanId: process.env.GPTZERO_SCAN_ID, // Reusable scanId from your account
  gptZeroDirectCookie: process.env.GPTZERO_COOKIES?.replace(/^"|"$/g, ''), // Full cookie string including CSRF
  quillBotDirectCookie: process.env.QUILLBOT_COOKIES?.replace(/^"|"$/g, '') // Full QuillBot cookie string with useridtoken
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
