import { AiGatewayError } from './ai-gateway.service';

export interface RuntimeClientConfig {
  baseUrl?: string;
  apiKey?: string;
}

export interface RuntimeHttpResponse {
  status: number;
  body: string;
}

export interface RuntimeHttpAdapter {
  assertReady?(): void;
  post(url: string, body: string, headers: Record<string, string>, timeoutMs: number): Promise<RuntimeHttpResponse>;
}

export class RuntimeHttpClient implements RuntimeHttpAdapter {
  constructor(private readonly config: RuntimeClientConfig, private readonly send: typeof fetch = fetch) {}

  assertReady(): void {
    try {
      const base = new URL(this.config.baseUrl ?? '');
      if (!['http:', 'https:'].includes(base.protocol) || !this.config.apiKey) throw new Error('invalid runtime config');
    } catch {
      throw new AiGatewayError('AI_RUNTIME_FAILURE', 502, 'AI_RUNTIME_CONFIGURATION_FAILURE');
    }
  }

  async post(_url: string, body: string, _headers: Record<string, string>, timeoutMs: number): Promise<RuntimeHttpResponse> {
    this.assertReady();
    const endpoint = new URL('/v1/infer', this.config.baseUrl).toString();
    const response = await this.send(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.config.apiKey}` },
      body,
      signal: AbortSignal.timeout(Math.min(timeoutMs, 60_000)),
    });
    return { status: response.status, body: await response.text() };
  }
}
