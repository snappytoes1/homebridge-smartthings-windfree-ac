import { describe, expect, it } from 'vitest';

import {
  collectCapabilities,
  enabledOptionalCapabilities,
  evaluateDevice,
  isAirConditionerHint,
  missingRequiredCapabilities,
} from '../src/capabilities.js';
import { airConditionerDevice } from './fixtures.js';

describe('capability utilities', () => {
  it('collects capabilities from all components', () => {
    expect(collectCapabilities(airConditionerDevice)).toEqual([
      'airConditionerFanMode',
      'airConditionerMode',
      'custom.airConditionerOptionalMode',
      'custom.autoCleaningMode',
      'fanOscillationMode',
      'samsungce.airConditionerLighting',
      'switch',
      'temperatureMeasurement',
      'thermostatCoolingSetpoint',
    ]);
  });

  it('reports missing required capabilities', () => {
    expect(missingRequiredCapabilities(['switch'])).toEqual(['airConditionerMode', 'thermostatCoolingSetpoint']);
  });

  it('detects OCF air conditioner hints', () => {
    expect(isAirConditionerHint(airConditionerDevice)).toBe(true);
  });

  it('filters by device id before labels', () => {
    expect(evaluateDevice(airConditionerDevice, {
      deviceId: airConditionerDevice.deviceId,
      deviceLabel: 'Different',
    }).matchesFilter).toBe(true);

    expect(evaluateDevice(airConditionerDevice, {
      deviceId: 'different',
      deviceLabel: 'Air Conditioner',
    }).matchesFilter).toBe(false);
  });

  it('filters by device label when no device id is configured', () => {
    expect(evaluateDevice(airConditionerDevice, {
      deviceLabel: 'Air Conditioner',
    }).matchesFilter).toBe(true);
  });

  it('gates optional services by config and capabilities', () => {
    const capabilities = collectCapabilities(airConditionerDevice);
    expect(enabledOptionalCapabilities({
      exposeWindFree: true,
      exposeDisplay: false,
      exposeAutoClean: true,
      exposeSwing: true,
      exposeFan: true,
    }, capabilities)).toEqual({
      windFree: true,
      display: false,
      autoClean: true,
      swing: true,
      fan: true,
    });
  });
});
