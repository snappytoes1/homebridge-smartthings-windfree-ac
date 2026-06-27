import type { PlatformConfig } from 'homebridge';

export type AuthMethod = 'oauth2' | 'pat';

export interface SmartThingsWindFreePlatformConfig extends PlatformConfig {
  platform: 'SmartThingsWindFreeAC';
  name?: string;
  baseUrl?: string;
  authMethod?: AuthMethod;
  accessToken?: string;
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  refreshToken?: string;
  deviceId?: string;
  deviceLabel?: string;
  exposeWindFree?: boolean;
  exposeDisplay?: boolean;
  exposeAutoClean?: boolean;
  exposeSwing?: boolean;
  exposeFan?: boolean;
  debug?: boolean;
}

export interface NormalizedConfig {
  platform: 'SmartThingsWindFreeAC';
  name: string;
  baseUrl: string;
  authMethod: AuthMethod;
  accessToken?: string;
  clientId?: string;
  clientSecret?: string;
  redirectUri: string;
  refreshToken?: string;
  deviceId?: string;
  deviceLabel?: string;
  exposeWindFree: boolean;
  exposeDisplay: boolean;
  exposeAutoClean: boolean;
  exposeSwing: boolean;
  exposeFan: boolean;
  debug: boolean;
}

export interface SmartThingsCapabilityRef {
  id?: string;
}

export interface SmartThingsComponent {
  id?: string;
  capabilities?: SmartThingsCapabilityRef[];
}

export interface SmartThingsDevice {
  deviceId: string;
  label?: string;
  name?: string;
  type?: string;
  manufacturerName?: string;
  presentationId?: string;
  ocf?: {
    deviceType?: string;
    manufacturerName?: string;
    modelNumber?: string;
    vendorId?: string;
  };
  components?: SmartThingsComponent[];
}

export interface SmartThingsDeviceListResponse {
  items?: SmartThingsDevice[];
}

export interface SmartThingsStatusValue {
  value?: unknown;
  unit?: string;
  timestamp?: string;
}

export type SmartThingsCapabilityStatus = Record<string, SmartThingsStatusValue | undefined>;
export type SmartThingsComponentStatus = Record<string, SmartThingsCapabilityStatus | undefined>;

export interface SmartThingsDeviceStatus {
  components?: Record<string, SmartThingsComponentStatus | undefined>;
}

export interface SmartThingsCommand {
  component?: string;
  capability: string;
  command: string;
  arguments?: unknown[];
}

export interface SmartThingsCommandResponse {
  results?: { status?: string; id?: string }[];
}

export interface LoggerLike {
  debug(message: string, ...parameters: unknown[]): void;
  info(message: string, ...parameters: unknown[]): void;
  warn(message: string, ...parameters: unknown[]): void;
  error(message: string, ...parameters: unknown[]): void;
}
