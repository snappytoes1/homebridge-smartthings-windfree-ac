const SECRET_KEY_PATTERN = /token|secret|code|authorization/i;
export function maskSecret(value) {
    if (typeof value !== 'string' || value.length === 0) {
        return '';
    }
    if (value.length <= 8) {
        return '********';
    }
    return `${value.slice(0, 4)}...${value.slice(-4)}`;
}
export function maskConfig(value) {
    if (Array.isArray(value)) {
        return value.map((item) => maskConfig(item));
    }
    if (value && typeof value === 'object') {
        const masked = {};
        for (const [key, entry] of Object.entries(value)) {
            masked[key] = SECRET_KEY_PATTERN.test(key) ? maskSecret(entry) : maskConfig(entry);
        }
        return masked;
    }
    return value;
}
export function errorMessage(error) {
    if (error instanceof Error) {
        return redactSecrets(error.message);
    }
    return redactSecrets(String(error));
}
export function redactSecrets(message) {
    return message
        .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/g, 'Bearer [redacted]')
        .replace(/(access_token|refresh_token|client_secret|code)=([^&\s]+)/gi, '$1=[redacted]')
        .replace(/"((?:access|refresh)Token|clientSecret|code)"\s*:\s*"[^"]+"/gi, '"$1":"[redacted]"');
}
//# sourceMappingURL=secrets.js.map