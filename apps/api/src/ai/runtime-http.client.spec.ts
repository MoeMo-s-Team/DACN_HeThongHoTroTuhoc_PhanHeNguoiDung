import { RuntimeHttpClient } from './runtime-http.client';

describe('RuntimeHttpClient', () => {
  it('fails configuration checks before attempting fetch', () => {
    const send = jest.fn();
    const client = new RuntimeHttpClient({}, send as unknown as typeof fetch);
    expect(() => client.assertReady()).toThrow(expect.objectContaining({ internalCode: 'AI_RUNTIME_CONFIGURATION_FAILURE' }));
    expect(send).not.toHaveBeenCalled();
  });

  it.each([
    ['http://127.0.0.1:8000', 'http://127.0.0.1:8000/v1/infer'],
    ['https://gpu-host.example.ts.net', 'https://gpu-host.example.ts.net/v1/infer'],
  ])('posts to the fixed route from configured origin %s with Bearer auth', async (baseUrl, expectedUrl) => {
    const timeout = jest.spyOn(AbortSignal, 'timeout');
    const send = jest.fn().mockResolvedValue({ status: 200, text: async () => '{"ok":true}' }) as unknown as typeof fetch;
    const client = new RuntimeHttpClient({ baseUrl, apiKey: 'runtime-secret' }, send);

    await expect(client.post('/ignored', '{"requestId":"r1"}', {}, 90_000)).resolves.toEqual({
      status: 200,
      body: '{"ok":true}',
    });

    const [url, init] = (send as jest.Mock).mock.calls[0] as [string, RequestInit];
    expect(url).toBe(expectedUrl);
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ 'Content-Type': 'application/json', Authorization: 'Bearer runtime-secret' });
    expect(init.body).toBe('{"requestId":"r1"}');
    expect(timeout).toHaveBeenCalledWith(60_000);
    expect((init.signal as AbortSignal).aborted).toBe(false);
    timeout.mockRestore();
  });
});
