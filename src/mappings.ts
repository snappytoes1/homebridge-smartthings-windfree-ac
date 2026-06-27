import type { SmartThingsCommand, SmartThingsDeviceStatus } from './types.js';

export const enum HomeKitTargetHeatingCoolingState {
  OFF = 0,
  HEAT = 1,
  COOL = 2,
  AUTO = 3,
}

export const enum HomeKitCurrentHeatingCoolingState {
  OFF = 0,
  HEAT = 1,
  COOL = 2,
}

export const enum HomeKitActive {
  INACTIVE = 0,
  ACTIVE = 1,
}

export const enum SmartThingsSwitch {
  On = 'on',
  Off = 'off',
}

export type SmartThingsAcMode = 'auto' | 'cool' | 'dry' | 'heat' | 'wind';
export type SmartThingsFanMode = 'auto' | 'low' | 'medium' | 'high' | 'turbo';

export function targetStateToCommands(value: number): SmartThingsCommand[] {
  const mode = isHomeKitTargetState(value) ? targetStateToSmartThingsMode(value) : undefined;

  if (!mode) {
    return [{ capability: 'switch', command: SmartThingsSwitch.Off }];
  }

  return [
    { capability: 'switch', command: SmartThingsSwitch.On },
    { capability: 'airConditionerMode', command: 'setAirConditionerMode', arguments: [mode] },
  ];
}

export function targetStateToSmartThingsMode(value: HomeKitTargetHeatingCoolingState): SmartThingsAcMode | undefined {
  switch (value) {
    case HomeKitTargetHeatingCoolingState.AUTO:
      return 'auto';
    case HomeKitTargetHeatingCoolingState.COOL:
      return 'cool';
    case HomeKitTargetHeatingCoolingState.HEAT:
      return 'heat';
    default:
      return undefined;
  }
}

function isHomeKitTargetState(value: number): value is HomeKitTargetHeatingCoolingState {
  return [
    HomeKitTargetHeatingCoolingState.OFF,
    HomeKitTargetHeatingCoolingState.HEAT,
    HomeKitTargetHeatingCoolingState.COOL,
    HomeKitTargetHeatingCoolingState.AUTO,
  ].includes(value);
}

export function smartThingsModeToTargetState(mode: unknown, switchState: unknown): HomeKitTargetHeatingCoolingState {
  if (switchState === SmartThingsSwitch.Off) {
    return HomeKitTargetHeatingCoolingState.OFF;
  }

  switch (mode) {
    case 'auto':
      return HomeKitTargetHeatingCoolingState.AUTO;
    case 'heat':
      return HomeKitTargetHeatingCoolingState.HEAT;
    case 'cool':
    case 'dry':
    case 'wind':
    default:
      return HomeKitTargetHeatingCoolingState.COOL;
  }
}

export function smartThingsStatusToCurrentState(status: SmartThingsDeviceStatus): HomeKitCurrentHeatingCoolingState {
  const switchState = getStatusValue(status, 'switch', 'switch');
  if (switchState === SmartThingsSwitch.Off) {
    return HomeKitCurrentHeatingCoolingState.OFF;
  }

  const mode = getStatusValue(status, 'airConditionerMode', 'airConditionerMode');
  if (mode === 'heat') {
    return HomeKitCurrentHeatingCoolingState.HEAT;
  }

  return HomeKitCurrentHeatingCoolingState.COOL;
}

export function fanModeToRotationSpeed(mode: unknown): number {
  switch (mode) {
    case 'low':
      return 33;
    case 'medium':
      return 66;
    case 'high':
    case 'turbo':
      return 100;
    case 'auto':
    default:
      return 0;
  }
}

export function rotationSpeedToFanMode(speed: number): SmartThingsFanMode {
  if (speed <= 0) {
    return 'auto';
  }

  if (speed <= 40) {
    return 'low';
  }

  if (speed <= 75) {
    return 'medium';
  }

  return 'high';
}

export function isOnLike(value: unknown): boolean {
  return value === true || value === 'on' || value === 'On' || value === 'Light_On' || value === 'windFree';
}

export function getStatusValue(status: SmartThingsDeviceStatus | undefined, capability: string, attribute: string): unknown {
  if (!status?.components) {
    return undefined;
  }

  for (const component of Object.values(status.components)) {
    const capabilityStatus = component?.[capability];
    const statusValue = capabilityStatus?.[attribute]?.value;
    if (statusValue !== undefined) {
      return statusValue;
    }
  }

  return undefined;
}

export function displayLightCommand(on: boolean): SmartThingsCommand {
  return {
    capability: 'execute',
    command: 'execute',
    arguments: [
      'mode/vs/0',
      {
        'x.com.samsung.da.options': [on ? 'Light_On' : 'Light_Off'],
      },
    ],
  };
}
