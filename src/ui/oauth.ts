import crypto from 'node:crypto';

import { DEFAULT_REDIRECT_URI, SMARTTHINGS_AUTH_BASE_URL } from '../settings.js';
import { basicAuth } from '../smartthings/auth.js';

export interface OAuthStartRequest {
  clientId?: unknown;
  redirectUri?: unknown;
  scopes?: unknown;
}

export interface OAuthStartResponse {
  authorizeUrl: string;
  state: string;
}

export interface OAuthExchangeRequest {
  clientId?: unknown;
  clientSecret?: unknown;
  redirectUri?: unknown;
  code?: unknown;
  redirectUrl?: unknown;
  state?: unknown;
}

export interface OAuthExchangeResult {
  refreshToken: string;
  expiresIn?: number;
}

interface TokenResponse {
  refresh_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

const DEFAULT_SCOPES = ['r:devices:*', 'w:devices:*', 'x:devices:*'];
const STATE_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;

export function createAuthorizeUrl(request: OAuthStartRequest, state: string = randomState()): OAuthStartResponse {
  const clientId = readRequiredString(request.clientId, 'clientId');
  const redirectUri = readOptionalString(request.redirectUri) ?? DEFAULT_REDIRECT_URI;
  const scopes = readScopes(request.scopes);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scopes.join(' '),
    state,
  });

  return {
    authorizeUrl: `${SMARTTHINGS_AUTH_BASE_URL}/authorize?${params.toString()}`,
    state,
  };
}

export function parseAuthorizationCode(input: Pick<OAuthExchangeRequest, 'code' | 'redirectUrl'>): { code: string; state?: string } {
  const directCode = readOptionalString(input.code);
  if (directCode) {
    return { code: directCode };
  }

  const redirectUrl = readRequiredString(input.redirectUrl, 'redirectUrl or code');
  const parsed = new URL(redirectUrl);
  const code = parsed.searchParams.get('code');
  if (!code) {
    throw new Error('Authorization redirect URL does not contain a code parameter.');
  }

  return {
    code,
    state: parsed.searchParams.get('state') ?? undefined,
  };
}

export function validateOAuthExchangeRequest(request: OAuthExchangeRequest, pendingStates: ReadonlySet<string>): {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  code: string;
  state: string;
} {
  const clientId = readRequiredString(request.clientId, 'clientId');
  const clientSecret = readRequiredString(request.clientSecret, 'clientSecret');
  const redirectUri = readOptionalString(request.redirectUri) ?? DEFAULT_REDIRECT_URI;
  const parsedCode = parseAuthorizationCode(request);
  const state = readOptionalString(request.state) ?? parsedCode.state;

  if (!state || !STATE_PATTERN.test(state) || !pendingStates.has(state)) {
    throw new Error('OAuth state is missing, expired, or invalid.');
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
    code: parsedCode.code,
    state,
  };
}

export async function exchangeAuthorizationCode(
  request: OAuthExchangeRequest,
  pendingStates: Set<string>,
): Promise<OAuthExchangeResult> {
  const validated = validateOAuthExchangeRequest(request, pendingStates);
  pendingStates.delete(validated.state);

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: validated.code,
    redirect_uri: validated.redirectUri,
  });

  const response = await fetch(`${SMARTTHINGS_AUTH_BASE_URL}/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth(validated.clientId, validated.clientSecret)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  const token = await response.json().catch(() => ({})) as TokenResponse;
  if (!response.ok || !token.refresh_token) {
    throw new Error(`SmartThings OAuth exchange failed: ${token.error_description ?? token.error ?? response.statusText}`);
  }

  return {
    refreshToken: token.refresh_token,
    expiresIn: token.expires_in,
  };
}

export function randomState(): string {
  return crypto.randomBytes(24).toString('base64url');
}

function readScopes(value: unknown): string[] {
  if (Array.isArray(value)) {
    const scopes = value.filter((scope): scope is string => typeof scope === 'string' && scope.trim().length > 0);
    return scopes.length > 0 ? scopes : DEFAULT_SCOPES;
  }

  return DEFAULT_SCOPES;
}

function readRequiredString(value: unknown, field: string): string {
  const parsed = readOptionalString(value);
  if (!parsed) {
    throw new Error(`${field} is required.`);
  }
  return parsed;
}

function readOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
