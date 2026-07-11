import { evaluateDevice } from '../capabilities.js';
import type { LoggerLike, SmartThingsDevice, SmartThingsWindFreePlatformConfig } from '../types.js';
export interface UiDeviceSummary {
    deviceId: string;
    label: string;
    name?: string;
    type?: string;
    ocfDeviceType?: string;
    acHint: boolean;
    supported: boolean;
    capabilities: string[];
    missingCapabilities: string[];
}
export interface UiDiscoveryResponse {
    ok: boolean;
    devices: UiDeviceSummary[];
    message?: string;
}
export declare function discoverDevicesForUi(rawConfig: Partial<SmartThingsWindFreePlatformConfig>, log: LoggerLike): Promise<UiDiscoveryResponse>;
export declare function summarizeDevices(devices: SmartThingsDevice[], config: Parameters<typeof evaluateDevice>[1]): UiDeviceSummary[];
