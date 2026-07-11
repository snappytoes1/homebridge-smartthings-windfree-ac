import { Buffer } from 'node:buffer';
import { SMARTTHINGS_AUTH_BASE_URL } from '../settings.js';
import { errorMessage } from '../secrets.js';
export class SmartThingsAuth {
    config;
    log;
    accessToken;
    expiresAt = 0;
    refreshRequest;
    onRefreshToken;
    constructor(config, log, onRefreshToken) {
        this.config = config;
        this.log = log;
        this.onRefreshToken = onRefreshToken;
    }
    async getAccessToken(forceRefresh = false) {
        if (this.config.authMethod === 'pat') {
            if (!this.config.accessToken) {
                throw new Error('SmartThings PAT is not configured.');
            }
            return this.config.accessToken;
        }
        if (!forceRefresh && this.accessToken && Date.now() < this.expiresAt - 60_000) {
            return this.accessToken;
        }
        this.refreshRequest ??= this.refreshAccessToken();
        try {
            return await this.refreshRequest;
        }
        finally {
            this.refreshRequest = undefined;
        }
    }
    async refreshAccessToken() {
        if (!this.config.clientId || !this.config.clientSecret || !this.config.refreshToken) {
            throw new Error('SmartThings OAuth2 credentials are incomplete.');
        }
        const body = new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: this.config.refreshToken,
            client_id: this.config.clientId,
        });
        const response = await fetch(`${SMARTTHINGS_AUTH_BASE_URL}/token`, {
            method: 'POST',
            signal: AbortSignal.timeout(10_000),
            headers: {
                Authorization: `Basic ${basicAuth(this.config.clientId, this.config.clientSecret)}`,
                Accept: 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body,
        });
        const token = await response.json().catch(() => ({}));
        if (!response.ok || !token.access_token) {
            throw new Error(`SmartThings token refresh failed: ${token.error_description ?? token.error ?? response.statusText}`);
        }
        this.accessToken = token.access_token;
        this.expiresAt = Date.now() + Math.max(60, token.expires_in ?? 300) * 1000;
        if (token.refresh_token && token.refresh_token !== this.config.refreshToken) {
            this.config.refreshToken = token.refresh_token;
            try {
                await this.onRefreshToken?.(token.refresh_token);
            }
            catch (error) {
                this.log.warn(`SmartThings refresh token rotated, but config persistence failed: ${errorMessage(error)}`);
            }
        }
        return this.accessToken;
    }
}
export function basicAuth(clientId, clientSecret) {
    return Buffer.from(`${clientId}:${clientSecret}`, 'utf8').toString('base64');
}
//# sourceMappingURL=auth.js.map