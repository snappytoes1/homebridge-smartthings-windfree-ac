import { describe, expect, it } from 'vitest';

import {
  HomeKitCurrentHeatingCoolingState,
  HomeKitTargetHeatingCoolingState,
  displayLightCommand,
  fanModeToRotationSpeed,
  getStatusValue,
  normalizeCoolingSetpoint,
  rotationSpeedToFanMode,
  rotationSpeedToFanModeOrWindFree,
  smartThingsModeToTargetState,
  smartThingsStatusToCurrentState,
  supportedFanModesFromStatus,
  targetStateToCommands,
} from '../src/mappings.js';
import { thermostatStatus } from './fixtures.js';

describe('mode mappings', () => {
  it('maps HomeKit target states to SmartThings commands', () => {
    expect(targetStateToCommands(HomeKitTargetHeatingCoolingState.COOL)).toEqual([
      { capability: 'switch', command: 'on' },
      { capability: 'airConditionerMode', command: 'setAirConditionerMode', arguments: ['cool'] },
    ]);

    expect(targetStateToCommands(HomeKitTargetHeatingCoolingState.OFF)).toEqual([
      { capability: 'switch', command: 'off' },
    ]);
  });

  it('maps SmartThings mode to HomeKit target state', () => {
    expect(smartThingsModeToTargetState('auto', 'on')).toBe(HomeKitTargetHeatingCoolingState.AUTO);
    expect(smartThingsModeToTargetState('heat', 'on')).toBe(HomeKitTargetHeatingCoolingState.HEAT);
    expect(smartThingsModeToTargetState('cool', 'off')).toBe(HomeKitTargetHeatingCoolingState.OFF);
  });

  it('maps status to current state', () => {
    expect(smartThingsStatusToCurrentState(thermostatStatus)).toBe(HomeKitCurrentHeatingCoolingState.COOL);
  });

  it('reads status values across components', () => {
    expect(getStatusValue(thermostatStatus, 'temperatureMeasurement', 'temperature')).toBe(26);
  });

  it('maps fan modes and rotation speed', () => {
    expect(fanModeToRotationSpeed('medium')).toBe(66);
    expect(fanModeToRotationSpeed('mid')).toBe(66);
    expect(fanModeToRotationSpeed('auto')).toBe(1);
    expect(rotationSpeedToFanMode(0)).toBe('low');
    expect(rotationSpeedToFanMode(35)).toBe('medium');
    expect(rotationSpeedToFanMode(70)).toBe('high');
    expect(rotationSpeedToFanMode(100)).toBe('high');
  });

  it('maps fan rotation speed 0 to WindFree instead of power off', () => {
    expect(rotationSpeedToFanModeOrWindFree(0)).toBe('windFree');
    expect(rotationSpeedToFanModeOrWindFree(33)).toBe('low');
    expect(rotationSpeedToFanModeOrWindFree(34)).toBe('medium');
    expect(rotationSpeedToFanModeOrWindFree(67)).toBe('high');
  });

  it('uses supported SmartThings fan modes when choosing rotation speed commands', () => {
    expect(rotationSpeedToFanMode(50, ['auto', 'low', 'mid', 'high'])).toBe('mid');
    expect(rotationSpeedToFanMode(100, ['auto', 'low', 'mid', 'turbo'])).toBe('turbo');
    expect(rotationSpeedToFanMode(35, [])).toBeUndefined();
  });

  it('reads supported fan modes from SmartThings status', () => {
    expect(supportedFanModesFromStatus({
      components: {
        main: {
          airConditionerFanMode: {
            supportedAcFanModes: {
              value: ['auto', 'low', 'mid', 'high', 'unsupported'],
            },
          },
        },
      },
    })).toEqual(['auto', 'low', 'mid', 'high']);
  });

  it('keeps SmartThings cooling setpoints inside the HomeKit target temperature range', () => {
    expect(normalizeCoolingSetpoint(10)).toBe(16);
    expect(normalizeCoolingSetpoint(24)).toBe(24);
    expect(normalizeCoolingSetpoint(35)).toBe(30);
    expect(normalizeCoolingSetpoint(undefined)).toBe(24);
  });

  it('builds Samsung display command without exposing secrets', () => {
    expect(displayLightCommand(true)).toEqual({
      capability: 'execute',
      command: 'execute',
      arguments: [
        'mode/vs/0',
        {
          'x.com.samsung.da.options': ['Light_On'],
        },
      ],
    });
  });
});
