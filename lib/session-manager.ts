import { appEnv } from "@/lib/env";
import { createGptZeroSession } from "@/lib/session/playwright-gptzero-auth";
import type { ProviderHealthStatus, ProviderSession } from "@/lib/types";

type SessionState = {
  session: ProviderSession | null;
  refreshPromise: Promise<ProviderSession> | null;
  degradedReason?: string;
  lastFailureAt?: number;
};

const COOLDOWN_MS = 5 * 60 * 1000;

class InMemorySessionManager {
  private gptzero: SessionState = {
    session: null,
    refreshPromise: null
  };

  async getSession() {
    if (!appEnv.enableGptZero) {
      throw new Error("GPTZero is disabled.");
    }

    const now = Date.now();
    if (
      this.gptzero.session &&
      (!this.gptzero.session.expiresAt ||
        new Date(this.gptzero.session.expiresAt).getTime() - now > 2 * 60 * 1000)
    ) {
      return this.gptzero.session;
    }

    if (this.gptzero.lastFailureAt && now - this.gptzero.lastFailureAt < COOLDOWN_MS) {
      throw new Error(this.gptzero.degradedReason ?? "GPTZero session refresh is cooling down.");
    }

    return this.refreshSession();
  }

  async refreshSession() {
    if (this.gptzero.refreshPromise) {
      return this.gptzero.refreshPromise;
    }

    this.gptzero.refreshPromise = createGptZeroSession()
      .then((session) => {
        this.gptzero.session = session;
        this.gptzero.degradedReason = undefined;
        this.gptzero.lastFailureAt = undefined;
        return session;
      })
      .catch((error) => {
        this.gptzero.degradedReason =
          error instanceof Error ? error.message : "GPTZero session refresh failed.";
        this.gptzero.lastFailureAt = Date.now();
        throw error;
      })
      .finally(() => {
        this.gptzero.refreshPromise = null;
      });

    return this.gptzero.refreshPromise;
  }

  getHealthStatus(): ProviderHealthStatus {
    if (!appEnv.enableGptZero) {
      return {
        id: "gptzero",
        enabled: false,
        class: "authenticated",
        healthy: false,
        degradedReason: "Feature flag disabled."
      };
    }

    if (!appEnv.gptZeroEmail || !appEnv.gptZeroPassword) {
      return {
        id: "gptzero",
        enabled: true,
        class: "authenticated",
        healthy: false,
        degradedReason: "Missing GPTZero credentials."
      };
    }

    return {
      id: "gptzero",
      enabled: true,
      class: "authenticated",
      healthy: !this.gptzero.degradedReason,
      degradedReason: this.gptzero.degradedReason
    };
  }
}

export const sessionManager = new InMemorySessionManager();
