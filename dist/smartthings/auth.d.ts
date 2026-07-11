import type { LoggerLike, NormalizedConfig } from '../types.js';
export type TokenRefreshHandler = (refreshToken: string) => Promise<void> | void;
export declare class SmartThingsAuth {
    private readonly config;
    private readonly log;
    private accessToken?;
    private expiresAt;
    private refreshRequest?;
    private readonly onRefreshToken;
    constructor(config: NormalizedConfig, log: LoggerLike, onRefreshToken?: TokenRefreshHandler);
    getAccessToken(forceRefresh?: boolean): Promise<string>;
    private refreshAccessToken;
}
export declare function basicAuth(clientId: string, clientSecret: string): string;
