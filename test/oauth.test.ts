import { afterEach, describe, expect, it, vi } from 'vitest';

import { createAuthorizeUrl, exchangeAuthorizationCode, parseAuthorizationCode, validateOAuthExchangeRequest } from '../src/ui/oauth.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('OAuth UI helpers', () => {
  it('creates an authorization URL with state', () => {
    const result = createAuthorizeUrl({
      clientId: 'client-id',
      redirectUri: 'https://example.com/callback',
    }, 'state_1234567890123456');

    const url = new URL(result.authorizeUrl);
    expect(url.pathname).toBe('/v1/oauth/authorize');
    expect(url.searchParams.get('client_id')).toBe('client-id');
    expect(url.searchParams.get('state')).toBe('state_1234567890123456');
    expect(url.searchParams.get('scope')).toContain('r:devices:*');
  });

  it('parses an authorization code from a redirect URL', () => {
    expect(parseAuthorizationCode({
      redirectUrl: 'https://example.com/callback?code=abc&state=state_1234567890123456',
    })).toEqual({
      code: 'abc',
      state: 'state_1234567890123456',
    });
  });

  it('validates exchange state', () => {
    const pendingStates = new Set(['state_1234567890123456']);

    expect(validateOAuthExchangeRequest({
      clientId: 'client-id',
      clientSecret: 'client-secret',
      redirectUri: 'https://example.com/callback',
      code: 'code',
      state: 'state_1234567890123456',
    }, pendingStates)).toMatchObject({
      clientId: 'client-id',
      code: 'code',
      state: 'state_1234567890123456',
    });
  });

  it('rejects missing or mismatched state', () => {
    expect(() => validateOAuthExchangeRequest({
      clientId: 'client-id',
      clientSecret: 'client-secret',
      code: 'code',
      state: 'state_missing000000',
    }, new Set(['state_1234567890123456']))).toThrow('OAuth state is missing, expired, or invalid.');
  });

  it('rejects a redirect URL whose state differs from the pending state', () => {
    expect(() => validateOAuthExchangeRequest({
      clientId: 'client-id',
      clientSecret: 'client-secret',
      redirectUrl: 'https://example.com/callback?code=code&state=other_state_123456789',
      state: 'state_1234567890123456',
    }, new Set(['state_1234567890123456']))).toThrow('OAuth state is missing, expired, or invalid.');
  });

  it('explains denied authorization results', () => {
    expect(() => parseAuthorizationCode({
      redirectUrl: 'https://example.com/callback?error=access_denied&error_description=User+cancelled',
    })).toThrow('SmartThings authorization was not completed: User cancelled');
  });

  it('exchanges the code using the current SmartThings OAuth endpoint', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      access_token: 'access-token',
      refresh_token: 'refresh-token',
      expires_in: 86_400,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await exchangeAuthorizationCode({
      clientId: 'client-id',
      clientSecret: 'client-secret',
      redirectUri: 'https://example.com/callback',
      code: 'authorization-code',
      state: 'state_1234567890123456',
    }, new Set(['state_1234567890123456']));

    expect(result).toEqual({ refreshToken: 'refresh-token', expiresIn: 86_400 });
    expect(fetchMock).toHaveBeenCalledWith('https://api.smartthings.com/v1/oauth/token', expect.objectContaining({ method: 'POST' }));
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toEqual(expect.objectContaining({ Accept: 'application/json' }));

    const body = fetchMock.mock.calls[0]?.[1]?.body;
    expect(body).toBeInstanceOf(URLSearchParams);
    const bodyText = body instanceof URLSearchParams ? body.toString() : '';
    expect(bodyText).toContain('grant_type=authorization_code');
    expect(bodyText).toContain('client_id=client-id');
    expect(bodyText).toContain('redirect_uri=https%3A%2F%2Fexample.com%2Fcallback');
  });
});
