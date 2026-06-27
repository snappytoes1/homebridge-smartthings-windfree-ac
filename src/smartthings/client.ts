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
}

export class SmartThingsApiError extends Error {
  public constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'SmartThingsApiError';
  }
}

export class SmartThingsClient {
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
    return this.request<SmartThingsCommandResponse>(`/devices/${encodeURIComponent(deviceId)}/commands`, {
      method: 'POST',
      body: {
        commands: commands.map(command => ({
          component: command.component ?? 'main',
          capability: command.capability,
          command: command.command,
          arguments: command.arguments,
        })),
      },
      retry: false,
    });
  }

  private async request<T>(path: string, options: RequestOptions = {}, alreadyRetried = false): Promise<T> {
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

      if (response.status === 401 && !alreadyRetried) {
        await this.auth.getAccessToken(true);
        return await this.request<T>(path, options, true);
      }

      const data = await response.json().catch(() => undefined) as unknown;
      if (!response.ok) {
        throw new SmartThingsApiError(`SmartThings ${method} ${path} failed: ${String(response.status)} ${response.statusText}`, response.status);
      }

      return data as T;
    } catch (error) {
      if (options.retry && !alreadyRetried && !(error instanceof SmartThingsApiError && error.status === 401)) {
        this.log.debug(`Retrying SmartThings ${method} ${path} after error: ${errorMessage(error)}`);
        return await this.request<T>(path, options, true);
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}
