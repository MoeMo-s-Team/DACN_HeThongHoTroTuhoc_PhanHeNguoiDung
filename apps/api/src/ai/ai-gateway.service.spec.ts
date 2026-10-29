import { AiGatewayError, AiGatewayService } from './ai-gateway.service';
import type { RuntimeHttpAdapter, RuntimeHttpResponse } from './runtime-http.client';
import { buildRequest } from './capacity-preflight.service';
import { SchemaRegistryService } from './schema-registry.service';

class FakeAdapter implements RuntimeHttpAdapter {
  calls = 0;
  response: RuntimeHttpResponse | Error = { status: 200, body: '{"ok":true}' };

  async post(): Promise<RuntimeHttpResponse> {
    this.calls += 1;
    if (this.response instanceof Error) throw this.response;
    return this.response;
  }
}

describe('AiGatewayService', () => {
  const request = buildRequest('STUDENT_LEARNING_ANALYSIS', { assessments: [] }, 'req-1');
  const runtimeError = (code: string, requestId = request.requestId, contractVersion: string = request.contractVersion) => ({
    contractVersion,
    requestId,
    error: { code, message: 'runtime failed' },
  });
  const gateway = (adapter: FakeAdapter) => new AiGatewayService(adapter, new SchemaRegistryService());

  it('returns parsed success response', async () => {
    const adapter = new FakeAdapter();
    await expect(gateway(adapter).infer(request)).resolves.toEqual({ status: 200, body: { ok: true } });
    expect(adapter.calls).toBe(1);
  });

  it.each([
    ['network unavailable', Object.assign(new Error('secret-bearing network detail'), { code: 'ECONNRESET' }), 'AI_CONNECTION_FAILURE', 502],
    ['timeout', Object.assign(new Error('secret-bearing timeout detail'), { name: 'TimeoutError' }), 'AI_TIMEOUT', 504],
  ])('normalizes %s without retry', async (_label, error, code, status) => {
    const adapter = new FakeAdapter();
    adapter.response = error as Error;
    try {
      await gateway(adapter).infer(request);
      throw new Error('expected gateway failure');
    } catch (failure) {
      expect(failure).toBeInstanceOf(AiGatewayError);
      expect((failure as AiGatewayError).getStatus()).toBe(status);
      expect((failure as AiGatewayError).getResponse()).toEqual({
        code,
        message: expect.any(String),
        details: null,
      });
      expect((failure as Error).message).not.toContain('secret-bearing');
    }
    expect(adapter.calls).toBe(1);
  });

  it.each([
    [200, '', 'AI_EMPTY_RESPONSE', 502],
    [200, '{broken', 'AI_INVALID_STRUCTURE', 502],
    [408, '', 'AI_TIMEOUT', 504],
    [504, '', 'AI_TIMEOUT', 504],
    [400, '{"error":{"code":"INVALID_REQUEST"}}', 'AI_RUNTIME_FAILURE', 502],
    [422, '{"error":{"code":"INVALID_REQUEST"}}', 'AI_RUNTIME_FAILURE', 502],
    [401, '', 'AI_RUNTIME_FAILURE', 502],
    [403, '', 'AI_RUNTIME_FAILURE', 502],
    [503, JSON.stringify(runtimeError('RUNTIME_UNAVAILABLE')), 'AI_CONNECTION_FAILURE', 502],
    [500, JSON.stringify(runtimeError('INFERENCE_FAILED')), 'AI_RUNTIME_FAILURE', 502],
    [500, '{"message":"secret prompt response"}', 'AI_RUNTIME_FAILURE', 502],
    [503, '{"error":{"code":"RUNTIME_UNAVAILABLE"}}', 'AI_RUNTIME_FAILURE', 502],
    [503, JSON.stringify(runtimeError('RUNTIME_UNAVAILABLE', 'other-request')), 'AI_RUNTIME_FAILURE', 502],
    [503, JSON.stringify(runtimeError('RUNTIME_UNAVAILABLE', request.requestId, '2.0')), 'AI_RUNTIME_FAILURE', 502],
  ])('maps HTTP %i to the approved envelope', async (status, body, code, expectedStatus) => {
    const adapter = new FakeAdapter();
    adapter.response = { status: status as number, body: body as string };
    await expect(gateway(adapter).infer(request)).rejects.toMatchObject({
      code,
      status: expectedStatus,
      response: { code, message: expect.any(String), details: null },
    });
    expect(adapter.calls).toBe(1);
  });
});
