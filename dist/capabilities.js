import { OPTIONAL_CAPABILITIES, REQUIRED_CAPABILITIES } from './settings.js';
export function collectCapabilities(device) {
    const ids = new Set();
    for (const component of device.components ?? []) {
        for (const capability of component.capabilities ?? []) {
            if (capability.id) {
                ids.add(capability.id);
            }
        }
    }
    return [...ids].sort((a, b) => a.localeCompare(b));
}
export function missingRequiredCapabilities(capabilities) {
    return REQUIRED_CAPABILITIES.filter(capability => !capabilities.includes(capability));
}
export function hasRequiredCapabilities(capabilities) {
    return missingRequiredCapabilities(capabilities).length === 0;
}
export function isAirConditionerHint(device) {
    const ocfType = device.ocf?.deviceType?.toLowerCase();
    if (ocfType === 'oic.d.airconditioner') {
        return true;
    }
    const values = [device.type, device.name, device.label, device.manufacturerName, device.ocf?.manufacturerName]
        .filter((value) => Boolean(value))
        .map(value => value.toLowerCase());
    return values.some(value => value.includes('air-conditioner') || value.includes('air conditioner'));
}
export function deviceLabel(device) {
    return device.label ?? device.name ?? device.deviceId;
}
export function matchesDeviceFilter(device, config) {
    if (config.deviceId) {
        return device.deviceId === config.deviceId;
    }
    if (config.deviceLabel) {
        const expected = config.deviceLabel.toLowerCase();
        return [device.label, device.name]
            .filter((value) => Boolean(value))
            .some(value => value.toLowerCase() === expected);
    }
    return true;
}
export function evaluateDevice(device, config) {
    const capabilities = collectCapabilities(device);
    const missingCapabilities = missingRequiredCapabilities(capabilities);
    const matchesFilter = matchesDeviceFilter(device, config);
    const supported = matchesFilter && missingCapabilities.length === 0;
    let skipReason;
    if (!matchesFilter) {
        skipReason = config.deviceId ? 'deviceId filter' : 'deviceLabel filter';
    }
    else if (missingCapabilities.length > 0) {
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
export function enabledOptionalCapabilities(config, capabilities) {
    return {
        windFree: config.exposeWindFree && capabilities.includes(OPTIONAL_CAPABILITIES.windFree),
        display: config.exposeDisplay && capabilities.includes(OPTIONAL_CAPABILITIES.display),
        autoClean: config.exposeAutoClean && capabilities.includes(OPTIONAL_CAPABILITIES.autoClean),
        swing: config.exposeSwing && capabilities.includes(OPTIONAL_CAPABILITIES.swing),
        fan: config.exposeFan && capabilities.includes(OPTIONAL_CAPABILITIES.fan),
    };
}
//# sourceMappingURL=capabilities.js.map