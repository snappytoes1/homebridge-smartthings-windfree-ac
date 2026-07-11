import { enabledOptionalCapabilities } from './capabilities.js';
import { MAX_COOLING_SETPOINT, MIN_COOLING_SETPOINT, displayLightCommand, fanModeToRotationSpeed, getStatusValue, isOnLike, normalizeCoolingSetpoint, rotationSpeedToFanModeOrWindFree, smartThingsModeToTargetState, smartThingsStatusToCurrentState, supportedFanModesFromStatus, targetStateToCommands, windFreeCommand, } from './mappings.js';
import { errorMessage } from './secrets.js';
export class SmartThingsWindFreeAccessory {
    platform;
    accessory;
    client;
    capabilities;
    device;
    lastStatus;
    thermostatService;
    windFreeFanControlEnabled = false;
    constructor(platform, accessory, client, capabilities) {
        this.platform = platform;
        this.accessory = accessory;
        this.client = client;
        this.capabilities = capabilities;
        this.device = accessory.context.device;
        this.accessory.getService(this.platform.Service.AccessoryInformation)
            ?.setCharacteristic(this.platform.Characteristic.Manufacturer, this.device.ocf?.manufacturerName ?? this.device.manufacturerName ?? 'Samsung')
            .setCharacteristic(this.platform.Characteristic.Model, this.device.ocf?.modelNumber ?? 'WindFree AC')
            .setCharacteristic(this.platform.Characteristic.SerialNumber, this.device.deviceId);
        this.thermostatService = this.accessory.getService(this.platform.Service.Thermostat)
            ?? this.accessory.addService(this.platform.Service.Thermostat);
        this.configureThermostat();
        this.configureOptionalServices();
    }
    configureThermostat() {
        this.thermostatService.setCharacteristic(this.platform.Characteristic.Name, this.device.label ?? this.device.name ?? 'Air Conditioner');
        this.thermostatService.getCharacteristic(this.platform.Characteristic.TemperatureDisplayUnits)
            .onGet(() => this.platform.Characteristic.TemperatureDisplayUnits.CELSIUS);
        this.thermostatService.getCharacteristic(this.platform.Characteristic.CurrentHeatingCoolingState)
            .onGet(this.handleCurrentHeatingCoolingStateGet.bind(this));
        this.thermostatService.getCharacteristic(this.platform.Characteristic.TargetHeatingCoolingState)
            .setProps({
            validValues: [
                this.platform.Characteristic.TargetHeatingCoolingState.OFF,
                this.platform.Characteristic.TargetHeatingCoolingState.HEAT,
                this.platform.Characteristic.TargetHeatingCoolingState.COOL,
                this.platform.Characteristic.TargetHeatingCoolingState.AUTO,
            ],
        })
            .onGet(this.handleTargetHeatingCoolingStateGet.bind(this))
            .onSet(this.handleTargetHeatingCoolingStateSet.bind(this));
        this.thermostatService.getCharacteristic(this.platform.Characteristic.CurrentTemperature)
            .onGet(this.handleCurrentTemperatureGet.bind(this));
        this.thermostatService.getCharacteristic(this.platform.Characteristic.TargetTemperature)
            .setProps({ minValue: MIN_COOLING_SETPOINT, maxValue: MAX_COOLING_SETPOINT, minStep: 1 })
            .onGet(this.handleTargetTemperatureGet.bind(this))
            .onSet(this.handleTargetTemperatureSet.bind(this));
    }
    configureOptionalServices() {
        const enabled = enabledOptionalCapabilities(this.platform.config, this.capabilities);
        this.windFreeFanControlEnabled = enabled.windFree && enabled.fan;
        this.removeSwitchService('WindFree', `windfree-${this.device.deviceId}`, 'WindFree is controlled through Fan speed 0%.');
        this.syncSwitchService('Display', `display-${this.device.deviceId}`, enabled.display, this.handleDisplayGet.bind(this), this.handleDisplaySet.bind(this));
        this.syncSwitchService('Auto Clean', `autoclean-${this.device.deviceId}`, enabled.autoClean, this.handleAutoCleanGet.bind(this), this.handleAutoCleanSet.bind(this));
        this.syncSwitchService('Swing', `swing-${this.device.deviceId}`, enabled.swing, this.handleSwingGet.bind(this), this.handleSwingSet.bind(this));
        this.syncFanService(enabled.fan);
    }
    syncSwitchService(name, subtype, enabled, onGet, onSet) {
        const existing = this.accessory.getServiceById(this.platform.Service.Switch, subtype);
        if (!enabled) {
            if (existing) {
                this.platform.log.info(`Removing optional service ${name} because it is disabled or unsupported.`);
                this.accessory.removeService(existing);
            }
            return;
        }
        const service = existing ?? this.accessory.addService(this.platform.Service.Switch, name, subtype);
        service.setCharacteristic(this.platform.Characteristic.Name, name);
        service.getCharacteristic(this.platform.Characteristic.On)
            .onGet(onGet)
            .onSet(onSet);
    }
    removeSwitchService(name, subtype, reason) {
        const existing = this.accessory.getServiceById(this.platform.Service.Switch, subtype);
        if (!existing) {
            return;
        }
        this.platform.log.info(`Removing optional service ${name}: ${reason}`);
        this.accessory.removeService(existing);
    }
    syncFanService(enabled) {
        const subtype = `fan-${this.device.deviceId}`;
        const existing = this.accessory.getServiceById(this.platform.Service.Fanv2, subtype);
        if (!enabled) {
            if (existing) {
                this.platform.log.info('Removing optional service Fan because it is disabled or unsupported.');
                this.accessory.removeService(existing);
            }
            return;
        }
        const service = existing ?? this.accessory.addService(this.platform.Service.Fanv2, 'Fan', subtype);
        service.setCharacteristic(this.platform.Characteristic.Name, 'Fan');
        service.getCharacteristic(this.platform.Characteristic.Active)
            .onGet(this.handleFanActiveGet.bind(this))
            .onSet(this.handleFanActiveSet.bind(this));
        service.getCharacteristic(this.platform.Characteristic.RotationSpeed)
            .setProps({ minValue: 0, maxValue: 100, minStep: 1 })
            .onGet(this.handleFanRotationSpeedGet.bind(this))
            .onSet(this.handleFanRotationSpeedSet.bind(this));
    }
    async handleCurrentHeatingCoolingStateGet() {
        const status = await this.getDeviceStatus();
        return smartThingsStatusToCurrentState(status);
    }
    async handleTargetHeatingCoolingStateGet() {
        const status = await this.getDeviceStatus();
        return smartThingsModeToTargetState(getStatusValue(status, 'airConditionerMode', 'airConditionerMode'), getStatusValue(status, 'switch', 'switch'));
    }
    async handleTargetHeatingCoolingStateSet(value) {
        await this.executeSafely('set target mode', () => this.client.executeCommands(this.device.deviceId, targetStateToCommands(Number(value))));
    }
    async handleCurrentTemperatureGet() {
        const status = await this.getDeviceStatus();
        return numberOrDefault(getStatusValue(status, 'temperatureMeasurement', 'temperature'), 20);
    }
    async handleTargetTemperatureGet() {
        const status = await this.getDeviceStatus();
        return normalizeCoolingSetpoint(getStatusValue(status, 'thermostatCoolingSetpoint', 'coolingSetpoint'));
    }
    async handleTargetTemperatureSet(value) {
        await this.executeSafely('set target temperature', () => this.client.executeCommand(this.device.deviceId, {
            capability: 'thermostatCoolingSetpoint',
            command: 'setCoolingSetpoint',
            arguments: [Number(value)],
        }));
    }
    async handleDisplayGet() {
        const status = await this.getDeviceStatus();
        return isOnLike(getStatusValue(status, 'samsungce.airConditionerLighting', 'lighting'));
    }
    async handleDisplaySet(value) {
        await this.executeSafely('set display light', () => this.client.executeCommand(this.device.deviceId, displayLightCommand(Boolean(value))));
    }
    async handleAutoCleanGet() {
        const status = await this.getDeviceStatus();
        return isOnLike(getStatusValue(status, 'custom.autoCleaningMode', 'autoCleaningMode'));
    }
    async handleAutoCleanSet(value) {
        await this.executeSafely('set auto clean', () => this.client.executeCommand(this.device.deviceId, {
            capability: 'custom.autoCleaningMode',
            command: 'setAutoCleaningMode',
            arguments: [value ? 'on' : 'off'],
        }));
    }
    async handleSwingGet() {
        const status = await this.getDeviceStatus();
        const value = getStatusValue(status, 'fanOscillationMode', 'fanOscillationMode');
        return value !== undefined && value !== 'fixed' && value !== 'off';
    }
    async handleSwingSet(value) {
        await this.executeSafely('set swing mode', () => this.client.executeCommand(this.device.deviceId, {
            capability: 'fanOscillationMode',
            command: 'setFanOscillationMode',
            arguments: [value ? 'all' : 'fixed'],
        }));
    }
    async handleFanActiveGet() {
        const status = await this.getDeviceStatus();
        return getStatusValue(status, 'switch', 'switch') === 'on' ? 1 /* HomeKitActive.ACTIVE */ : 0 /* HomeKitActive.INACTIVE */;
    }
    async handleFanActiveSet(value) {
        await this.executeSafely('set fan active state', () => this.client.executeCommand(this.device.deviceId, {
            capability: 'switch',
            command: Number(value) === 1 ? 'on' : 'off',
        }));
    }
    async handleFanRotationSpeedGet() {
        const status = await this.getDeviceStatus();
        if (this.windFreeFanControlEnabled && getStatusValue(status, 'custom.airConditionerOptionalMode', 'acOptionalMode') === 'windFree') {
            return 0;
        }
        return fanModeToRotationSpeed(getStatusValue(status, 'airConditionerFanMode', 'fanMode'));
    }
    async handleFanRotationSpeedSet(value) {
        const status = await this.getDeviceStatus();
        const switchState = getStatusValue(status, 'switch', 'switch');
        const acMode = getStatusValue(status, 'airConditionerMode', 'airConditionerMode');
        if (switchState === 'off') {
            this.platform.log.warn('Fan mode is not sent while the AC is off. Turn Fan Active on first.');
            return;
        }
        if (acMode === 'auto') {
            this.platform.log.warn('Fan mode is not supported while the AC is in auto mode.');
            return;
        }
        const fanModeOrWindFree = rotationSpeedToFanModeOrWindFree(Number(value), supportedFanModesFromStatus(status));
        if (!fanModeOrWindFree) {
            this.platform.log.warn(`Fan mode is not supported by ${this.device.label ?? this.device.deviceId}.`);
            return;
        }
        if (fanModeOrWindFree === 'windFree') {
            if (!this.windFreeFanControlEnabled) {
                this.platform.log.warn(`WindFree fan speed is not supported by ${this.device.label ?? this.device.deviceId}.`);
                return;
            }
            await this.executeSafely('set WindFree mode', () => this.client.executeCommand(this.device.deviceId, windFreeCommand(true)));
            return;
        }
        await this.executeSafely('set fan mode', async () => {
            if (this.windFreeFanControlEnabled && getStatusValue(status, 'custom.airConditionerOptionalMode', 'acOptionalMode') === 'windFree') {
                await this.client.executeCommand(this.device.deviceId, windFreeCommand(false));
            }
            await this.client.executeCommand(this.device.deviceId, {
                capability: 'airConditionerFanMode',
                command: 'setFanMode',
                arguments: [fanModeOrWindFree],
            });
        });
    }
    async getDeviceStatus() {
        try {
            this.lastStatus = await this.client.getDeviceStatus(this.device.deviceId);
            return this.lastStatus;
        }
        catch (error) {
            this.platform.log.error(`Failed to get SmartThings status for ${this.device.label ?? this.device.deviceId}: ${errorMessage(error)}`);
            return this.lastStatus ?? {};
        }
    }
    async executeSafely(label, action) {
        try {
            await action();
        }
        catch (error) {
            this.platform.log.error(`Failed to ${label} for ${this.device.label ?? this.device.deviceId}: ${errorMessage(error)}`);
        }
    }
}
function numberOrDefault(value, fallback) {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}
//# sourceMappingURL=platformAccessory.js.map