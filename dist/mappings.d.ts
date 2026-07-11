import type { SmartThingsCommand, SmartThingsDeviceStatus } from './types.js';
export declare const enum HomeKitTargetHeatingCoolingState {
    OFF = 0,
    HEAT = 1,
    COOL = 2,
    AUTO = 3
}
export declare const enum HomeKitCurrentHeatingCoolingState {
    OFF = 0,
    HEAT = 1,
    COOL = 2
}
export declare const enum HomeKitActive {
    INACTIVE = 0,
    ACTIVE = 1
}
export declare const enum SmartThingsSwitch {
    On = "on",
    Off = "off"
}
export type SmartThingsAcMode = 'auto' | 'cool' | 'dry' | 'heat' | 'wind';
export type SmartThingsFanMode = 'auto' | 'low' | 'medium' | 'mid' | 'high' | 'turbo';
export type SmartThingsFanModeOrWindFree = SmartThingsFanMode | 'windFree';
export declare const MIN_COOLING_SETPOINT = 16;
export declare const MAX_COOLING_SETPOINT = 30;
export declare function targetStateToCommands(value: number): SmartThingsCommand[];
export declare function targetStateToSmartThingsMode(value: HomeKitTargetHeatingCoolingState): SmartThingsAcMode | undefined;
export declare function smartThingsModeToTargetState(mode: unknown, switchState: unknown): HomeKitTargetHeatingCoolingState;
export declare function smartThingsStatusToCurrentState(status: SmartThingsDeviceStatus): HomeKitCurrentHeatingCoolingState;
export declare function fanModeToRotationSpeed(mode: unknown): number;
export declare function rotationSpeedToFanMode(speed: number, supportedModes?: readonly SmartThingsFanMode[]): SmartThingsFanMode | undefined;
export declare function rotationSpeedToFanModeOrWindFree(speed: number, supportedModes?: readonly SmartThingsFanMode[]): SmartThingsFanModeOrWindFree | undefined;
export declare function supportedFanModesFromStatus(status: SmartThingsDeviceStatus): SmartThingsFanMode[] | undefined;
export declare function normalizeCoolingSetpoint(value: unknown, fallback?: number): number;
export declare function isOnLike(value: unknown): boolean;
export declare function getStatusValue(status: SmartThingsDeviceStatus | undefined, capability: string, attribute: string): unknown;
export declare function displayLightCommand(on: boolean): SmartThingsCommand;
export declare function windFreeCommand(on: boolean): SmartThingsCommand;
