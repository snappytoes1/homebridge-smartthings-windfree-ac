import { describe, expect, it } from 'vitest';

import { createAuthorizeUrl, parseAuthorizationCode, validateOAuthExchangeRequest } from '../src/ui/oauth.js';

describe('OAuth UI helpers', () => {
  it('creates an authorization URL with state', () => {
    const result = createAuthorizeUrl({
      clientId: 'client-id',
      redirectUri: 'https://example.com/callback',
    }, 'state_1234567890123456');

    const url = new URL(result.authorizeUrl);
    expect(url.pathname).toBe('/oauth/authorize');
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
});
