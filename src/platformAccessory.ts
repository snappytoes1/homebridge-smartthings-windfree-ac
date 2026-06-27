import type { CharacteristicValue, PlatformAccessory, Service } from 'homebridge';

import { enabledOptionalCapabilities } from './capabilities.js';
import {
  HomeKitActive,
  displayLightCommand,
  fanModeToRotationSpeed,
  getStatusValue,
  isOnLike,
  rotationSpeedToFanMode,
  smartThingsModeToTargetState,
  smartThingsStatusToCurrentState,
  targetStateToCommands,
} from './mappings.js';
import { errorMessage } from './secrets.js';
import type { SmartThingsClient } from './smartthings/client.js';
import type { SmartThingsDevice, SmartThingsDeviceStatus } from './types.js';
import type { SmartThingsWindFreePlatform } from './platform.js';

export class SmartThingsWindFreeAccessory {
  private readonly device: SmartThingsDevice;
  private lastStatus?: SmartThingsDeviceStatus;
  private readonly thermostatService: Service;

  public constructor(
    private readonly platform: SmartThingsWindFreePlatform,
    private readonly accessory: PlatformAccessory,
    private readonly client: SmartThingsClient,
    private readonly capabilities: string[],
  ) {
    this.device = accessory.context.device as SmartThingsDevice;

    this.accessory.getService(this.platform.Service.AccessoryInformation)
      ?.setCharacteristic(this.platform.Characteristic.Manufacturer, this.device.ocf?.manufacturerName ?? this.device.manufacturerName ?? 'Samsung')
      .setCharacteristic(this.platform.Characteristic.Model, this.device.ocf?.modelNumber ?? 'WindFree AC')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.device.deviceId);

    this.thermostatService = this.accessory.getService(this.platform.Service.Thermostat)
      ?? this.accessory.addService(this.platform.Service.Thermostat);

    this.configureThermostat();
    this.configureOptionalServices();
  }

  private configureThermostat(): void {
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
      .setProps({ minValue: 16, maxValue: 30, minStep: 1 })
      .onGet(this.handleTargetTemperatureGet.bind(this))
      .onSet(this.handleTargetTemperatureSet.bind(this));
  }

  private configureOptionalServices(): void {
    const enabled = enabledOptionalCapabilities(this.platform.config, this.capabilities);

    this.syncSwitchService('WindFree', `windfree-${this.device.deviceId}`, enabled.windFree, this.handleWindFreeGet.bind(this), this.handleWindFreeSet.bind(this));
    this.syncSwitchService('Display', `display-${this.device.deviceId}`, enabled.display, this.handleDisplayGet.bind(this), this.handleDisplaySet.bind(this));
    this.syncSwitchService('Auto Clean', `autoclean-${this.device.deviceId}`, enabled.autoClean, this.handleAutoCleanGet.bind(this), this.handleAutoCleanSet.bind(this));
    this.syncSwitchService('Swing', `swing-${this.device.deviceId}`, enabled.swing, this.handleSwingGet.bind(this), this.handleSwingSet.bind(this));
    this.syncFanService(enabled.fan);
  }

  private syncSwitchService(
    name: string,
    subtype: string,
    enabled: boolean,
    onGet: () => Promise<CharacteristicValue>,
    onSet: (value: CharacteristicValue) => Promise<void>,
  ): void {
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

  private syncFanService(enabled: boolean): void {
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

  private async handleCurrentHeatingCoolingStateGet(): Promise<CharacteristicValue> {
    const status = await this.getDeviceStatus();
    return smartThingsStatusToCurrentState(status);
  }

  private async handleTargetHeatingCoolingStateGet(): Promise<CharacteristicValue> {
    const status = await this.getDeviceStatus();
    return smartThingsModeToTargetState(
      getStatusValue(status, 'airConditionerMode', 'airConditionerMode'),
      getStatusValue(status, 'switch', 'switch'),
    );
  }

  private async handleTargetHeatingCoolingStateSet(value: CharacteristicValue): Promise<void> {
    await this.executeSafely('set target mode', () => this.client.executeCommands(this.device.deviceId, targetStateToCommands(Number(value))));
  }

  private async handleCurrentTemperatureGet(): Promise<CharacteristicValue> {
    const status = await this.getDeviceStatus();
    return numberOrDefault(getStatusValue(status, 'temperatureMeasurement', 'temperature'), 20);
  }

  private async handleTargetTemperatureGet(): Promise<CharacteristicValue> {
    const status = await this.getDeviceStatus();
    return numberOrDefault(getStatusValue(status, 'thermostatCoolingSetpoint', 'coolingSetpoint'), 24);
  }

  private async handleTargetTemperatureSet(value: CharacteristicValue): Promise<void> {
    await this.executeSafely('set target temperature', () => this.client.executeCommand(this.device.deviceId, {
      capability: 'thermostatCoolingSetpoint',
      command: 'setCoolingSetpoint',
      arguments: [Number(value)],
    }));
  }

  private async handleWindFreeGet(): Promise<CharacteristicValue> {
    const status = await this.getDeviceStatus();
    return getStatusValue(status, 'custom.airConditionerOptionalMode', 'acOptionalMode') === 'windFree';
  }

  private async handleWindFreeSet(value: CharacteristicValue): Promise<void> {
    const status = await this.getDeviceStatus();
    const mode = getStatusValue(status, 'airConditionerMode', 'airConditionerMode');
    if (mode === 'auto') {
      this.platform.log.warn('WindFree mode is not supported while the AC is in auto mode.');
      return;
    }

    await this.executeSafely('set WindFree mode', () => this.client.executeCommand(this.device.deviceId, {
      capability: 'custom.airConditionerOptionalMode',
      command: 'setAcOptionalMode',
      arguments: [value ? 'windFree' : 'off'],
    }));
  }

  private async handleDisplayGet(): Promise<CharacteristicValue> {
    const status = await this.getDeviceStatus();
    return isOnLike(getStatusValue(status, 'samsungce.airConditionerLighting', 'lighting'));
  }

  private async handleDisplaySet(value: CharacteristicValue): Promise<void> {
    await this.executeSafely('set display light', () => this.client.executeCommand(this.device.deviceId, displayLightCommand(Boolean(value))));
  }

  private async handleAutoCleanGet(): Promise<CharacteristicValue> {
    const status = await this.getDeviceStatus();
    return isOnLike(getStatusValue(status, 'custom.autoCleaningMode', 'autoCleaningMode'));
  }

  private async handleAutoCleanSet(value: CharacteristicValue): Promise<void> {
    await this.executeSafely('set auto clean', () => this.client.executeCommand(this.device.deviceId, {
      capability: 'custom.autoCleaningMode',
      command: 'setAutoCleaningMode',
      arguments: [value ? 'on' : 'off'],
    }));
  }

  private async handleSwingGet(): Promise<CharacteristicValue> {
    const status = await this.getDeviceStatus();
    const value = getStatusValue(status, 'fanOscillationMode', 'fanOscillationMode');
    return value !== undefined && value !== 'fixed' && value !== 'off';
  }

  private async handleSwingSet(value: CharacteristicValue): Promise<void> {
    await this.executeSafely('set swing mode', () => this.client.executeCommand(this.device.deviceId, {
      capability: 'fanOscillationMode',
      command: 'setFanOscillationMode',
      arguments: [value ? 'all' : 'fixed'],
    }));
  }

  private async handleFanActiveGet(): Promise<CharacteristicValue> {
    const status = await this.getDeviceStatus();
    return getStatusValue(status, 'switch', 'switch') === 'on' ? HomeKitActive.ACTIVE : HomeKitActive.INACTIVE;
  }

  private async handleFanActiveSet(value: CharacteristicValue): Promise<void> {
    await this.executeSafely('set fan active state', () => this.client.executeCommand(this.device.deviceId, {
      capability: 'switch',
      command: Number(value) === 1 ? 'on' : 'off',
    }));
  }

  private async handleFanRotationSpeedGet(): Promise<CharacteristicValue> {
    const status = await this.getDeviceStatus();
    return fanModeToRotationSpeed(getStatusValue(status, 'airConditionerFanMode', 'fanMode'));
  }

  private async handleFanRotationSpeedSet(value: CharacteristicValue): Promise<void> {
    await this.executeSafely('set fan mode', () => this.client.executeCommand(this.device.deviceId, {
      capability: 'airConditionerFanMode',
      command: 'setFanMode',
      arguments: [rotationSpeedToFanMode(Number(value))],
    }));
  }

  private async getDeviceStatus(): Promise<SmartThingsDeviceStatus> {
    try {
      this.lastStatus = await this.client.getDeviceStatus(this.device.deviceId);
      return this.lastStatus;
    } catch (error) {
      this.platform.log.error(`Failed to get SmartThings status for ${this.device.label ?? this.device.deviceId}: ${errorMessage(error)}`);
      return this.lastStatus ?? {};
    }
  }

  private async executeSafely(label: string, action: () => Promise<unknown>): Promise<void> {
    try {
      await action();
    } catch (error) {
      this.platform.log.error(`Failed to ${label} for ${this.device.label ?? this.device.deviceId}: ${errorMessage(error)}`);
    }
  }
}

function numberOrDefault(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}
