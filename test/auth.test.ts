import { afterEach, describe, expect, it, vi } from 'vitest';

import { SmartThingsAuth } from '../src/smartthings/auth.js';
import type { LoggerLike } from '../src/types.js';

describe('SmartThings OAuth token refresh', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses the current OAuth endpoint and sends client_id', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      access_token: 'access-token',
      expires_in: 86_400,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    const auth = new SmartThingsAuth({
      platform: 'SmartThingsWindFreeAC',
      name: 'AC',
      baseUrl: 'https://api.smartthings.com/v1',
      authMethod: 'oauth2',
      clientId: 'client-id',
      clientSecret: 'client-secret',
      refreshToken: 'refresh-token',
      redirectUri: 'https://httpbin.org/get',
      exposeWindFree: true,
      exposeDisplay: true,
      exposeAutoClean: true,
      exposeSwing: true,
      exposeFan: true,
      debug: false,
    }, createLogger());

    await expect(auth.getAccessToken()).resolves.toBe('access-token');
    expect(fetchMock).toHaveBeenCalledWith('https://api.smartthings.com/v1/oauth/token', expect.objectContaining({ method: 'POST' }));
    const body = fetchMock.mock.calls[0]?.[1]?.body;
    expect(body).toBeInstanceOf(URLSearchParams);
    expect(body instanceof URLSearchParams ? body.toString() : '').toContain('client_id=client-id');
  });

  it('serializes concurrent refresh requests because refresh tokens are single-use', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      access_token: 'access-token',
      refresh_token: 'next-refresh-token',
      expires_in: 86_400,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    const auth = new SmartThingsAuth({
      platform: 'SmartThingsWindFreeAC',
      name: 'AC',
      baseUrl: 'https://api.smartthings.com/v1',
      authMethod: 'oauth2',
      clientId: 'client-id',
      clientSecret: 'client-secret',
      refreshToken: 'refresh-token',
      redirectUri: 'https://httpbin.org/get',
      exposeWindFree: true,
      exposeDisplay: true,
      exposeAutoClean: true,
      exposeSwing: true,
      exposeFan: true,
      debug: false,
    }, createLogger());

    await expect(Promise.all([auth.getAccessToken(), auth.getAccessToken()])).resolves.toEqual([
      'access-token',
      'access-token',
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

function createLogger(): LoggerLike {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}
