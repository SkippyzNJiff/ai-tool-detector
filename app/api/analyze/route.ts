import { NextResponse } from "next/server";
import { analyzeTextWithProviders } from "@/lib/analysis-service";
import { assertWithinRateLimit, RateLimitExceededError } from "@/lib/rate-limit";
import { parseAnalyzeRequest } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "local";

  try {
    assertWithinRateLimit(ip);

    const json = await request.json();
    const payload = parseAnalyzeRequest(json);
    const result = await analyzeTextWithProviders(payload);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return NextResponse.json(
        {
          error: "Too many requests. Try again in a few minutes.",
          retryAfterMs: error.retryAfterMs
        },
        { status: 429, headers: { "Retry-After": String(Math.ceil(error.retryAfterMs / 1000)) } }
      );
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: "Unexpected analysis failure." }, { status: 500 });
  }
}
