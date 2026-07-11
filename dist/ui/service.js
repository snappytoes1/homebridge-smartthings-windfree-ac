import { collectCapabilities, evaluateDevice } from '../capabilities.js';
import { normalizeConfig } from '../config.js';
import { errorMessage } from '../secrets.js';
import { SmartThingsAuth } from '../smartthings/auth.js';
import { SmartThingsClient } from '../smartthings/client.js';
export async function discoverDevicesForUi(rawConfig, log) {
    const { config, errors } = normalizeConfig({ ...rawConfig, platform: 'SmartThingsWindFreeAC' });
    if (errors.length > 0) {
        return {
            ok: false,
            devices: [],
            message: errors.join(' '),
        };
    }
    try {
        const auth = new SmartThingsAuth(config, log);
        const client = new SmartThingsClient(config.baseUrl, auth, log);
        const devices = await client.listDevices();
        return {
            ok: true,
            devices: summarizeDevices(devices, config),
        };
    }
    catch (error) {
        return {
            ok: false,
            devices: [],
            message: errorMessage(error),
        };
    }
}
export function summarizeDevices(devices, config) {
    return devices.map(device => {
        const evaluation = evaluateDevice(device, config);
        return {
            deviceId: device.deviceId,
            label: evaluation.label,
            name: device.name,
            type: device.type,
            ocfDeviceType: device.ocf?.deviceType,
            acHint: evaluation.acHint,
            supported: evaluation.supported,
            capabilities: collectCapabilities(device),
            missingCapabilities: evaluation.missingCapabilities,
        };
    });
}
//# sourceMappingURL=service.js.map