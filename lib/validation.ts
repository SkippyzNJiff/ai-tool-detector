import type { AnalyzeRequest, ProviderPreference } from "@/lib/types";

const MIN_CHARS = 100;
const MAX_CHARS = 15000;

export function validateText(text: string) {
  const trimmed = text.trim();

  if (!trimmed) {
    throw new Error("Text is required.");
  }

  if (trimmed.length < MIN_CHARS) {
    throw new Error(`Text must be at least ${MIN_CHARS} characters.`);
  }

  if (trimmed.length > MAX_CHARS) {
    throw new Error(`Text must be ${MAX_CHARS} characters or less.`);
  }

  return trimmed;
}

function isProviderPreference(value: unknown): value is ProviderPreference {
  return value === "all" || value === "stable-only";
}

export function parseAnalyzeRequest(input: unknown): AnalyzeRequest {
  if (!input || typeof input !== "object") {
    throw new Error("A JSON body is required.");
  }

  const raw = input as Record<string, unknown>;
  if (typeof raw.text !== "string") {
    throw new Error("`text` must be a string.");
  }

  const providerPreference = isProviderPreference(raw.providerPreference)
    ? raw.providerPreference
    : "all";

  return {
    text: validateText(raw.text),
    providerPreference
  };
}
