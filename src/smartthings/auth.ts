import { Buffer } from 'node:buffer';

import { SMARTTHINGS_AUTH_BASE_URL } from '../settings.js';
import { errorMessage } from '../secrets.js';
import type { LoggerLike, NormalizedConfig } from '../types.js';

interface TokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  error?: string;
  error_description?: string;
}

export type TokenRefreshHandler = (refreshToken: string) => Promise<void> | void;

export class SmartThingsAuth {
  private accessToken?: string;
  private expiresAt = 0;
  private readonly onRefreshToken: TokenRefreshHandler | undefined;

  public constructor(
    private readonly config: NormalizedConfig,
    private readonly log: LoggerLike,
    onRefreshToken?: TokenRefreshHandler,
  ) {
    this.onRefreshToken = onRefreshToken;
  }

  public async getAccessToken(forceRefresh = false): Promise<string> {
    if (this.config.authMethod === 'pat') {
      if (!this.config.accessToken) {
        throw new Error('SmartThings PAT is not configured.');
      }
      return this.config.accessToken;
    }

    if (!forceRefresh && this.accessToken && Date.now() < this.expiresAt - 60_000) {
      return this.accessToken;
    }

    return this.refreshAccessToken();
  }

  private async refreshAccessToken(): Promise<string> {
    if (!this.config.clientId || !this.config.clientSecret || !this.config.refreshToken) {
      throw new Error('SmartThings OAuth2 credentials are incomplete.');
    }

    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: this.config.refreshToken,
    });

    const response = await fetch(`${SMARTTHINGS_AUTH_BASE_URL}/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicAuth(this.config.clientId, this.config.clientSecret)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    const token = await response.json().catch(() => ({})) as TokenResponse;
    if (!response.ok || !token.access_token) {
      throw new Error(`SmartThings token refresh failed: ${token.error_description ?? token.error ?? response.statusText}`);
    }

    this.accessToken = token.access_token;
    this.expiresAt = Date.now() + Math.max(60, token.expires_in ?? 300) * 1000;

    if (token.refresh_token && token.refresh_token !== this.config.refreshToken) {
      this.config.refreshToken = token.refresh_token;
      try {
        await this.onRefreshToken?.(token.refresh_token);
      } catch (error) {
        this.log.warn(`SmartThings refresh token rotated, but config persistence failed: ${errorMessage(error)}`);
      }
    }

    return this.accessToken;
  }
}

export function basicAuth(clientId: string, clientSecret: string): string {
  return Buffer.from(`${clientId}:${clientSecret}`, 'utf8').toString('base64');
}
