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
export declare function createAuthorizeUrl(request: OAuthStartRequest, state?: string): OAuthStartResponse;
export declare function parseAuthorizationCode(input: Pick<OAuthExchangeRequest, 'code' | 'redirectUrl'>): {
    code: string;
    state?: string;
};
export declare function validateOAuthExchangeRequest(request: OAuthExchangeRequest, pendingStates: ReadonlySet<string>): {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    code: string;
    state: string;
};
export declare function exchangeAuthorizationCode(request: OAuthExchangeRequest, pendingStates: Set<string>): Promise<OAuthExchangeResult>;
export declare function randomState(): string;
