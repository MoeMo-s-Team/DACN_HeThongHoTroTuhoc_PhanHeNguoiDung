import { RuntimeHttpClient } from './runtime-http.client';

describe('RuntimeHttpClient', () => {
  it('fails configuration checks before attempting fetch', () => {
    const send = jest.fn();
    const client = new RuntimeHttpClient({}, send as unknown as typeof fetch);
    expect(() => client.assertReady()).toThrow(expect.objectContaining({ internalCode: 'AI_RUNTIME_CONFIGURATION_FAILURE' }));
    expect(send).not.toHaveBeenCalled();
  });

  it('posts to the fixed runtime route with configured auth and caps timeout at 60s', async () => {
    const timeout = jest.spyOn(AbortSignal, 'timeout');
    const send = jest.fn().mockResolvedValue({ status: 200, text: async () => '{"ok":true}' }) as unknown as typeof fetch;
    const client = new RuntimeHttpClient({ baseUrl: 'https://runtime.example/api/', apiKey: 'runtime-secret' }, send);

    await expect(client.post('/ignored', '{"requestId":"r1"}', {}, 90_000)).resolves.toEqual({
      status: 200,
      body: '{"ok":true}',
    });

    const [url, init] = (send as jest.Mock).mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://runtime.example/v1/infer');
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ 'Content-Type': 'application/json', Authorization: 'Bearer runtime-secret' });
    expect(init.body).toBe('{"requestId":"r1"}');
    expect(timeout).toHaveBeenCalledWith(60_000);
    expect((init.signal as AbortSignal).aborted).toBe(false);
    timeout.mockRestore();
  });
});
