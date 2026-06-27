import { describe, expect, it } from 'vitest';

import {
  HomeKitCurrentHeatingCoolingState,
  HomeKitTargetHeatingCoolingState,
  displayLightCommand,
  fanModeToRotationSpeed,
  getStatusValue,
  rotationSpeedToFanMode,
  smartThingsModeToTargetState,
  smartThingsStatusToCurrentState,
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
    expect(rotationSpeedToFanMode(0)).toBe('auto');
    expect(rotationSpeedToFanMode(35)).toBe('low');
    expect(rotationSpeedToFanMode(70)).toBe('medium');
    expect(rotationSpeedToFanMode(100)).toBe('high');
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
