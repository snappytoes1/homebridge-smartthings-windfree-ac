export const MIN_COOLING_SETPOINT = 16;
export const MAX_COOLING_SETPOINT = 30;
export function targetStateToCommands(value) {
    const mode = isHomeKitTargetState(value) ? targetStateToSmartThingsMode(value) : undefined;
    if (!mode) {
        return [{ capability: 'switch', command: "off" /* SmartThingsSwitch.Off */ }];
    }
    return [
        { capability: 'switch', command: "on" /* SmartThingsSwitch.On */ },
        { capability: 'airConditionerMode', command: 'setAirConditionerMode', arguments: [mode] },
    ];
}
export function targetStateToSmartThingsMode(value) {
    switch (value) {
        case 3 /* HomeKitTargetHeatingCoolingState.AUTO */:
            return 'auto';
        case 2 /* HomeKitTargetHeatingCoolingState.COOL */:
            return 'cool';
        case 1 /* HomeKitTargetHeatingCoolingState.HEAT */:
            return 'heat';
        default:
            return undefined;
    }
}
function isHomeKitTargetState(value) {
    return [
        0 /* HomeKitTargetHeatingCoolingState.OFF */,
        1 /* HomeKitTargetHeatingCoolingState.HEAT */,
        2 /* HomeKitTargetHeatingCoolingState.COOL */,
        3 /* HomeKitTargetHeatingCoolingState.AUTO */,
    ].includes(value);
}
export function smartThingsModeToTargetState(mode, switchState) {
    if (switchState === "off" /* SmartThingsSwitch.Off */) {
        return 0 /* HomeKitTargetHeatingCoolingState.OFF */;
    }
    switch (mode) {
        case 'auto':
            return 3 /* HomeKitTargetHeatingCoolingState.AUTO */;
        case 'heat':
            return 1 /* HomeKitTargetHeatingCoolingState.HEAT */;
        case 'cool':
        case 'dry':
        case 'wind':
        default:
            return 2 /* HomeKitTargetHeatingCoolingState.COOL */;
    }
}
export function smartThingsStatusToCurrentState(status) {
    const switchState = getStatusValue(status, 'switch', 'switch');
    if (switchState === "off" /* SmartThingsSwitch.Off */) {
        return 0 /* HomeKitCurrentHeatingCoolingState.OFF */;
    }
    const mode = getStatusValue(status, 'airConditionerMode', 'airConditionerMode');
    if (mode === 'heat') {
        return 1 /* HomeKitCurrentHeatingCoolingState.HEAT */;
    }
    return 2 /* HomeKitCurrentHeatingCoolingState.COOL */;
}
export function fanModeToRotationSpeed(mode) {
    switch (mode) {
        case 'low':
            return 33;
        case 'medium':
        case 'mid':
            return 66;
        case 'high':
        case 'turbo':
            return 100;
        case 'auto':
        default:
            return 1;
    }
}
export function rotationSpeedToFanMode(speed, supportedModes) {
    const preferredModes = fanModePreferences(speed);
    if (supportedModes === undefined) {
        return preferredModes[0];
    }
    for (const mode of preferredModes) {
        if (supportedModes.includes(mode)) {
            return mode;
        }
    }
    return undefined;
}
export function rotationSpeedToFanModeOrWindFree(speed, supportedModes) {
    if (speed <= 0) {
        return 'windFree';
    }
    return rotationSpeedToFanMode(speed, supportedModes);
}
export function supportedFanModesFromStatus(status) {
    const value = getStatusValue(status, 'airConditionerFanMode', 'supportedAcFanModes')
        ?? getStatusValue(status, 'airConditionerFanMode', 'supportedFanModes');
    if (value === undefined) {
        return undefined;
    }
    if (!Array.isArray(value)) {
        return [];
    }
    return value.filter(isSmartThingsFanMode);
}
function fanModePreferences(speed) {
    if (speed <= 33) {
        return ['low', 'medium', 'mid', 'auto', 'high', 'turbo'];
    }
    if (speed <= 66) {
        return ['medium', 'mid', 'high', 'low', 'auto', 'turbo'];
    }
    return ['high', 'turbo', 'medium', 'mid', 'low', 'auto'];
}
function isSmartThingsFanMode(value) {
    return value === 'auto'
        || value === 'low'
        || value === 'medium'
        || value === 'mid'
        || value === 'high'
        || value === 'turbo';
}
export function normalizeCoolingSetpoint(value, fallback = 24) {
    const setpoint = typeof value === 'number' && Number.isFinite(value) ? value : fallback;
    return Math.min(MAX_COOLING_SETPOINT, Math.max(MIN_COOLING_SETPOINT, setpoint));
}
export function isOnLike(value) {
    return value === true || value === 'on' || value === 'On' || value === 'Light_On' || value === 'windFree';
}
export function getStatusValue(status, capability, attribute) {
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
export function displayLightCommand(on) {
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
export function windFreeCommand(on) {
    return {
        capability: 'custom.airConditionerOptionalMode',
        command: 'setAcOptionalMode',
        arguments: [on ? 'windFree' : 'off'],
    };
}
//# sourceMappingURL=mappings.js.map