import { chromium } from "playwright";
import type { Browser, BrowserContext, Page } from "playwright";
import { appEnv } from "@/lib/env";

/**
 * A shared Playwright session manager to mimic a real browser for fetch requests.
 * This avoids TLS fingerprinting issues (Cloudflare 403s) by using actual Chromium.
 */
class PlaywrightFetch {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;

  private async getContext(): Promise<BrowserContext> {
    if (this.context) return this.context;

    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: true, // Keep it headless for speed unless debugging
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-blink-features=AutomationControlled" // Hide webdriver flag
        ]
      });
    }

    this.context = await this.browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 720 },
      locale: "en-US",
      timezoneId: "America/New_York"
    });

    return this.context;
  }

  /**
   * Performs a fetch-like request using Playwright page.evaluate()
   * This ensures headers, TLS, and cookies are exactly what a browser would send.
   */
  async fetch(url: string, options: RequestInit = {}, cookies?: { name: string, value: string, domain: string, path: string }[]): Promise<Response> {
    const context = await this.getContext();
    
    // Inject cookies into the browser context if provided
    if (cookies && cookies.length > 0) {
      await context.addCookies(cookies);
    }
    
    // Use Playwright's native APIRequestContext instead of page.evaluate()
    // This completely bypasses all CORS and CSP restrictions that occur within a page context
    const requestContext = context.request;
    
    const playwrightResponse = await requestContext.fetch(url, {
      method: options.method || 'GET',
      headers: (options.headers as Record<string, string>) || {},
      data: options.body,
    });
    
    const responseText = await playwrightResponse.text();
    const headers = playwrightResponse.headers();
    
    return new Response(responseText, {
      status: playwrightResponse.status(),
      statusText: playwrightResponse.statusText(),
      headers: new Headers(headers)
    });
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.context = null;
    }
  }
}

export const playwrightFetch = new PlaywrightFetch();
