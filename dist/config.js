import { DEFAULT_BASE_URL, DEFAULT_REDIRECT_URI, PLATFORM_NAME } from './settings.js';
const LEGACY_KEYS = ['BaseURL', 'AccessToken', 'OptionalWindFreeSwitch', 'OptionalDisplaySwitch'];
export function normalizeConfig(rawConfig) {
    const input = rawConfig;
    const errors = [];
    const legacyKeys = LEGACY_KEYS.filter(key => input[key] !== undefined);
    if (legacyKeys.length > 0) {
        errors.push(`Legacy config keys are not supported: ${legacyKeys.join(', ')}.`);
    }
    const authMethod = readAuthMethod(input.authMethod, errors);
    const baseUrl = normalizeBaseUrl(readString(input.baseUrl) ?? DEFAULT_BASE_URL);
    const config = {
        platform: PLATFORM_NAME,
        name: readString(input.name) ?? 'Samsung WindFree AC',
        baseUrl,
        authMethod,
        accessToken: readString(input.accessToken),
        clientId: readString(input.clientId),
        clientSecret: readString(input.clientSecret),
        redirectUri: readString(input.redirectUri) ?? DEFAULT_REDIRECT_URI,
        refreshToken: readString(input.refreshToken),
        deviceId: readString(input.deviceId),
        deviceLabel: readString(input.deviceLabel),
        exposeWindFree: readBoolean(input.exposeWindFree, true),
        exposeDisplay: readBoolean(input.exposeDisplay, true),
        exposeAutoClean: readBoolean(input.exposeAutoClean, true),
        exposeSwing: readBoolean(input.exposeSwing, true),
        exposeFan: readBoolean(input.exposeFan, true),
        debug: readBoolean(input.debug, false),
    };
    if (authMethod === 'pat' && !config.accessToken) {
        errors.push('accessToken is required when authMethod is "pat".');
    }
    if (authMethod === 'oauth2') {
        if (!config.clientId) {
            errors.push('clientId is required when authMethod is "oauth2".');
        }
        if (!config.clientSecret) {
            errors.push('clientSecret is required when authMethod is "oauth2".');
        }
        if (!config.refreshToken) {
            errors.push('refreshToken is required when authMethod is "oauth2". Use the Homebridge UI helper to create one.');
        }
    }
    return { config, errors };
}
export function normalizeBaseUrl(baseUrl) {
    return baseUrl.trim().replace(/\/+$/, '');
}
function readAuthMethod(value, errors) {
    if (value === undefined || value === null || value === '') {
        return 'oauth2';
    }
    if (value === 'oauth2' || value === 'pat') {
        return value;
    }
    errors.push('authMethod must be either "oauth2" or "pat".');
    return 'oauth2';
}
function readString(value) {
    if (typeof value !== 'string') {
        return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}
function readBoolean(value, defaultValue) {
    return typeof value === 'boolean' ? value : defaultValue;
}
//# sourceMappingURL=config.js.map