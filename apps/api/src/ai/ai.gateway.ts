import { AiConfig } from './ai.config';
import { AiAttemptException, aiAttemptError } from './ai-errors';
import { AiTaskKey } from './ai-task.registry';

type RuntimeErrorBody = { error?: { code?: unknown } };

export class AiGateway {
  constructor(private readonly config: AiConfig) {}

  async infer(task: AiTaskKey, requestId: string, input: unknown): Promise<unknown> {
    if (!this.config.available) throw aiAttemptError('AI_RUNTIME_FAILURE');

    let response: Response;
    try {
      response = await fetch(`${this.config.baseUrl.replace(/\/+$/, '')}/v1/infer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.token}`,
        },
        body: JSON.stringify({ contractVersion: '1.0', requestId, task, locale: 'vi-VN', input }),
        signal: AbortSignal.timeout(this.config.timeoutMs),
      });
    } catch (error) {
      const name = error instanceof Error ? error.name : '';
      if (name === 'TimeoutError' || name === 'AbortError') throw aiAttemptError('AI_TIMEOUT');
      if (error instanceof TypeError) throw aiAttemptError('AI_CONNECTION_FAILURE');
      throw aiAttemptError('AI_RUNTIME_FAILURE', 'AI_RUNTIME_TECHNICAL_FAILURE');
    }

    let body: string;
    try {
      body = await response.text();
    } catch (error) {
      const name = error instanceof Error ? error.name : '';
      if (name === 'TimeoutError' || name === 'AbortError') throw aiAttemptError('AI_TIMEOUT');
      throw aiAttemptError('AI_CONNECTION_FAILURE');
    }
    if (!body.trim()) throw aiAttemptError('AI_EMPTY_RESPONSE');

    let parsed: unknown;
    try {
      parsed = JSON.parse(body);
    } catch {
      throw aiAttemptError('AI_INVALID_STRUCTURE');
    }

    if (response.ok) return parsed;
    throw this.mapRuntimeFailure(response.status, parsed as RuntimeErrorBody);
  }

  private mapRuntimeFailure(status: number, body: RuntimeErrorBody): AiAttemptException {
    if (status === 408 || status === 504) return aiAttemptError('AI_TIMEOUT');
    if (body?.error?.code === 'RUNTIME_UNAVAILABLE') return aiAttemptError('AI_CONNECTION_FAILURE');
    if (status === 400 || status === 422) return aiAttemptError('AI_RUNTIME_FAILURE', 'AI_RUNTIME_PROTOCOL_FAILURE');
    if (status === 401 || status === 403) return aiAttemptError('AI_RUNTIME_FAILURE', 'AI_RUNTIME_AUTH_FAILURE');
    if (status >= 500 && body?.error?.code === 'INFERENCE_FAILED') return aiAttemptError('AI_RUNTIME_FAILURE', 'AI_RUNTIME_INFERENCE_FAILURE');
    return aiAttemptError('AI_RUNTIME_FAILURE', 'AI_RUNTIME_TECHNICAL_FAILURE');
  }
}
