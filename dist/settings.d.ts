export declare const PLUGIN_NAME = "homebridge-smartthings-windfree-ac";
export declare const PLATFORM_NAME = "SmartThingsWindFreeAC";
export declare const DEFAULT_BASE_URL = "https://api.smartthings.com/v1";
export declare const SMARTTHINGS_AUTH_BASE_URL = "https://api.smartthings.com/v1/oauth";
export declare const DEFAULT_REDIRECT_URI = "https://httpbin.org/get";
export declare const REQUIRED_CAPABILITIES: readonly ["switch", "airConditionerMode", "thermostatCoolingSetpoint"];
export declare const OPTIONAL_CAPABILITIES: {
    readonly windFree: "custom.airConditionerOptionalMode";
    readonly display: "samsungce.airConditionerLighting";
    readonly autoClean: "custom.autoCleaningMode";
    readonly swing: "fanOscillationMode";
    readonly fan: "airConditionerFanMode";
};
