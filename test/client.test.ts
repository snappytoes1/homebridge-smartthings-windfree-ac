import { afterEach, describe, expect, it, vi } from 'vitest';

import { SmartThingsAuth } from '../src/smartthings/auth.js';
import { SmartThingsClient } from '../src/smartthings/client.js';
import type { LoggerLike, NormalizedConfig, SmartThingsCommand } from '../src/types.js';

const command: SmartThingsCommand = {
  capability: 'switch',
  command: 'on',
};

describe('SmartThingsClient command handling', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('retries rate-limited command requests with Retry-After backoff', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({}, 429, 'Too Many Requests', { 'Retry-After': '0' }))
      .mockResolvedValueOnce(jsonResponse({ results: [{ status: 'ACCEPTED' }] }));

    vi.stubGlobal('fetch', fetchMock);
    const client = createClient();

    const result = client.executeCommand('device-1', command);
    await vi.advanceTimersByTimeAsync(1_200);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(500);
    await expect(result).resolves.toEqual({ results: [{ status: 'ACCEPTED' }] });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('queues command requests per device', async () => {
    vi.useFakeTimers();
    let resolveFirstFetch: ((value: Response) => void) | undefined;
    const fetchMock = vi.fn<typeof fetch>()
      .mockImplementationOnce(() => new Promise<Response>(resolve => {
        resolveFirstFetch = resolve;
      }))
      .mockResolvedValueOnce(jsonResponse({ results: [{ status: 'SECOND' }] }));

    vi.stubGlobal('fetch', fetchMock);
    const client = createClient();

    const first = client.executeCommand('device-1', command);
    const second = client.executeCommand('device-1', { ...command, command: 'off' });

    await vi.advanceTimersByTimeAsync(1_200);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(5_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolveFirstFetch?.(jsonResponse({ results: [{ status: 'FIRST' }] }));
    await vi.advanceTimersByTimeAsync(0);
    await expect(first).resolves.toEqual({ results: [{ status: 'FIRST' }] });

    await vi.advanceTimersByTimeAsync(1_200);
    await expect(second).resolves.toEqual({ results: [{ status: 'SECOND' }] });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('SmartThingsClient status handling', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('coalesces concurrent status requests and caches the result briefly', async () => {
    const status = {
      components: {
        main: {
          switch: {
            switch: {
              value: 'on',
            },
          },
        },
      },
    };
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(status));

    vi.stubGlobal('fetch', fetchMock);
    const client = createClient();

    const [first, second] = await Promise.all([
      client.getDeviceStatus('device-1'),
      client.getDeviceStatus('device-1'),
    ]);
    const third = await client.getDeviceStatus('device-1');

    expect(first).toEqual(status);
    expect(second).toEqual(status);
    expect(third).toEqual(status);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

function createClient(): SmartThingsClient {
  const log = createLogger();
  return new SmartThingsClient('https://api.smartthings.com/v1', new SmartThingsAuth(createConfig(), log), log);
}

function createConfig(): NormalizedConfig {
  return {
    platform: 'SmartThingsWindFreeAC',
    name: 'Samsung WindFree AC',
    baseUrl: 'https://api.smartthings.com/v1',
    authMethod: 'pat',
    accessToken: 'pat-token',
    redirectUri: 'https://httpbin.org/get',
    exposeWindFree: true,
    exposeDisplay: true,
    exposeAutoClean: true,
    exposeSwing: true,
    exposeFan: true,
    debug: false,
  };
}

function createLogger(): LoggerLike {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}

function jsonResponse(body: unknown, status = 200, statusText = 'OK', headers?: HeadersInit): Response {
  const responseHeaders = new Headers(headers);
  responseHeaders.set('Content-Type', 'application/json');

  return new Response(JSON.stringify(body), {
    status,
    statusText,
    headers: responseHeaders,
  });
}
