import { AIVerificationResult, VerificationRequest } from './types.ts';

/**
 * Configuration options for the Civic AI client.
 */
export interface AIClientOptions {
  /**
   * Base URL for the standalone microservice or backend route.
   * Defaults to auto-resolving: checks port 5001 first, falls back to relative `/api/ai` or `/api/complaints`.
   */
  baseUrl?: string;
  timeoutMs?: number;
}

/**
 * Smart Civic AI Client SDK.
 * Enables zero-friction consumption from any frontend component or backend script.
 */
export class CivicAIClient {
  private baseUrl?: string;
  private timeoutMs: number;

  constructor(options: AIClientOptions = {}) {
    this.baseUrl = options.baseUrl;
    this.timeoutMs = options.timeoutMs ?? 10000;
  }

  /**
   * Sends an image for forensics & severity triage.
   */
  async verifyImage(request: VerificationRequest): Promise<AIVerificationResult> {
    const endpointsToTry: string[] = [];

    if (this.baseUrl) {
      endpointsToTry.push(`${this.baseUrl.replace(/\/$/, '')}/verify`);
    } else {
      // 1. First preference: Standalone microservice on port 5001
      endpointsToTry.push('http://localhost:5001/verify');
      // 2. Second preference: Integrated route on main server
      endpointsToTry.push('/api/ai/verify');
      // 3. Third preference: Default complaints route
      endpointsToTry.push('/api/complaints/verify');
    }

    let lastError: any = null;

    for (const url of endpointsToTry) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status} from ${url}`);
        }

        const data = await response.json();
        if (data.verification) {
          return data.verification;
        }
        if (data.isAuthentic !== undefined) {
          return data;
        }
      } catch (err: any) {
        lastError = err;
        // Continue to fallback endpoint
      }
    }

    throw new Error(
      `AI Verification failed across all endpoints. Last error: ${lastError?.message || lastError}`
    );
  }

  /**
   * Pings the AI engine health status.
   */
  async checkHealth(): Promise<{ status: string; module: string; model: string }> {
    const targetUrl = this.baseUrl
      ? `${this.baseUrl.replace(/\/$/, '')}/health`
      : 'http://localhost:5001/health';

    const res = await fetch(targetUrl);
    if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`);
    return await res.json();
  }
}

/**
 * Default singleton instance ready for immediate use.
 */
export const aiClient = new CivicAIClient();
