import crypto from 'node:crypto';
import { DEFAULT_REDIRECT_URI, SMARTTHINGS_AUTH_BASE_URL } from '../settings.js';
import { basicAuth } from '../smartthings/auth.js';
const DEFAULT_SCOPES = ['r:devices:*', 'w:devices:*', 'x:devices:*'];
const STATE_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;
export function createAuthorizeUrl(request, state = randomState()) {
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
export function parseAuthorizationCode(input) {
    const directCode = readOptionalString(input.code);
    if (directCode) {
        return { code: directCode };
    }
    const redirectUrl = readRequiredString(input.redirectUrl, 'redirectUrl or code');
    let parsed;
    try {
        parsed = new URL(redirectUrl);
    }
    catch {
        throw new Error('The authorization result must be a valid redirect URL or authorization code.');
    }
    const error = parsed.searchParams.get('error');
    if (error) {
        const description = parsed.searchParams.get('error_description');
        throw new Error(`SmartThings authorization was not completed: ${description ?? error}`);
    }
    const code = parsed.searchParams.get('code');
    if (!code) {
        throw new Error('Authorization redirect URL does not contain a code parameter.');
    }
    return {
        code,
        state: parsed.searchParams.get('state') ?? undefined,
    };
}
export function validateOAuthExchangeRequest(request, pendingStates) {
    const clientId = readRequiredString(request.clientId, 'clientId');
    const clientSecret = readRequiredString(request.clientSecret, 'clientSecret');
    const redirectUri = readOptionalString(request.redirectUri) ?? DEFAULT_REDIRECT_URI;
    const parsedCode = parseAuthorizationCode(request);
    const requestedState = readOptionalString(request.state);
    if (requestedState && parsedCode.state && requestedState !== parsedCode.state) {
        throw new Error('OAuth state is missing, expired, or invalid.');
    }
    const state = requestedState ?? parsedCode.state;
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
export async function exchangeAuthorizationCode(request, pendingStates) {
    const validated = validateOAuthExchangeRequest(request, pendingStates);
    pendingStates.delete(validated.state);
    const body = new URLSearchParams({
        grant_type: 'authorization_code',
        code: validated.code,
        client_id: validated.clientId,
        redirect_uri: validated.redirectUri,
    });
    const response = await fetch(`${SMARTTHINGS_AUTH_BASE_URL}/token`, {
        method: 'POST',
        signal: AbortSignal.timeout(10_000),
        headers: {
            Authorization: `Basic ${basicAuth(validated.clientId, validated.clientSecret)}`,
            Accept: 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
    });
    const token = await response.json().catch(() => ({}));
    if (!response.ok || !token.refresh_token) {
        throw new Error(`SmartThings OAuth exchange failed: ${token.error_description ?? token.error ?? response.statusText}`);
    }
    return {
        refreshToken: token.refresh_token,
        expiresIn: token.expires_in,
    };
}
export function randomState() {
    return crypto.randomBytes(24).toString('base64url');
}
function readScopes(value) {
    if (Array.isArray(value)) {
        const scopes = value.filter((scope) => typeof scope === 'string' && scope.trim().length > 0);
        return scopes.length > 0 ? scopes : DEFAULT_SCOPES;
    }
    return DEFAULT_SCOPES;
}
function readRequiredString(value, field) {
    const parsed = readOptionalString(value);
    if (!parsed) {
        throw new Error(`${field} is required.`);
    }
    return parsed;
}
function readOptionalString(value) {
    if (typeof value !== 'string') {
        return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}
//# sourceMappingURL=oauth.js.map