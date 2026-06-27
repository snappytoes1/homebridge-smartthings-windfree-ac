import { OPTIONAL_CAPABILITIES, REQUIRED_CAPABILITIES } from './settings.js';
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

export function collectCapabilities(device: SmartThingsDevice): string[] {
  const ids = new Set<string>();

  for (const component of device.components ?? []) {
    for (const capability of component.capabilities ?? []) {
      if (capability.id) {
        ids.add(capability.id);
      }
    }
  }

  return [...ids].sort((a, b) => a.localeCompare(b));
}

export function missingRequiredCapabilities(capabilities: readonly string[]): string[] {
  return REQUIRED_CAPABILITIES.filter(capability => !capabilities.includes(capability));
}

export function hasRequiredCapabilities(capabilities: readonly string[]): boolean {
  return missingRequiredCapabilities(capabilities).length === 0;
}

export function isAirConditionerHint(device: SmartThingsDevice): boolean {
  const ocfType = device.ocf?.deviceType?.toLowerCase();
  if (ocfType === 'oic.d.airconditioner') {
    return true;
  }

  const values = [device.type, device.name, device.label, device.manufacturerName, device.ocf?.manufacturerName]
    .filter((value): value is string => Boolean(value))
    .map(value => value.toLowerCase());

  return values.some(value => value.includes('air-conditioner') || value.includes('air conditioner'));
}

export function deviceLabel(device: SmartThingsDevice): string {
  return device.label ?? device.name ?? device.deviceId;
}

export function matchesDeviceFilter(device: SmartThingsDevice, config: Pick<NormalizedConfig, 'deviceId' | 'deviceLabel'>): boolean {
  if (config.deviceId) {
    return device.deviceId === config.deviceId;
  }

  if (config.deviceLabel) {
    const expected = config.deviceLabel.toLowerCase();
    return [device.label, device.name]
      .filter((value): value is string => Boolean(value))
      .some(value => value.toLowerCase() === expected);
  }

  return true;
}

export function evaluateDevice(device: SmartThingsDevice, config: Pick<NormalizedConfig, 'deviceId' | 'deviceLabel'>): DeviceEvaluation {
  const capabilities = collectCapabilities(device);
  const missingCapabilities = missingRequiredCapabilities(capabilities);
  const matchesFilter = matchesDeviceFilter(device, config);
  const supported = matchesFilter && missingCapabilities.length === 0;
  let skipReason: string | undefined;

  if (!matchesFilter) {
    skipReason = config.deviceId ? 'deviceId filter' : 'deviceLabel filter';
  } else if (missingCapabilities.length > 0) {
    skipReason = `missing capabilities: ${missingCapabilities.join(', ')}`;
  }

  return {
    device,
    label: deviceLabel(device),
    capabilities,
    missingCapabilities,
    matchesFilter,
    acHint: isAirConditionerHint(device),
    supported,
    skipReason,
  };
}

export function enabledOptionalCapabilities(
  config: Pick<NormalizedConfig, 'exposeWindFree' | 'exposeDisplay' | 'exposeAutoClean' | 'exposeSwing' | 'exposeFan'>,
  capabilities: readonly string[],
): Record<keyof typeof OPTIONAL_CAPABILITIES, boolean> {
  return {
    windFree: config.exposeWindFree && capabilities.includes(OPTIONAL_CAPABILITIES.windFree),
    display: config.exposeDisplay && capabilities.includes(OPTIONAL_CAPABILITIES.display),
    autoClean: config.exposeAutoClean && capabilities.includes(OPTIONAL_CAPABILITIES.autoClean),
    swing: config.exposeSwing && capabilities.includes(OPTIONAL_CAPABILITIES.swing),
    fan: config.exposeFan && capabilities.includes(OPTIONAL_CAPABILITIES.fan),
  };
}
