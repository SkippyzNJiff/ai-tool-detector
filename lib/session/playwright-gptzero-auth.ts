import { appEnv } from "@/lib/env";
import type { ProviderSession } from "@/lib/types";

export async function createGptZeroSession(): Promise<ProviderSession> {
  // Bypass Playwright login completely if a direct token is provided in .env
  if (appEnv.gptZeroDirectCookie) {
    return {
      provider: "gptzero",
      cookies: [{
        name: "accessToken4",
        value: appEnv.gptZeroDirectCookie,
        domain: "app.gptzero.me",
        path: "/",
        expires: Date.now() / 1000 + (7 * 24 * 60 * 60), // Assume valid for a week
        httpOnly: true,
        secure: true
      }],
      headers: {
        origin: "https://app.gptzero.me",
        referer: appEnv.gptZeroReferer,
        "x-gptzero-platform": "webapp"
      },
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      refreshedAt: new Date().toISOString()
    };
  }

  if (!appEnv.gptZeroEmail || !appEnv.gptZeroPassword) {
    throw new Error("Missing GPTZero credentials or direct cookie token.");
  }

  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: appEnv.gptZeroHeadless });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(appEnv.gptZeroLoginUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    
    const emailInput = page.locator('input[name="email"]').first();
    const passInput = page.locator('input[name="password"]').first();
    const loginButton = page.locator('button[type="submit"]').first();

    await emailInput.waitFor({ state: "visible", timeout: 20000 });
    await emailInput.fill(appEnv.gptZeroEmail);
    
    await passInput.waitFor({ state: "visible", timeout: 5000 });
    await passInput.fill(appEnv.gptZeroPassword);
    
    await loginButton.click();

    try {
      await page.waitForURL(/app\.gptzero\.me\/(documents|dashboard|home|$)/, {
        timeout: 15000
      });
    } catch (navError) {
      const bodyText = await page.innerText("body");
      if (bodyText.includes("captcha") || bodyText.includes("verify") || bodyText.includes("robot")) {
        throw new Error("GPTZero login blocked by captcha/challenge.");
      }
      console.warn("GPTZero login slow or redirected unexpectedly.");
    }

    const cookies = await context.cookies();
    const accessToken = cookies.find((cookie) => cookie.name === "accessToken4");
    if (!accessToken) {
      throw new Error("GPTZero login succeeded but accessToken4 was not found.");
    }

    const expiresAt =
      accessToken.expires && accessToken.expires > 0
        ? new Date(accessToken.expires * 1000).toISOString()
        : new Date(Date.now() + 55 * 60 * 1000).toISOString();

    return {
      provider: "gptzero",
      cookies: cookies.map((cookie) => ({
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path,
        expires: cookie.expires,
        httpOnly: cookie.httpOnly,
        secure: cookie.secure
      })),
      headers: {
        origin: "https://app.gptzero.me",
        referer: appEnv.gptZeroReferer,
        "x-gptzero-platform": "webapp"
      },
      expiresAt,
      refreshedAt: new Date().toISOString()
    };
  } catch (error) {
    throw error instanceof Error ? error : new Error("GPTZero login automation failed.");
  } finally {
    await context.close();
    await browser.close();
  }
}
