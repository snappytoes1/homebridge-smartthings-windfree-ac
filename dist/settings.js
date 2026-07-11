export const PLUGIN_NAME = 'homebridge-smartthings-windfree-ac';
export const PLATFORM_NAME = 'SmartThingsWindFreeAC';
export const DEFAULT_BASE_URL = 'https://api.smartthings.com/v1';
export const SMARTTHINGS_AUTH_BASE_URL = 'https://api.smartthings.com/v1/oauth';
export const DEFAULT_REDIRECT_URI = 'https://httpbin.org/get';
export const REQUIRED_CAPABILITIES = [
    'switch',
    'airConditionerMode',
    'thermostatCoolingSetpoint',
];
export const OPTIONAL_CAPABILITIES = {
    windFree: 'custom.airConditionerOptionalMode',
    display: 'samsungce.airConditionerLighting',
    autoClean: 'custom.autoCleaningMode',
    swing: 'fanOscillationMode',
    fan: 'airConditionerFanMode',
};
//# sourceMappingURL=settings.js.map