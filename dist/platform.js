import { evaluateDevice } from './capabilities.js';
import { normalizeConfig } from './config.js';
import { SmartThingsWindFreeAccessory } from './platformAccessory.js';
import { errorMessage } from './secrets.js';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings.js';
import { SmartThingsAuth } from './smartthings/auth.js';
import { SmartThingsClient } from './smartthings/client.js';
import { persistRefreshToken } from './tokenStore.js';
export class SmartThingsWindFreePlatform {
    log;
    api;
    Service;
    Characteristic;
    accessories = [];
    normalizedConfig;
    configErrors;
    constructor(log, rawConfig, api) {
        this.log = log;
        this.api = api;
        this.Service = this.api.hap.Service;
        this.Characteristic = this.api.hap.Characteristic;
        const { config, errors } = normalizeConfig(rawConfig);
        this.normalizedConfig = config;
        this.configErrors = errors;
        this.log.debug('Finished initializing platform:', this.normalizedConfig.name);
        this.api.on('didFinishLaunching', () => {
            this.log.debug('Executed didFinishLaunching callback.');
            void this.discoverDevices();
        });
    }
    configureAccessory(accessory) {
        this.log.info('Loading accessory from cache:', accessory.displayName);
        this.accessories.push(accessory);
    }
    async discoverDevices() {
        if (this.configErrors.length > 0) {
            for (const error of this.configErrors) {
                this.log.error(error);
            }
            this.log.warn('SmartThings discovery skipped because plugin configuration is incomplete.');
            return;
        }
        this.log.info(`SmartThings auth method: ${this.normalizedConfig.authMethod}`);
        this.log.info('Fetching SmartThings devices...');
        const auth = new SmartThingsAuth(this.normalizedConfig, this.log, refreshToken => persistRefreshToken(refreshToken, this.log));
        const client = new SmartThingsClient(this.normalizedConfig.baseUrl, auth, this.log);
        let devices = [];
        try {
            devices = await client.listDevices();
        }
        catch (error) {
            this.log.error(`Failed to retrieve SmartThings devices: ${errorMessage(error)}`);
            return;
        }
        this.log.info(`Received ${String(devices.length)} SmartThings devices.`);
        const exposedDeviceIds = new Set();
        for (const device of devices) {
            const evaluation = evaluateDevice(device, this.normalizedConfig);
            const type = device.ocf?.deviceType ?? device.type ?? 'unknown';
            this.log.info(`Device found: ${evaluation.label} (${device.name ?? 'unnamed'}, ${device.deviceId}, ${type})`);
            this.log.info(`Capabilities found for ${evaluation.label}: ${evaluation.capabilities.join(', ') || 'none'}`);
            if (evaluation.acHint) {
                this.log.info(`Air conditioner hint detected for ${evaluation.label}.`);
            }
            if (!evaluation.matchesFilter) {
                this.log.info(`Skipping device ${evaluation.label}: ${evaluation.skipReason ?? 'filter mismatch'}.`);
                continue;
            }
            if (!evaluation.supported) {
                this.log.warn(`Skipping unsupported device: ${evaluation.label}. Missing capabilities: ${evaluation.missingCapabilities.join(', ')}`);
                this.log.warn(`Found capabilities: ${evaluation.capabilities.join(', ') || 'none'}`);
                continue;
            }
            exposedDeviceIds.add(device.deviceId);
            this.addOrRestoreAccessory(device, evaluation.capabilities, client);
        }
        if (exposedDeviceIds.size === 0) {
            this.log.warn('No supported Samsung air conditioner found.');
            this.log.warn(`Available devices: ${devices.map(device => `${device.label ?? device.name ?? device.deviceId} (${device.deviceId})`).join(', ') || 'none'}`);
        }
    }
    get config() {
        return this.normalizedConfig;
    }
    addOrRestoreAccessory(device, capabilities, client) {
        const uuid = this.api.hap.uuid.generate(device.deviceId);
        const label = device.label ?? device.name ?? device.deviceId;
        const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);
        if (existingAccessory) {
            this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);
            existingAccessory.context.device = device;
            existingAccessory.context.capabilities = capabilities;
            new SmartThingsWindFreeAccessory(this, existingAccessory, client, capabilities);
            return;
        }
        this.log.info(`Adding new accessory: ${label}`);
        const accessory = new this.api.platformAccessory(label, uuid);
        accessory.context.device = device;
        accessory.context.capabilities = capabilities;
        new SmartThingsWindFreeAccessory(this, accessory, client, capabilities);
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
    }
}
//# sourceMappingURL=platform.js.map