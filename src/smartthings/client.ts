import { errorMessage } from '../secrets.js';
import type {
  LoggerLike,
  SmartThingsCommand,
  SmartThingsCommandResponse,
  SmartThingsDevice,
  SmartThingsDeviceListResponse,
  SmartThingsDeviceStatus,
} from '../types.js';
import type { SmartThingsAuth } from './auth.js';

interface RequestOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  retry?: boolean;
  maxAttempts?: number;
  retryDelayMs?: number;
  retryStatusCodes?: readonly number[];
}

export class SmartThingsApiError extends Error {
  public constructor(
    message: string,
    public readonly status?: number,
    public readonly retryAfterMs?: number,
  ) {
    super(message);
    this.name = 'SmartThingsApiError';
  }
}

const DEFAULT_MAX_ATTEMPTS = 2;
const COMMAND_MAX_ATTEMPTS = 4;
const COMMAND_RETRY_DELAY_MS = 2_500;
const COMMAND_QUEUE_INTERVAL_MS = 1_200;
const MIN_RETRY_AFTER_MS = 500;
const MAX_RETRY_AFTER_MS = 15_000;
const RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504] as const;

export class SmartThingsClient {
  private readonly commandQueues = new Map<string, Promise<void>>();

  public constructor(
    private readonly baseUrl: string,
    private readonly auth: SmartThingsAuth,
    private readonly log: LoggerLike,
    private readonly timeoutMs = 10_000,
  ) {}

  public async listDevices(): Promise<SmartThingsDevice[]> {
    const response = await this.request<SmartThingsDeviceListResponse>('/devices', { retry: true });
    return response.items ?? [];
  }

  public async getDeviceStatus(deviceId: string): Promise<SmartThingsDeviceStatus> {
    return this.request<SmartThingsDeviceStatus>(`/devices/${encodeURIComponent(deviceId)}/status`, { retry: true });
  }

  public async executeCommand(deviceId: string, command: SmartThingsCommand): Promise<SmartThingsCommandResponse> {
    return this.executeCommands(deviceId, [command]);
  }

  public async executeCommands(deviceId: string, commands: SmartThingsCommand[]): Promise<SmartThingsCommandResponse> {
    return this.enqueueDeviceCommand(deviceId, () => this.request<SmartThingsCommandResponse>(`/devices/${encodeURIComponent(deviceId)}/commands`, {
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

  private async request<T>(path: string, options: RequestOptions = {}, attempt = 1, accessTokenRefreshed = false): Promise<T> {
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
        return await this.request<T>(path, options, attempt, true);
      }

      const data = await response.json().catch(() => undefined) as unknown;
      if (!response.ok) {
        throw new SmartThingsApiError(
          `SmartThings ${method} ${path} failed: ${String(response.status)} ${response.statusText}`,
          response.status,
          parseRetryAfterMs(response.headers.get('retry-after')),
        );
      }

      return data as T;
    } catch (error) {
      if (shouldRetry(error, options, attempt)) {
        const delayMs = retryDelayMs(error, options.retryDelayMs ?? 1_000, attempt);
        this.log.debug(`Retrying SmartThings ${method} ${path} in ${String(delayMs)}ms after error: ${errorMessage(error)}`);
        await delay(delayMs);
        return await this.request<T>(path, options, attempt + 1, accessTokenRefreshed);
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private enqueueDeviceCommand<T>(deviceId: string, task: () => Promise<T>): Promise<T> {
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

function shouldRetry(error: unknown, options: RequestOptions, attempt: number): boolean {
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

function retryDelayMs(error: unknown, baseDelayMs: number, attempt: number): number {
  if (error instanceof SmartThingsApiError && error.retryAfterMs !== undefined) {
    return clamp(error.retryAfterMs, MIN_RETRY_AFTER_MS, MAX_RETRY_AFTER_MS);
  }

  return clamp(baseDelayMs * 2 ** (attempt - 1), MIN_RETRY_AFTER_MS, MAX_RETRY_AFTER_MS);
}

function parseRetryAfterMs(value: string | null): number | undefined {
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

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}
