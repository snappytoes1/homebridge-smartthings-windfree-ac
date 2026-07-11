import type { API, Characteristic, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service } from 'homebridge';
import type { NormalizedConfig } from './types.js';
export declare class SmartThingsWindFreePlatform implements DynamicPlatformPlugin {
    readonly log: Logger;
    readonly api: API;
    readonly Service: typeof Service;
    readonly Characteristic: typeof Characteristic;
    readonly accessories: PlatformAccessory[];
    private readonly normalizedConfig;
    private readonly configErrors;
    constructor(log: Logger, rawConfig: PlatformConfig, api: API);
    configureAccessory(accessory: PlatformAccessory): void;
    discoverDevices(): Promise<void>;
    get config(): NormalizedConfig;
    private addOrRestoreAccessory;
}
