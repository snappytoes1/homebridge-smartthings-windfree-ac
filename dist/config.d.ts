import type { PlatformConfig } from 'homebridge';
import type { NormalizedConfig, SmartThingsWindFreePlatformConfig } from './types.js';
export interface ConfigResult {
    config: NormalizedConfig;
    errors: string[];
}
export declare function normalizeConfig(rawConfig: PlatformConfig | Partial<SmartThingsWindFreePlatformConfig>): ConfigResult;
export declare function normalizeBaseUrl(baseUrl: string): string;
