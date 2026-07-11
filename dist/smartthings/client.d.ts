import type { LoggerLike, SmartThingsCommand, SmartThingsCommandResponse, SmartThingsDevice, SmartThingsDeviceStatus } from '../types.js';
import type { SmartThingsAuth } from './auth.js';
export declare class SmartThingsApiError extends Error {
    readonly status?: number | undefined;
    readonly retryAfterMs?: number | undefined;
    constructor(message: string, status?: number | undefined, retryAfterMs?: number | undefined);
}
export declare class SmartThingsClient {
    private readonly baseUrl;
    private readonly auth;
    private readonly log;
    private readonly timeoutMs;
    private readonly commandQueues;
    private readonly statusCache;
    private readonly statusRequests;
    constructor(baseUrl: string, auth: SmartThingsAuth, log: LoggerLike, timeoutMs?: number);
    listDevices(): Promise<SmartThingsDevice[]>;
    getDeviceStatus(deviceId: string): Promise<SmartThingsDeviceStatus>;
    executeCommand(deviceId: string, command: SmartThingsCommand): Promise<SmartThingsCommandResponse>;
    executeCommands(deviceId: string, commands: SmartThingsCommand[]): Promise<SmartThingsCommandResponse>;
    private request;
    private enqueueDeviceCommand;
}
