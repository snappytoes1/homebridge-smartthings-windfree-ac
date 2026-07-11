import { OPTIONAL_CAPABILITIES } from './settings.js';
import type { NormalizedConfig, SmartThingsDevice } from './types.js';
export interface DeviceEvaluation {
    device: SmartThingsDevice;
    label: string;
    capabilities: string[];
    missingCapabilities: string[];
    matchesFilter: boolean;
    acHint: boolean;
    supported: boolean;
    skipReason?: string;
}
export declare function collectCapabilities(device: SmartThingsDevice): string[];
export declare function missingRequiredCapabilities(capabilities: readonly string[]): string[];
export declare function hasRequiredCapabilities(capabilities: readonly string[]): boolean;
export declare function isAirConditionerHint(device: SmartThingsDevice): boolean;
export declare function deviceLabel(device: SmartThingsDevice): string;
export declare function matchesDeviceFilter(device: SmartThingsDevice, config: Pick<NormalizedConfig, 'deviceId' | 'deviceLabel'>): boolean;
export declare function evaluateDevice(device: SmartThingsDevice, config: Pick<NormalizedConfig, 'deviceId' | 'deviceLabel'>): DeviceEvaluation;
export declare function enabledOptionalCapabilities(config: Pick<NormalizedConfig, 'exposeWindFree' | 'exposeDisplay' | 'exposeAutoClean' | 'exposeSwing' | 'exposeFan'>, capabilities: readonly string[]): Record<keyof typeof OPTIONAL_CAPABILITIES, boolean>;
