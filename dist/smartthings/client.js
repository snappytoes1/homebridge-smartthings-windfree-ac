import { errorMessage } from '../secrets.js';
export class SmartThingsApiError extends Error {
    status;
    retryAfterMs;
    constructor(message, status, retryAfterMs) {
        super(message);
        this.status = status;
        this.retryAfterMs = retryAfterMs;
        this.name = 'SmartThingsApiError';
    }
}
const DEFAULT_MAX_ATTEMPTS = 2;
const STATUS_CACHE_TTL_MS = 3_000;
const STATUS_MAX_ATTEMPTS = 4;
const STATUS_RETRY_DELAY_MS = 1_500;
const COMMAND_MAX_ATTEMPTS = 4;
const COMMAND_RETRY_DELAY_MS = 2_500;
const COMMAND_QUEUE_INTERVAL_MS = 1_200;
const MIN_RETRY_AFTER_MS = 500;
const MAX_RETRY_AFTER_MS = 15_000;
const RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504];
export class SmartThingsClient {
    baseUrl;
    auth;
    log;
    timeoutMs;
    commandQueues = new Map();
    statusCache = new Map();
    statusRequests = new Map();
    constructor(baseUrl, auth, log, timeoutMs = 10_000) {
        this.baseUrl = baseUrl;
        this.auth = auth;
        this.log = log;
        this.timeoutMs = timeoutMs;
    }
    async listDevices() {
        const response = await this.request('/devices', { retry: true });
        return response.items ?? [];
    }
    async getDeviceStatus(deviceId) {
        const cached = this.statusCache.get(deviceId);
        if (cached && Date.now() < cached.expiresAt) {
            return cached.status;
        }
        const currentRequest = this.statusRequests.get(deviceId);
        if (currentRequest) {
            return currentRequest;
        }
        const request = this.request(`/devices/${encodeURIComponent(deviceId)}/status`, {
            retry: true,
            maxAttempts: STATUS_MAX_ATTEMPTS,
            retryDelayMs: STATUS_RETRY_DELAY_MS,
            retryStatusCodes: RETRYABLE_STATUS_CODES,
        }).then(status => {
            this.statusCache.set(deviceId, {
                expiresAt: Date.now() + STATUS_CACHE_TTL_MS,
                status,
            });
            return status;
        });
        this.statusRequests.set(deviceId, request);
        void request.finally(() => {
            if (this.statusRequests.get(deviceId) === request) {
                this.statusRequests.delete(deviceId);
            }
        });
        return request;
    }
    async executeCommand(deviceId, command) {
        return this.executeCommands(deviceId, [command]);
    }
    async executeCommands(deviceId, commands) {
        return this.enqueueDeviceCommand(deviceId, () => this.request(`/devices/${encodeURIComponent(deviceId)}/commands`, {
            method: 'POST',
            body: {
                commands: commands.map(command => ({
                    component: command.component ?? 'main',
                    capability: command.capability,
                    command: command.command,
                    arguments: command.arguments,
                })),
            },
            retry: true,
            maxAttempts: COMMAND_MAX_ATTEMPTS,
            retryDelayMs: COMMAND_RETRY_DELAY_MS,
            retryStatusCodes: RETRYABLE_STATUS_CODES,
        }));
    }
    async request(path, options = {}, attempt = 1, accessTokenRefreshed = false) {
        const method = options.method ?? 'GET';
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
        try {
            const token = await this.auth.getAccessToken();
            const response = await fetch(`${this.baseUrl}${path}`, {
                method,
                signal: controller.signal,
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/json',
                    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
                },
                body: options.body ? JSON.stringify(options.body) : undefined,
            });
            if (response.status === 401 && !accessTokenRefreshed) {
                await this.auth.getAccessToken(true);
                return await this.request(path, options, attempt, true);
            }
            const data = await response.json().catch(() => undefined);
            if (!response.ok) {
                throw new SmartThingsApiError(`SmartThings ${method} ${path} failed: ${String(response.status)} ${response.statusText}`, response.status, parseRetryAfterMs(response.headers.get('retry-after')));
            }
            return data;
        }
        catch (error) {
            if (shouldRetry(error, options, attempt)) {
                const delayMs = retryDelayMs(error, options.retryDelayMs ?? 1_000, attempt);
                this.log.debug(`Retrying SmartThings ${method} ${path} in ${String(delayMs)}ms after error: ${errorMessage(error)}`);
                await delay(delayMs);
                return await this.request(path, options, attempt + 1, accessTokenRefreshed);
            }
            throw error;
        }
        finally {
            clearTimeout(timeout);
        }
    }
    enqueueDeviceCommand(deviceId, task) {
        const previous = this.commandQueues.get(deviceId) ?? Promise.resolve();
        const run = previous.catch(() => undefined).then(async () => {
            await delay(COMMAND_QUEUE_INTERVAL_MS);
            return await task();
        });
        const tail = run.then(() => undefined, () => undefined);
        this.commandQueues.set(deviceId, tail);
        void tail.finally(() => {
            if (this.commandQueues.get(deviceId) === tail) {
                this.commandQueues.delete(deviceId);
            }
        });
        return run;
    }
}
function shouldRetry(error, options, attempt) {
    if (!options.retry || attempt >= (options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS)) {
        return false;
    }
    if (!(error instanceof SmartThingsApiError)) {
        return true;
    }
    if (error.status === 401) {
        return false;
    }
    const retryStatusCodes = options.retryStatusCodes ?? RETRYABLE_STATUS_CODES;
    return error.status !== undefined && retryStatusCodes.includes(error.status);
}
function retryDelayMs(error, baseDelayMs, attempt) {
    if (error instanceof SmartThingsApiError && error.retryAfterMs !== undefined) {
        return clamp(error.retryAfterMs, MIN_RETRY_AFTER_MS, MAX_RETRY_AFTER_MS);
    }
    return clamp(baseDelayMs * 2 ** (attempt - 1), MIN_RETRY_AFTER_MS, MAX_RETRY_AFTER_MS);
}
function parseRetryAfterMs(value) {
    if (!value) {
        return undefined;
    }
    const seconds = Number(value);
    if (Number.isFinite(seconds)) {
        return seconds * 1_000;
    }
    const retryAt = Date.parse(value);
    if (!Number.isFinite(retryAt)) {
        return undefined;
    }
    return Math.max(0, retryAt - Date.now());
}
function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}
function delay(ms) {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}
//# sourceMappingURL=client.js.map