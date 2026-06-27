import { HomebridgePluginUiServer } from '@homebridge/plugin-ui-utils';

import { createAuthorizeUrl, exchangeAuthorizationCode } from './oauth.js';
import type { OAuthExchangeRequest, OAuthStartRequest } from './oauth.js';
import { discoverDevicesForUi } from './service.js';
import type { LoggerLike, SmartThingsWindFreePlatformConfig } from '../types.js';

class SmartThingsWindFreeUiServer extends HomebridgePluginUiServer {
  private readonly pendingStates = new Set<string>();

  public constructor() {
    super();

    this.onRequest('/oauth/start', (payload: unknown) => {
      const request: OAuthStartRequest = payloadRecord(payload);
      const result = createAuthorizeUrl(request);
      this.pendingStates.add(result.state);
      return result;
    });

    this.onRequest('/oauth/exchange', (payload: unknown) => {
      const request: OAuthExchangeRequest = payloadRecord(payload);
      return exchangeAuthorizationCode(request, this.pendingStates);
    });

    this.onRequest('/discoverDevices', (payload: unknown) => {
      const request: Partial<SmartThingsWindFreePlatformConfig> = payloadRecord(payload);
      return discoverDevicesForUi(request, uiLogger);
    });

    this.ready();
  }
}

const uiLogger: LoggerLike = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

function payloadRecord(payload: unknown): Record<string, unknown> {
  return payload && typeof payload === 'object' ? payload as Record<string, unknown> : {};
}

(() => new SmartThingsWindFreeUiServer())();
