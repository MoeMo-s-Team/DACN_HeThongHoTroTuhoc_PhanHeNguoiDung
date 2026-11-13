import { AiGateway } from './ai.gateway';
import { loadAiConfig } from './ai.config';

describe('AiGateway', () => {
  it('sends one contract request with server credentials and the fixed timeout', async () => {
    const request = jest.fn().mockResolvedValue({ ok: true, status: 200, text: async () => '{"ok":true}' });
    const originalFetch = global.fetch;
    global.fetch = request as unknown as typeof fetch;
    const timeout = jest.spyOn(AbortSignal, 'timeout');
    const gateway = new AiGateway(loadAiConfig({
      AI_RUNTIME_BASE_URL: 'http://127.0.0.1:8000',
      AI_RUNTIME_TOKEN: 'server-only-token',
    }));
    try {
      await expect(gateway.infer('STUDENT_LEARNING_ANALYSIS', 'request-1', { goal: null }))
        .resolves.toEqual({ ok: true });
      expect(request).toHaveBeenCalledTimes(1);
      expect(request).toHaveBeenCalledWith('http://127.0.0.1:8000/v1/infer', expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer server-only-token' }),
        body: JSON.stringify({
          contractVersion: '1.0', requestId: 'request-1', task: 'STUDENT_LEARNING_ANALYSIS', locale: 'vi-VN', input: { goal: null },
        }),
      }));
      expect(timeout).toHaveBeenCalledWith(60_000);
    } finally {
      global.fetch = originalFetch;
      timeout.mockRestore();
    }
  });

  it('does not retry and maps runtime unavailability without exposing its body', async () => {
    const request = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
      text: async () => JSON.stringify({ contractVersion: '1.0', requestId: 'request-2', error: { code: 'RUNTIME_UNAVAILABLE', message: 'private runtime detail' } }),
    });
    const originalFetch = global.fetch;
    global.fetch = request as unknown as typeof fetch;
    const gateway = new AiGateway(loadAiConfig({ AI_RUNTIME_BASE_URL: 'http://localhost:8000', AI_RUNTIME_TOKEN: 'secret' }));
    try {
      await expect(gateway.infer('STUDENT_LEARNING_ANALYSIS', 'request-2', {})).rejects.toMatchObject({
        response: { code: 'AI_CONNECTION_FAILURE' },
      });
      expect(request).toHaveBeenCalledTimes(1);
      await expect(gateway.infer('STUDENT_LEARNING_ANALYSIS', 'request-2', {})).rejects.not.toHaveProperty('response.message', 'private runtime detail');
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('maps an empty HTTP response to AI_EMPTY_RESPONSE', async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, text: async () => '  ' }) as unknown as typeof fetch;
    const gateway = new AiGateway(loadAiConfig({ AI_RUNTIME_BASE_URL: 'http://localhost:8000', AI_RUNTIME_TOKEN: 'secret' }));
    try {
      await expect(gateway.infer('STUDENT_LEARNING_ANALYSIS', 'request-3', {})).rejects.toMatchObject({
        response: { code: 'AI_EMPTY_RESPONSE' },
      });
    } finally {
      global.fetch = originalFetch;
    }
  });

  it.each([
    [400, { code: 'INVALID_REQUEST' }, 'AI_RUNTIME_FAILURE', 'AI_RUNTIME_PROTOCOL_FAILURE'],
    [401, { code: 'AUTH_FAILED' }, 'AI_RUNTIME_FAILURE', 'AI_RUNTIME_AUTH_FAILURE'],
    [500, { code: 'INFERENCE_FAILED' }, 'AI_RUNTIME_FAILURE', 'AI_RUNTIME_INFERENCE_FAILURE'],
    [504, { code: 'INFERENCE_FAILED' }, 'AI_TIMEOUT', 'AI_TIMEOUT'],
  ])('maps runtime HTTP %i without exposing provider details', async (status, error, publicCode, internalCode) => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status, text: async () => JSON.stringify({ error: { ...error, message: 'secret detail' } }) }) as unknown as typeof fetch;
    const gateway = new AiGateway(loadAiConfig({ AI_RUNTIME_BASE_URL: 'http://localhost:8000', AI_RUNTIME_TOKEN: 'secret' }));
    try {
      await expect(gateway.infer('STUDENT_LEARNING_ANALYSIS', 'request-4', {})).rejects.toMatchObject({
        publicCode,
        internalCode,
      });
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('maps malformed runtime JSON to AI_INVALID_STRUCTURE', async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, text: async () => '{bad json' }) as unknown as typeof fetch;
    const gateway = new AiGateway(loadAiConfig({ AI_RUNTIME_BASE_URL: 'http://localhost:8000', AI_RUNTIME_TOKEN: 'secret' }));
    try {
      await expect(gateway.infer('STUDENT_LEARNING_ANALYSIS', 'request-5', {})).rejects.toMatchObject({ response: { code: 'AI_INVALID_STRUCTURE' } });
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('maps a body-stream timeout to AI_TIMEOUT', async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: jest.fn().mockRejectedValue(Object.assign(new Error('aborted'), { name: 'TimeoutError' })),
    }) as unknown as typeof fetch;
    const gateway = new AiGateway(loadAiConfig({ AI_RUNTIME_BASE_URL: 'http://localhost:8000', AI_RUNTIME_TOKEN: 'secret' }));
    try {
      await expect(gateway.infer('STUDENT_LEARNING_ANALYSIS', 'request-6', {})).rejects.toMatchObject({ publicCode: 'AI_TIMEOUT' });
    } finally {
      global.fetch = originalFetch;
    }
  });
});
